import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import emailService from '@/lib/emailService';

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

    if (userError || !userData || userData.role !== 'admin') {
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
          await emailService.sendEmail({
            to: email,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '').trim()
          });
          return { email, success: true };
        } catch (error) {
          console.error(`Erreur envoi à ${email}:`, error);
          return { email, success: false, error: error.message };
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

