import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import emailService from '@/lib/emailService';
import { isAdminWriterRole } from '@/lib/admin-viewer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Vérifier l'authentification admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !isAdminWriterRole(userData.role)) {
      return NextResponse.json(
        { error: 'Accès non autorisé - Admin requis' },
        { status: 403 }
      );
    }

    const { subject, html, text } = await request.json();

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'Sujet et contenu HTML requis' },
        { status: 400 }
      );
    }

    // Récupérer tous les emails des utilisateurs
    // On récupère depuis auth.users ET la table users pour être sûr de tout avoir
    let allEmails = new Set();

    // 1. Récupérer depuis auth.users (avec pagination)
    let authUsersList = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: authUsersPage, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });

      if (authUsersError) {
        console.error('Erreur récupération utilisateurs auth page', page, ':', authUsersError);
        break;
      }

      if (authUsersPage?.users && authUsersPage.users.length > 0) {
        authUsersPage.users.forEach(user => {
          if (user.email && user.email.includes('@')) {
            allEmails.add(user.email.toLowerCase());
          }
        });
        hasMore = authUsersPage.users.length === perPage;
        page++;
      } else {
        hasMore = false;
      }
    }

    // 2. Récupérer aussi depuis la table users (au cas où certains ne seraient pas dans auth.users)
    const { data: usersFromTable, error: usersError } = await supabaseAdmin
      .from('users')
      .select('email')
      .not('email', 'is', null);

    if (!usersError && usersFromTable) {
      usersFromTable.forEach(user => {
        if (user.email && user.email.includes('@')) {
          allEmails.add(user.email.toLowerCase());
        }
      });
    }

    // Convertir le Set en array
    const validEmails = Array.from(allEmails);

    if (validEmails.length === 0) {
      console.error('❌ Aucun utilisateur avec email valide trouvé');
      console.log('Debug - auth.users count:', authUsersList.length);
      console.log('Debug - users table count:', usersFromTable?.length || 0);
      return NextResponse.json(
        { 
          error: 'Aucun utilisateur avec email valide trouvé',
          debug: {
            authUsersCount: authUsersList.length,
            usersTableCount: usersFromTable?.length || 0,
            totalEmails: validEmails.length
          }
        },
        { status: 400 }
      );
    }

    console.log(`📧 Envoi newsletter à ${validEmails.length} utilisateurs`);
    console.log('📧 Premiers emails:', validEmails.slice(0, 5));
    
    // Vérifier la configuration email
    console.log('📧 Configuration email:', {
      EMAIL_HOST: process.env.EMAIL_HOST || 'smtp-relay.brevo.com (défaut)',
      EMAIL_PORT: process.env.EMAIL_PORT || '587',
      EMAIL_USER: process.env.EMAIL_USER ? '✓ Configuré' : '✗ Manquant',
      EMAIL_PASS: process.env.EMAIL_PASS ? '✓ Configuré' : '✗ Manquant',
      EMAIL_FROM: process.env.EMAIL_FROM || 'contact@cvneat.fr'
    });

    // Envoyer les emails par batch pour éviter les limites de rate
    const BATCH_SIZE = 10; // Envoyer 10 emails à la fois
    const DELAY_BETWEEN_BATCHES = 2000; // 2 secondes entre chaque batch
    let sent = 0;
    let errors = [];

    // Fonction pour envoyer un batch
    const sendBatch = async (emails, batchIndex) => {
      const batch = emails.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
      
      const promises = batch.map(async (email) => {
        try {
          // Ajouter automatiquement le lien de désinscription et le footer
          const unsubscribeLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.fr'}/unsubscribe?email=${encodeURIComponent(email)}`;
          
          // Améliorer le HTML avec footer et désinscription
          const htmlWithFooter = `
            ${html}
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 10px 0;">
                Vous recevez cet email car vous êtes membre de CVN'EAT.
              </p>
              <p style="margin: 10px 0;">
                <a href="${unsubscribeLink}" style="color: #3b82f6; text-decoration: underline;">
                  Se désabonner
                </a>
              </p>
              <p style="margin: 10px 0; color: #9ca3af;">
                CVN'EAT - Plateforme de livraison de repas<br>
                ${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.fr'}
              </p>
            </div>
          `;
          
          // Améliorer le texte avec footer et désinscription
          const textWithFooter = `
${text || html.replace(/<[^>]*>/g, '').trim()}

---
Vous recevez cet email car vous êtes membre de CVN'EAT.

Pour vous désabonner : ${unsubscribeLink}

CVN'EAT - Plateforme de livraison de repas
${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.fr'}
          `.trim();

          const result = await emailService.sendEmail({
            to: email,
            subject,
            html: htmlWithFooter,
            text: textWithFooter
          });
          console.log(`✅ Email envoyé avec succès à ${email}`);
          return { email, success: true, messageId: result?.messageId };
        } catch (error) {
          console.error(`❌ Erreur envoi à ${email}:`, error.message);
          console.error('Stack:', error.stack);
          return { 
            email, 
            success: false, 
            error: error.message,
            code: error.code,
            response: error.response
          };
        }
      });

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success) {
          sent++;
        } else {
          errors.push({ email: result.email, error: result.error });
        }
      });
    };

    // Envoyer tous les batches
    const totalBatches = Math.ceil(validEmails.length / BATCH_SIZE);
    
    for (let i = 0; i < totalBatches; i++) {
      await sendBatch(validEmails, i);
      
      // Attendre entre les batches (sauf pour le dernier)
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`✅ Newsletter envoyée: ${sent} succès, ${errors.length} erreurs`);

    return NextResponse.json({
      success: true,
      sent,
      total: validEmails.length,
      errors: errors.slice(0, 10) // Limiter à 10 erreurs pour la réponse
    });

  } catch (error) {
    console.error('Erreur envoi newsletter:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur lors de l\'envoi' },
      { status: 500 }
    );
  }
}

