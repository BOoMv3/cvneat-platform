import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../lib/supabase';

export const dynamic = 'force-dynamic';

async function getAuthedUser(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!token) return null;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return null;

    if (!supabaseAdmin) return null;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || !profile?.role) return null;
    return { user, role: profile.role };
  } catch {
    return null;
  }
}

async function resolveRestaurantIdForUser(userId) {
  if (!supabaseAdmin) return null;
  const { data: restaurant, error } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !restaurant?.id) return null;
  return restaurant.id;
}

export async function POST(request) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const restaurantIdParam = body.restaurantId;
    const restaurantId =
      authed.role === 'admin' && restaurantIdParam
        ? restaurantIdParam
        : await resolveRestaurantIdForUser(authed.user.id);

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Marquer toutes les notifications non lues comme lues
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ lu: true })
      .eq('restaurant_id', restaurantId)
      .eq('lu', false)
      .select();

    if (error) {
      console.error('Erreur marquage notifications:', error);
      return NextResponse.json(
        { error: 'Erreur lors du marquage des notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: data?.length || 0,
      message: `${data?.length || 0} notification(s) marquée(s) comme lue(s)`
    });

  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors du marquage des notifications' },
      { status: 500 }
    );
  }
} 