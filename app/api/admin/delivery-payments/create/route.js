import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { livreurEarningNetEur } from '../../../../../lib/livreur-delivery-earnings';
import { loadDeliveryTransferInvoice } from '../../../../../lib/delivery-invoice';
import emailService from '../../../../../lib/emailService';
import { createDeliveryInboxMessage } from '../../../../../lib/delivery-messaging';
import { sendPushToUserIds } from '../../../../../lib/sendDeliveryAppPush';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const verifyAdminToken = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Essayer avec les cookies
    const token = request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    if (!token) {
      return { error: 'Non autorisé', status: 401 };
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return { error: 'Token invalide', status: 401 };
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return { error: 'Accès refusé - Admin requis', status: 403 };
    }

    return { userId: user.id };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Token invalide', status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Accès refusé - Admin requis', status: 403 };
  }

  return { userId: user.id };
};

export async function POST(request) {
  try {
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      delivery_id,
      delivery_name,
      delivery_email,
      amount,
      transfer_date,
      reference_number,
      period_start,
      period_end,
      notes
    } = body;

    // Validation
    if (!delivery_id || !amount || !transfer_date) {
      return NextResponse.json(
        { error: 'delivery_id, amount et transfer_date sont requis' },
        { status: 400 }
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être supérieur à 0' },
        { status: 400 }
      );
    }

    // Vérifier que le livreur existe
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('users')
      .select('id, nom, prenom, email, role')
      .eq('id', delivery_id)
      .or('role.eq.delivery,role.eq.livreur')
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: 'Livreur non trouvé' },
        { status: 404 }
      );
    }

    const montantCible = parseFloat(amount);
    let totalMarque = 0;
    let ordersToMark = [];

    // Calculer quelles commandes seront payées (pour orders_count + order_ids sur la facture)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, frais_livraison, frais_livraison_course, delivery_commission_cvneat, created_at')
      .eq('livreur_id', delivery_id)
      .eq('statut', 'livree')
      .is('livreur_paid_at', null)
      .order('created_at', { ascending: true });

    if (!ordersError && orders && orders.length > 0) {
      for (const order of orders) {
        const livreurEarning = livreurEarningNetEur(order);
        if (totalMarque + livreurEarning <= montantCible) {
          ordersToMark.push(order.id);
          totalMarque += livreurEarning;
        } else {
          break;
        }
      }
    }

    // Créer l'enregistrement de paiement (avec détail des courses pour la facture)
    const { data: transfer, error: transferError } = await supabaseAdmin
      .from('delivery_transfers')
      .insert({
        delivery_id,
        delivery_name: delivery_name || `${driver.prenom || ''} ${driver.nom || ''}`.trim() || driver.email,
        delivery_email: delivery_email || driver.email,
        amount: parseFloat(amount),
        transfer_date,
        reference_number: reference_number || null,
        period_start: period_start || null,
        period_end: period_end || null,
        notes: notes || null,
        status: 'completed',
        created_by: auth.userId,
        orders_count: ordersToMark.length,
        order_ids: ordersToMark.length > 0 ? ordersToMark : [],
      })
      .select()
      .single();

    if (transferError) {
      console.error('Erreur création transfer:', transferError);
      const detail = transferError.message || transferError.code || '';
      return NextResponse.json(
        {
          error: detail
            ? `Erreur lors de la création du paiement: ${detail}`
            : 'Erreur lors de la création du paiement',
          details: transferError.message
        },
        { status: 500 }
      );
    }

    if (ordersToMark.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('commandes')
        .update({ livreur_paid_at: new Date().toISOString() })
        .in('id', ordersToMark);

      if (updateError) {
        console.error('Erreur mise à jour commandes:', updateError);
      } else {
        console.log(`✅ ${ordersToMark.length} commande(s) marquée(s) comme payée(s) pour un total de ${totalMarque.toFixed(2)}€`);
      }
    }

    // Facture + notif livreur (email / inbox / push) — best effort
    let invoiceNotified = false;
    try {
      const invoice = await loadDeliveryTransferInvoice(supabaseAdmin, transfer.id);
      if (!invoice.error && invoice.html) {
        const toEmail = delivery_email || driver.email;
        const amountLabel = `${parseFloat(amount).toFixed(2)} €`;
        const subject = `Votre paiement CVN'EAT de ${amountLabel}`;
        const bodyText = `Bonjour,\n\nUn paiement de ${amountLabel} a été enregistré sur votre compte livreur CVN'EAT.\nRéférence facture : ${invoice.reference}\n\nLa facture est jointe à cet email. Vous pouvez aussi la retrouver dans l'app (Profil → Mes factures).\n\nL'équipe CVN'EAT`;

        if (toEmail) {
          await emailService.sendEmail({
            to: toEmail,
            subject,
            text: bodyText,
            html: `<p>Bonjour,</p>
              <p>Un paiement de <strong>${amountLabel}</strong> a été enregistré sur votre compte livreur CVN'EAT.</p>
              <p>Référence facture : <strong>${invoice.reference}</strong></p>
              <p>La facture est jointe à cet email (fichier HTML). Vous pouvez aussi l'ouvrir dans l'app : Profil → Mes factures.</p>
              <p>L'équipe CVN'EAT</p>`,
            attachments: [
              {
                filename: `facture-${invoice.reference}.html`,
                content: invoice.html,
                contentType: 'text/html; charset=utf-8',
              },
            ],
          });
          invoiceNotified = true;
        }

        await createDeliveryInboxMessage({
          adminId: auth.userId,
          deliveryUserId: delivery_id,
          subject: `Paiement de ${amountLabel} effectué`,
          body: `Votre paiement de ${amountLabel} a été enregistré.\nRéférence : ${invoice.reference}\nOuvrez Profil → Mes factures pour télécharger le document.`,
          kind: 'system',
          eventType: 'payment_made',
          data: { transferId: transfer.id, amount: parseFloat(amount), reference: invoice.reference },
          push: false,
        }).catch((e) => console.warn('inbox paiement:', e?.message));

        await sendPushToUserIds(
          [delivery_id],
          'Paiement reçu 💰',
          `${amountLabel} virés — facture disponible`,
          {
            type: 'payment_made',
            url: '/delivery/profile',
            transferId: transfer.id,
          }
        ).catch((e) => console.warn('push paiement:', e?.message));
      }
    } catch (notifyErr) {
      console.warn('Notification facture livreur (non bloquant):', notifyErr?.message || notifyErr);
    }

    return NextResponse.json({
      success: true,
      transfer,
      orders_marked: ordersToMark.length || 0,
      amount_marked: totalMarque || 0,
      invoice_emailed: invoiceNotified,
      message: `Paiement enregistré. ${ordersToMark.length || 0} commande(s) marquée(s) comme payée(s). Le dashboard du livreur sera automatiquement mis à jour.`
    });

  } catch (error) {
    console.error('Erreur API création paiement livreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}

