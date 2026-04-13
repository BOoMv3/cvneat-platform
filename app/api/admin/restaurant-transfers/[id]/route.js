import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAdminUser(request) {
  const authHeader = request.headers.get('authorization');
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

  if (!token) return { ok: false, status: 401, error: 'Token requis' };

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) return { ok: false, status: 401, error: 'Token invalide' };

  const { data: userData, error: roleErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (roleErr || !userData || userData.role !== 'admin') {
    return { ok: false, status: 403, error: 'Accès admin requis' };
  }

  return { ok: true, user };
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdminUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const transferId = params?.id;
    if (!transferId) {
      return NextResponse.json({ error: 'Identifiant de virement requis' }, { status: 400 });
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('id, status, notes')
      .eq('id', transferId)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: 'Erreur lecture virement' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Virement introuvable' }, { status: 404 });
    }
    if ((existing.status || '').toLowerCase() !== 'completed') {
      return NextResponse.json(
        { error: `Virement non annulable (status=${existing.status || 'inconnu'})` },
        { status: 400 }
      );
    }

    const cancelNote = `[ANNULÉ PAR ADMIN ${new Date().toISOString()}]`;
    const nextNotes = existing.notes ? `${existing.notes}\n${cancelNote}` : cancelNote;

    const { error: updateErr } = await supabaseAdmin
      .from('restaurant_transfers')
      .update({
        status: 'cancelled',
        notes: nextNotes,
      })
      .eq('id', transferId);

    if (updateErr) {
      return NextResponse.json(
        { error: "Erreur lors de l'annulation du virement", details: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: transferId, status: 'cancelled' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
