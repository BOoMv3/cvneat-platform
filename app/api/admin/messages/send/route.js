import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { user: null };
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { user: null };
  const { data: u } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!u || u.role !== 'admin') return { user: null };
  return { user };
}

export async function POST(request) {
  try {
    const { user } = await requireAdmin(request);
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { restaurantId, subject, body } = await request.json().catch(() => ({}));
    if (!subject || typeof body !== 'string') {
      return NextResponse.json({ error: 'Sujet et message requis' }, { status: 400 });
    }

    const supabaseAdmin = (await import('@/lib/supabase')).supabaseAdmin;
    if (!supabaseAdmin) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });

    const { data, error } = await supabaseAdmin
      .from('partner_messages')
      .insert({
        admin_id: user.id,
        restaurant_id: restaurantId || null,
        subject: String(subject).trim(),
        body: String(body).trim(),
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('partner_messages insert:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    console.error('admin messages send:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
