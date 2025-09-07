import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    console.log('=== RÉCUPÉRATION COMMANDE PAR ID ===');
    console.log('ID demandé:', id);

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Pas de token d\'authentification');
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Erreur authentification:', userError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', user.email);

    // Récupérer la commande
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Erreur récupération commande:', error);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (!order) {
      console.log('❌ Aucune commande trouvée pour l\'ID:', id);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Vérifier l'appartenance de la commande
    // Pour l'instant, on vérifie par email du client (customer_name)
    // Dans un vrai système, on aurait une relation user_id dans la commande
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('nom, prenom, email')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      console.error('❌ Erreur récupération données utilisateur:', userDataError);
      return NextResponse.json({ error: 'Erreur utilisateur' }, { status: 500 });
    }

    // Vérifier si la commande appartient à cet utilisateur
    // On compare le nom du client avec le nom de l'utilisateur connecté
    const fullUserName = `${userData.prenom} ${userData.nom}`;
    if (order.customer_name !== fullUserName) {
      console.error('❌ Commande ne appartient pas à l\'utilisateur:', {
        commande_client: order.customer_name,
        utilisateur: fullUserName
      });
      return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à voir cette commande' }, { status: 403 });
    }

    console.log('✅ Commande trouvée et autorisée:', order.id);
    return NextResponse.json(order);
  } catch (error) {
    console.error('❌ Erreur API commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log('=== MISE À JOUR COMMANDE ===');
    console.log('ID commande:', id);
    console.log('Données reçues:', body);

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Pas de token d\'authentification');
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token reçu:', token ? 'Oui' : 'Non');

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('❌ Erreur authentification:', userError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', user.email);

    // Mettre à jour la commande
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: body.status,
        rejection_reason: body.reason || null,
        preparation_time: body.preparation_time || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur mise à jour:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    console.log('✅ Commande mise à jour:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Erreur API mise à jour:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}