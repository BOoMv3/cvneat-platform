import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créer le client admin Supabase pour confirmer l'email
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY non configurée');
}

const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { message: 'ID utilisateur manquant' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    // Confirmer automatiquement l'email de l'utilisateur
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true
      }
    );

    if (error) {
      console.error('Erreur lors de la confirmation automatique de l\'email:', error);
      return NextResponse.json(
        { message: error.message || 'Erreur lors de la confirmation de l\'email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Email confirmé automatiquement', user: data.user },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la confirmation automatique de l\'email:', error);
    return NextResponse.json(
      { message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

