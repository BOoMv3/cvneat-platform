import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/admin/orders - Récupérer la liste des commandes
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
    const status = searchParams.get('status');
    const restaurant_id = searchParams.get('restaurant_id');
    const user_id = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let query = supabase
      .from('orders')
      .select(`
        *,
        user:users(email, full_name, telephone),
        restaurant:restaurants(nom, adresse),
        order_items(count),
        delivery:users!delivery_id(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (restaurant_id) {
      query = query.eq('restaurant_id', restaurant_id);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    return NextResponse.json(orders || []);
  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/admin/orders - Créer une commande manuelle (admin)
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
      customer_name,
      customer_phone,
      restaurant_id,
      items,
      delivery_address,
      delivery_city,
      delivery_postal_code,
      delivery_instructions,
      delivery_fee,
      total_amount,
      status = 'pending'
    } = await request.json();

    if (!customer_name || !restaurant_id || !items || !delivery_address || !total_amount) {
      return NextResponse.json({ error: 'Données de commande incomplètes' }, { status: 400 });
    }

    // Créer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_name,
        customer_phone: customer_phone || '0123456789',
        restaurant_id,
        delivery_address,
        delivery_city: delivery_city || 'Paris',
        delivery_postal_code: delivery_postal_code || '75001',
        delivery_instructions: delivery_instructions || '',
        delivery_fee: delivery_fee || 0,
        total_amount,
        items: items, // Stocker comme JSON
        status
      }])
      .select(`
        *,
        restaurant:restaurants(nom)
      `)
      .single();

    if (orderError) {
      console.error('Erreur création commande admin:', orderError);
      return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 });
    }

    console.log('✅ Commande créée avec succès:', order.id);

    return NextResponse.json({
      success: true,
      order,
      message: 'Commande créée avec succès'
    });
  } catch (error) {
    console.error('Erreur création commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 