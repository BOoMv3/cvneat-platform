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
    // Suppression réelle pour corriger immédiatement un doublon de saisie:
    // le calcul du "montant dû" ne comptera plus cette ligne.
    const { error: deleteErr } = await supabaseAdmin
      .from('restaurant_transfers')
      .delete()
      .eq('id', transferId);

    if (deleteErr) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du virement', details: deleteErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: transferId, deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
