import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assertAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Token requis' };
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { ok: false, status: 401, error: 'Token invalide' };
  }
  const { data: ud } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
  if (!ud || ud.role !== 'admin') {
    return { ok: false, status: 403, error: 'Rôle admin requis' };
  }
  return { ok: true, user };
}

export async function PATCH(request, { params }) {
  try {
    const auth = await assertAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide (pending, approved, rejected)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('delivery_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur PATCH delivery_applications:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ application: data });
  } catch (err) {
    console.error('Erreur PATCH delivery-applications:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
