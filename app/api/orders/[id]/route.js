import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || null;
    const url = new URL(request.url);
    const securityCodeParam = url.searchParams.get('code') || request.headers.get('x-order-code');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error('Configuration Supabase incomplète');
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    let order = null;
    let user = null;
    let isAdmin = false;

    if (token) {
      const supabaseUser = createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );

      const { data: { user: sessionUser }, error: userError } = await supabaseUser.auth.getUser(token);

      if (userError || !sessionUser) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
      }

      user = sessionUser;

      const { data: userRoleData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      isAdmin = userRoleData?.role === 'admin';

      const { data: orderAccess, error: orderAccessError } = await supabaseAdmin
        .from('commandes')
        .select('id, user_id, security_code')
        .eq('id', id)
        .maybeSingle();

      if (orderAccessError || !orderAccess) {
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      const securityMatches = securityCodeParam && orderAccess.security_code === securityCodeParam;

      if (!isAdmin) {
        if (orderAccess.user_id && orderAccess.user_id !== user.id && !securityMatches) {
          return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à voir cette commande' }, { status: 403 });
        }

        if (!orderAccess.user_id && !securityMatches) {
          return NextResponse.json({ error: 'Authentification requise pour cette commande' }, { status: 403 });
        }
      }

      const { data: orderFull, error: orderError } = await supabaseAdmin
        .from('commandes')
        .select(`
          *,
          details_commande (
            id,
            quantite,
            prix_unitaire,
            supplements,
            customizations,
            menus (
              nom,
              prix
            )
          ),
          restaurants (
            id,
            nom,
            adresse,
            ville,
            code_postal
          )
        `)
        .eq('id', id)
        .single();

      if (orderError || !orderFull) {
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      order = orderFull;
    } else if (securityCodeParam) {
      const { data: orderFull, error: orderError } = await supabaseAdmin
        .from('commandes')
        .select(`
          *,
          details_commande (
            id,
            quantite,
            prix_unitaire,
            supplements,
            customizations,
            menus (
              nom,
              prix
            )
          ),
          restaurants (
            id,
            nom,
            adresse,
            ville,
            code_postal
          )
        `)
        .eq('id', id)
        .eq('security_code', securityCodeParam)
        .single();

      if (orderError || !orderFull) {
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      order = orderFull;
    } else {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    const restaurant = order.restaurants;
    let customerName = [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ').trim();
    let customerPhone = order.customer_phone || '';
    let customerEmail = order.customer_email || '';

    try {
      if (order.user_id) {
        const { data: customerData } = await supabaseAdmin
          .from('users')
          .select('prenom, nom, telephone, email')
          .eq('id', order.user_id)
          .single();

        if (customerData) {
          const nameParts = [customerData.prenom, customerData.nom].filter(Boolean).join(' ').trim();
          customerName = nameParts || customerData.email || customerName || 'Client';
          customerPhone = customerData.telephone || customerPhone;
          customerEmail = customerData.email || customerEmail;
        } else {
          const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
          if (authUser?.email) {
            customerName = customerName || authUser.email;
            customerEmail = authUser.email;
          }
        }
      }
    } catch (customerError) {
      console.warn('⚠️ Impossible de récupérer les infos client:', customerError);
    }

    if (!customerName) {
      customerName = customerEmail || 'Client';
    }

    const items = (order.details_commande || []).map(detail => {
      let supplements = [];
      if (detail.supplements) {
        if (typeof detail.supplements === 'string') {
          try {
            supplements = JSON.parse(detail.supplements);
          } catch {
            supplements = [];
          }
        } else if (Array.isArray(detail.supplements)) {
          supplements = detail.supplements;
        }
      }

      let customizations = {};
      if (detail.customizations) {
        if (typeof detail.customizations === 'string') {
          try {
            customizations = JSON.parse(detail.customizations);
          } catch {
            customizations = {};
          }
        } else if (typeof detail.customizations === 'object') {
          customizations = detail.customizations;
        }
      }

      return {
        id: detail.id,
        name: detail.menus?.nom || 'Article',
        quantity: detail.quantite || 0,
        price: parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0,
        supplements,
        customizations
      };
    });

    const addressParts = (order.adresse_livraison || '').split(',').map(s => s.trim());
    const deliveryAddress = addressParts[0] || '';
    const deliveryCity = addressParts.length > 2 ? addressParts[1] : (addressParts[1] || '');
    const deliveryPostalCode =
      addressParts.length > 2
        ? (addressParts[2]?.split(' ')[0] || '')
        : (addressParts[1]?.split(' ')[0] || '');
    const deliveryPhone = order.telephone || order.phone || order.customer_phone || '';

    const subtotalAmount = parseFloat(order.total || 0) || 0;
    const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
    const totalWithDelivery = subtotalAmount + deliveryFee;

    const formattedOrder = {
      id: order.id,
      status: order.statut || order.status,
      statut: order.statut || order.status,
      createdAt: order.created_at,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString(),
      user_id: order.user_id,
      security_code: order.security_code,
      frais_livraison: deliveryFee,
      delivery_fee: deliveryFee,
      deliveryFee,
      adresse_livraison: order.adresse_livraison,
      preparation_time: order.preparation_time,
      livreur_id: order.livreur_id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      security_code: order.security_code,
      restaurant: {
        id: restaurant?.id,
        name: restaurant?.nom || 'Restaurant inconnu',
        address: restaurant?.adresse || '',
        city: restaurant?.ville || '',
        postal_code: restaurant?.code_postal || ''
      },
      deliveryAddress,
      deliveryCity,
      deliveryPostalCode,
      deliveryPhone: deliveryPhone || customerPhone,
      subtotal: subtotalAmount,
      subtotal_amount: subtotalAmount,
      total: totalWithDelivery,
      total_amount: totalWithDelivery,
      total_with_delivery: totalWithDelivery,
      items,
      delivery_instructions: order.instructions_livraison || order.delivery_instructions || null,
      refund_amount: order.refund_amount ? parseFloat(order.refund_amount) : null,
      refunded_at: order.refunded_at || null,
      stripe_refund_id: order.stripe_refund_id || null,
      payment_status: order.payment_status || 'pending',
      rejection_reason: order.rejection_reason || null,
      rejectionReason: order.rejection_reason || null,
      details_commande: (order.details_commande || []).map(detail => {
        let supplements = [];
        if (detail.supplements) {
          if (typeof detail.supplements === 'string') {
            try {
              supplements = JSON.parse(detail.supplements);
            } catch {
              supplements = [];
            }
          } else if (Array.isArray(detail.supplements)) {
            supplements = detail.supplements;
          }
        }

        let customizations = {};
        if (detail.customizations) {
          if (typeof detail.customizations === 'string') {
            try {
              customizations = JSON.parse(detail.customizations);
            } catch {
              customizations = {};
            }
          } else if (typeof detail.customizations === 'object') {
            customizations = detail.customizations;
          }
        }

        return {
          ...detail,
          supplements,
          customizations
        };
      })
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Erreur générale dans GET /api/orders/[id]:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Mettre à jour la commande
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('commandes')
      .update({
        statut: body.statut || body.status, // Accepter les deux pour compatibilité
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}