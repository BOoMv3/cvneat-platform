'use strict';

import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token =
      authHeader?.replace('Bearer ', '') ||
      request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('supabase-auth-token')?.value;

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabaseAdmin.from('delivery_push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('❌ Erreur enregistrement push subscription:', error);
      return NextResponse.json({ error: 'Erreur enregistrement subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur API push/register:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


