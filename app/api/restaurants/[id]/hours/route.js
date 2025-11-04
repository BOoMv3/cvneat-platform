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
      { key: 'lundi', label: 'Lundi', dayIndex: 1, variants: ['lundi', 'Lundi', 'LUNDI'] },
      { key: 'mardi', label: 'Mardi', dayIndex: 2, variants: ['mardi', 'Mardi', 'MARDI'] },
      { key: 'mercredi', label: 'Mercredi', dayIndex: 3, variants: ['mercredi', 'Mercredi', 'MERCREDI'] },
      { key: 'jeudi', label: 'Jeudi', dayIndex: 4, variants: ['jeudi', 'Jeudi', 'JEUDI'] },
      { key: 'vendredi', label: 'Vendredi', dayIndex: 5, variants: ['vendredi', 'Vendredi', 'VENDREDI'] },
      { key: 'samedi', label: 'Samedi', dayIndex: 6, variants: ['samedi', 'Samedi', 'SAMEDI'] },
      { key: 'dimanche', label: 'Dimanche', dayIndex: 0, variants: ['dimanche', 'Dimanche', 'DIMANCHE'] }
    ];

    const formattedHours = joursSemaine.map(jour => {
      // Chercher le jour dans les horaires avec différentes variantes de casse
      let jourHoraire = null;
      for (const variant of jour.variants) {
        if (horaires[variant]) {
          jourHoraire = horaires[variant];
          break;
        }
      }
      
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
    
    // Chercher les horaires avec différentes variantes de casse
    let todayHours = horaires[todayKey] || horaires[todayKey.charAt(0).toUpperCase() + todayKey.slice(1)] || horaires[todayKey.toUpperCase()];
    
    // Si pas de configuration ou fermé ce jour
    if (!todayHours || !todayHours.ouvert) {
      console.log('Restaurant fermé - todayKey:', todayKey, 'todayHours:', todayHours, 'horaires:', horaires);
      return NextResponse.json({
        isOpen: false,
        message: 'Restaurant fermé aujourd\'hui',
        reason: 'closed_today',
        today: todayKey,
        debug: { todayKey, todayHours, allHoraires: Object.keys(horaires) }
      });
    }

    // Vérifier l'heure actuelle
    const now = new Date(checkDate);
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeMinutes = currentHours * 60 + currentMinutes;

    // Parser les heures d'ouverture et fermeture
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const openTimeMinutes = parseTime(todayHours.ouverture);
    const closeTimeMinutes = parseTime(todayHours.fermeture);

    if (openTimeMinutes === null || closeTimeMinutes === null) {
      return NextResponse.json({
        isOpen: false,
        message: 'Horaires invalides',
        reason: 'invalid_hours'
      });
    }

    // Vérifier si on est dans la plage horaire
    const isOpen = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;

    return NextResponse.json({
      isOpen,
      message: isOpen ? 'Restaurant ouvert' : 'Restaurant fermé',
      reason: isOpen ? 'open' : 'outside_hours',
      openTime: todayHours.ouverture,
      closeTime: todayHours.fermeture,
      currentTime: `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`,
      currentTimeMinutes,
      openTimeMinutes,
      closeTimeMinutes,
      today: todayKey
    });
  } catch (error) {
    console.error('Erreur vérification horaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

