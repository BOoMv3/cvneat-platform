import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur manquant' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variables Supabase manquantes pour auto-confirm');
      return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🔄 Confirmation automatique de l'email pour l'utilisateur: ${userId}`);

    // Confirmer l'email de l'utilisateur via l'API Admin
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (error) {
      console.error('❌ Erreur lors de la confirmation automatique:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Email confirmé avec succès pour l'utilisateur: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Email confirmé avec succès' 
    });

  } catch (error) {
    console.error('❌ Erreur inattendue API auto-confirm:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
