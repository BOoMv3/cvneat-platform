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


