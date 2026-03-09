import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * PATCH: Mettre à jour l'offre / promo du restaurant du partenaire connecté
 * Body: { offre_active, offre_label, offre_description }
 */
export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const offre_active = body.offre_active ?? false;
    const offre_label = typeof body.offre_label === 'string' ? body.offre_label.trim() : null;
    const offre_description = typeof body.offre_description === 'string' ? body.offre_description.trim() : null;

    const { data: restaurant, error: fetchErr } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('restaurants')
      .update({
        offre_active: !!offre_active,
        offre_label: offre_label || null,
        offre_description: offre_description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurant.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, restaurant: updated });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
