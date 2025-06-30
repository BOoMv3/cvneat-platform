import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/admin/restaurants - Récupérer la liste des restaurants
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const is_active = searchParams.get('is_active');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let query = supabase
      .from('restaurants')
      .select(`
        *,
        partner:users(email, full_name, telephone),
        menus(count),
        orders(count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: restaurants, error } = await query;

    if (error) throw error;

    return NextResponse.json(restaurants || []);
  } catch (error) {
    console.error('Erreur récupération restaurants:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/admin/restaurants - Créer un nouveau restaurant
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const {
      nom,
      adresse,
      telephone,
      email,
      description,
      horaires,
      commission_rate = 15,
      partner_id
    } = await request.json();

    if (!nom || !adresse || !telephone || !email) {
      return NextResponse.json({ error: 'Informations restaurant incomplètes' }, { status: 400 });
    }

    // Créer le restaurant
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert([{
        nom,
        adresse,
        telephone,
        email,
        description,
        horaires,
        commission_rate,
        partner_id,
        is_active: true
      }])
      .select(`
        *,
        partner:users(email, full_name)
      `)
      .single();

    if (error) throw error;

    // Envoyer email de notification au partenaire
    if (partner_id) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'restaurantCreated',
            data: {
              restaurantName: restaurant.nom,
              partnerName: restaurant.partner?.full_name,
              address: restaurant.adresse,
              commission: restaurant.commission_rate
            },
            recipientEmail: restaurant.partner?.email
          })
        });
      } catch (emailError) {
        console.error('Erreur envoi email création restaurant:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      restaurant,
      message: 'Restaurant créé avec succès'
    });
  } catch (error) {
    console.error('Erreur création restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 