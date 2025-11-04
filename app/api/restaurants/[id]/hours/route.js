import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Récupérer les horaires d'un restaurant au format lisible
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('horaires, ferme_manuellement')
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Convertir les horaires JSON en format lisible
    let horaires = restaurant.horaires || {};
    
    // Si horaires est une chaîne JSON, la parser
    if (typeof horaires === 'string') {
      try {
        horaires = JSON.parse(horaires);
      } catch (e) {
        console.error('Erreur parsing horaires JSON:', e);
        horaires = {};
      }
    }
    
    const joursSemaine = [
      { key: 'lundi', label: 'Lundi', dayIndex: 1 },
      { key: 'mardi', label: 'Mardi', dayIndex: 2 },
      { key: 'mercredi', label: 'Mercredi', dayIndex: 3 },
      { key: 'jeudi', label: 'Jeudi', dayIndex: 4 },
      { key: 'vendredi', label: 'Vendredi', dayIndex: 5 },
      { key: 'samedi', label: 'Samedi', dayIndex: 6 },
      { key: 'dimanche', label: 'Dimanche', dayIndex: 0 }
    ];

    const formattedHours = joursSemaine.map(jour => {
      const jourHoraire = horaires[jour.key];
      return {
        day: jour.label,
        day_key: jour.key,
        day_of_week: jour.dayIndex,
        ouvert: jourHoraire?.ouvert || false,
        ouverture: jourHoraire?.ouverture || null,
        fermeture: jourHoraire?.fermeture || null,
        is_closed: !jourHoraire?.ouvert || false
      };
    });
    
    console.log('Horaires formatées pour restaurant', id, ':', formattedHours);

    return NextResponse.json({
      hours: formattedHours,
      is_manually_closed: restaurant.ferme_manuellement || false
    });
  } catch (error) {
    console.error('Erreur récupération horaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Vérifier si le restaurant est ouvert maintenant
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const checkDate = body.date ? new Date(body.date) : new Date();

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('horaires, ferme_manuellement')
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Vérifier si fermé manuellement
    if (restaurant.ferme_manuellement) {
      return NextResponse.json({
        isOpen: false,
        message: 'Restaurant fermé manuellement',
        reason: 'manual'
      });
    }

    // Vérifier les horaires
    const horaires = restaurant.horaires || {};
    const dayOfWeek = checkDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    // Mapping des jours
    const dayMapping = {
      0: 'dimanche',
      1: 'lundi',
      2: 'mardi',
      3: 'mercredi',
      4: 'jeudi',
      5: 'vendredi',
      6: 'samedi'
    };

    const todayKey = dayMapping[dayOfWeek];
    const todayHours = horaires[todayKey];

    // Si pas de configuration ou fermé ce jour
    if (!todayHours || !todayHours.ouvert) {
      return NextResponse.json({
        isOpen: false,
        message: 'Restaurant fermé aujourd\'hui',
        reason: 'closed_today',
        today: todayKey
      });
    }

    // Vérifier l'heure actuelle
    const currentTime = checkDate.toTimeString().slice(0, 5); // HH:MM
    const openTime = todayHours.ouverture || '00:00';
    const closeTime = todayHours.fermeture || '23:59';

    const isOpen = currentTime >= openTime && currentTime <= closeTime;

    return NextResponse.json({
      isOpen,
      message: isOpen ? 'Restaurant ouvert' : 'Restaurant fermé',
      reason: isOpen ? 'open' : 'outside_hours',
      openTime,
      closeTime,
      currentTime,
      today: todayKey
    });
  } catch (error) {
    console.error('Erreur vérification horaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

