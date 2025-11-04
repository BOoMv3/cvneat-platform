import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET /api/complaints - Récupérer les réclamations (admin ou client)
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

    // Vérifier le rôle de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Erreur utilisateur' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let query = supabase
      .from('complaints')
      .select(`
        *,
        order:commandes(
          id,
          total,
          statut,
          created_at
        ),
        customer:users!user_id(
          id,
          email,
          nom,
          prenom,
          telephone
        ),
        restaurant:restaurants!restaurant_id(
          id,
          nom,
          adresse
        ),
        evidence:complaint_evidence(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtres selon le rôle
    if (userData.role === 'admin') {
      // Admin voit toutes les réclamations
      if (status) {
        query = query.eq('status', status);
      }
    } else if (userData.role === 'restaurant') {
      // Restaurant voit ses réclamations
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (restaurant) {
        query = query.eq('restaurant_id', restaurant.id);
      } else {
        return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
      }
    } else {
      // Client voit ses propres réclamations
      query = query.eq('user_id', user.id);
    }

    if (status) {
      query = query.eq('statut', status);
    }

    const { data: complaints, error } = await query;

    if (error) {
      console.error('Erreur récupération réclamations:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json(complaints);

  } catch (error) {
    console.error('Erreur API réclamations:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/complaints - Créer une nouvelle réclamation
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

    const {
      orderId,
      complaintType,
      title,
      description,
      requestedRefundAmount,
      evidenceDescription,
      photos = []
    } = await request.json();

    // Validation des données
    if (!orderId || !complaintType || !title || !description || !requestedRefundAmount) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Vérifier que la commande existe et appartient au client
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(id, user_id)
      `)
      .eq('id', orderId)
      .eq('user_id', user.id)
      .eq('statut', 'livree')
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou non livrée' },
        { status: 404 }
      );
    }

    // Vérifier le délai de réclamation (48h max)
    const orderTime = new Date(order.created_at);
    const now = new Date();
    const hoursDiff = (now - orderTime) / (1000 * 60 * 60);

    if (hoursDiff > 48) {
      return NextResponse.json(
        { error: 'Délai de réclamation dépassé (48h maximum)' },
        { status: 400 }
      );
    }

    if (hoursDiff < 1) {
      return NextResponse.json(
        { error: 'Réclamation trop tôt (minimum 1 heure après la livraison)' },
        { status: 400 }
      );
    }

    // Vérifier l'historique du client (anti-fraude) - table optionnelle
    let customerHistory = null;
    try {
      const { data } = await supabase
        .from('customer_complaint_history')
        .select('*')
        .eq('user_id', user.id)
        .single();
      customerHistory = data;
    } catch (err) {
      // Table peut ne pas exister, on continue
    }

    if (customerHistory?.is_flagged) {
      return NextResponse.json(
        { 
          error: 'Compte suspendu pour réclamations abusives',
          reason: customerHistory.flag_reason
        },
        { status: 403 }
      );
    }

    // Vérifier si une réclamation existe déjà pour cette commande
    const { data: existingComplaint } = await supabase
      .from('complaints')
      .select('id')
      .eq('commande_id', orderId)
      .single();

    if (existingComplaint) {
      return NextResponse.json(
        { error: 'Une réclamation existe déjà pour cette commande' },
        { status: 400 }
      );
    }

    // Calculer le score de réclamation initial
    let complaintScore = 50; // Score de base
    
    if (customerHistory) {
      // Ajuster selon l'historique
      complaintScore = customerHistory.trust_score;
      
      // Pénalité si trop de réclamations récentes
      if (customerHistory.total_complaints > 5) {
        complaintScore -= 20;
      }
    }

    // Créer la réclamation
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .insert([{
        commande_id: orderId,
        user_id: user.id,
        restaurant_id: order.restaurant?.id || order.restaurant_id,
        type: complaintType,
        titre: title,
        description,
        montant_remboursement: Math.min(requestedRefundAmount, parseFloat(order.total || 0)),
        description_preuve: evidenceDescription,
        photos: photos || [],
        statut: 'en_attente',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      }])
      .select(`
        *,
        order:commandes(id, total, statut),
        customer:users!user_id(email, nom, prenom),
        restaurant:restaurants(nom)
      `)
      .single();

    if (complaintError) {
      console.error('Erreur création réclamation:', complaintError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la réclamation' },
        { status: 500 }
      );
    }

    // Notifier l'admin
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'newComplaint',
          data: {
            complaintId: complaint.id,
            orderId: order.id,
            customerName: complaint.customer?.nom || complaint.customer?.prenom || 'Client',
            restaurantName: complaint.restaurant?.nom || 'Restaurant',
            complaintType: complaintType,
            amount: requestedRefundAmount
          },
          recipientRole: 'admin'
        })
      });
    } catch (notificationError) {
      console.error('Erreur notification admin:', notificationError);
      // Ne pas faire échouer la création pour une erreur de notification
    }

    return NextResponse.json({
      success: true,
      complaint,
      message: 'Réclamation créée avec succès'
    });

  } catch (error) {
    console.error('Erreur API création réclamation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
