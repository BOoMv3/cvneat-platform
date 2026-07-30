import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createDeliveryInboxMessage } from '@/lib/delivery-messaging';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: u } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!u || u.role !== 'admin') return null;
  return user;
}

export async function POST(request) {
  try {
    const user = await requireAdmin(request);
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const {
      deliveryUserId = null,
      subject,
      body,
      kind = 'admin',
      eventType = null,
      data = {},
      push = true,
    } = await request.json().catch(() => ({}));

    if (!subject || typeof body !== 'string' || !String(body).trim()) {
      return NextResponse.json({ error: 'Sujet et message requis' }, { status: 400 });
    }

    const row = await createDeliveryInboxMessage({
      adminId: user.id,
      deliveryUserId: deliveryUserId || null,
      subject,
      body,
      kind: kind === 'system' ? 'system' : 'admin',
      eventType,
      data,
      push: push !== false,
    });

    return NextResponse.json({
      success: true,
      id: row.id,
      created_at: row.created_at,
      push: row.pushResult || null,
    });
  } catch (e) {
    console.error('admin delivery-messages send:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
