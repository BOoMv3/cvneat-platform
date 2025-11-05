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
      
      // Support pour plages multiples (nouveau format)
      const hasPlages = Array.isArray(jourHoraire?.plages) && jourHoraire.plages.length > 0;
      
      return {
        day: jour.label,
        day_key: jour.key,
        day_of_week: jour.dayIndex,
        ouvert: jourHoraire?.ouvert || false,
        ouverture: hasPlages ? null : (jourHoraire?.ouverture || null), // null si plages multiples
        fermeture: hasPlages ? null : (jourHoraire?.fermeture || null), // null si plages multiples
        plages: hasPlages ? jourHoraire.plages : null, // Inclure les plages si présentes
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
    
    // Gérer le cas où le body est vide ou manquant
    let body = {};
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await request.json();
      }
    } catch (e) {
      // Si pas de body ou erreur de parsing, utiliser la date actuelle
      console.log('Pas de body dans la requête, utilisation de la date actuelle');
    }
    
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
    let horaires = restaurant.horaires || {};
    
    // Si horaires est une chaîne JSON, la parser
    if (typeof horaires === 'string') {
      try {
        horaires = JSON.parse(horaires);
      } catch (e) {
        console.error('Erreur parsing horaires JSON dans POST:', e);
        horaires = {};
      }
    }
    
    const dayOfWeek = checkDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    // Mapping des jours avec toutes les variantes possibles
    const dayVariants = {
      0: ['dimanche', 'Dimanche', 'DIMANCHE'],
      1: ['lundi', 'Lundi', 'LUNDI'],
      2: ['mardi', 'Mardi', 'MARDI'],
      3: ['mercredi', 'Mercredi', 'MERCREDI'],
      4: ['jeudi', 'Jeudi', 'JEUDI'],
      5: ['vendredi', 'Vendredi', 'VENDREDI'],
      6: ['samedi', 'Samedi', 'SAMEDI']
    };

    const variants = dayVariants[dayOfWeek] || ['lundi'];
    const todayKey = variants[0]; // Clé principale en minuscule
    
    // Chercher les horaires avec toutes les variantes de casse
    let todayHours = null;
    for (const variant of variants) {
      if (horaires[variant]) {
        todayHours = horaires[variant];
        break;
      }
    }
    
    // Log détaillé pour debug
    console.log('🔍 DEBUG horaires:', {
      restaurantId: id,
      dayOfWeek,
      todayKey,
      variants,
      allHorairesKeys: Object.keys(horaires),
      todayHours,
      todayHoursOuvert: todayHours?.ouvert,
      todayHoursOuvertType: typeof todayHours?.ouvert,
      todayHoursOuvertStrict: todayHours?.ouvert === true,
      hasPlages: Array.isArray(todayHours?.plages),
      plagesCount: todayHours?.plages?.length,
      allHoraires: JSON.stringify(horaires, null, 2)
    });

    // Si pas de configuration ou fermé ce jour
    if (!todayHours) {
      console.log('🔴 Restaurant fermé - Pas de configuration pour aujourd\'hui:', todayKey);
      return NextResponse.json({
        isOpen: false,
        message: 'Restaurant fermé aujourd\'hui (pas de configuration)',
        reason: 'closed_today',
        today: todayKey,
        dayOfWeek,
        debug: { 
          todayKey, 
          todayHours: null, 
          allHorairesKeys: Object.keys(horaires),
          allHoraires: horaires,
          variants: variants
        }
      });
    }

    // Vérifier strictement si ouvert (doit être explicitement true)
    // Support pour nouveau format avec plages multiples
    const hasPlages = Array.isArray(todayHours.plages) && todayHours.plages.length > 0;
    const isOpenByFlag = todayHours.ouvert === true;
    
    if (!isOpenByFlag && !hasPlages) {
      console.log('🔴 Restaurant fermé - ouvert n\'est pas true et pas de plages:', {
        ouvert: todayHours.ouvert,
        type: typeof todayHours.ouvert,
        strict: todayHours.ouvert === true,
        hasPlages,
        plages: todayHours.plages
      });
      return NextResponse.json({
        isOpen: false,
        message: 'Restaurant fermé aujourd\'hui',
        reason: 'closed_today',
        today: todayKey,
        dayOfWeek,
        debug: { 
          todayKey, 
          todayHours, 
          allHorairesKeys: Object.keys(horaires),
          allHoraires: horaires,
          variants: variants,
          ouvertValue: todayHours.ouvert,
          ouvertType: typeof todayHours.ouvert,
          hasPlages
        }
      });
    }

    // Vérifier l'heure actuelle (en heure locale française Europe/Paris)
    // IMPORTANT: Le serveur Vercel utilise UTC, il faut convertir en heure française
    const now = checkDate ? new Date(checkDate) : new Date();
    
    // Convertir en heure locale française (Europe/Paris)
    // Utiliser toLocaleString pour obtenir l'heure dans le bon fuseau horaire
    const frTime = now.toLocaleString('fr-FR', { 
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Parser l'heure française (format HH:MM)
    const [currentHours, currentMinutes] = frTime.split(':').map(Number);
    const currentTimeMinutes = currentHours * 60 + currentMinutes;
    
    // Log pour debug
    console.log('🕐 Heure système:', {
      dateISO: now.toISOString(),
      dateUTC: now.toUTCString(),
      dateLocale: now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
      frTimeString: frTime,
      hours: currentHours,
      minutes: currentMinutes,
      timeMinutes: currentTimeMinutes,
      timeString: `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`
    });

    // Parser les heures d'ouverture et fermeture
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':').map(Number);
      let totalMinutes = hours * 60 + minutes;
      // Si c'est 00:00 (minuit), on le traite comme 24:00 (1440 minutes) pour la fermeture
      if (totalMinutes === 0 && hours === 0 && minutes === 0) {
        totalMinutes = 24 * 60; // 1440 minutes = minuit de la journée suivante
      }
      return totalMinutes;
    };

    // Support pour plusieurs plages horaires (nouveau format)
    let isOpen = false;
    let matchingPlage = null;

    if (Array.isArray(todayHours.plages) && todayHours.plages.length > 0) {
      // Nouveau format avec plages multiples
      for (const plage of todayHours.plages) {
        if (!plage.ouverture || !plage.fermeture) continue;

        const openTimeMinutes = parseTime(plage.ouverture);
        let closeTimeMinutes = parseTime(plage.fermeture);

        if (openTimeMinutes === null || closeTimeMinutes === null) continue;

        // Si la fermeture est à 00:00 (minuit), on la traite comme 24:00 (1440 minutes)
        const isMidnightClose = plage.fermeture === '00:00' || plage.fermeture === '0:00';
        if (isMidnightClose) {
          closeTimeMinutes = 24 * 60; // 1440 minutes
        }

        // Vérifier si on est dans cette plage horaire
        let inPlage;
        if (isMidnightClose) {
          inPlage = currentTimeMinutes >= openTimeMinutes;
        } else {
          inPlage = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
        }

        if (inPlage) {
          isOpen = true;
          matchingPlage = plage;
          break; // On est dans une plage, le restaurant est ouvert
        }
      }

      console.log('🕐 Vérification plages multiples:', {
        plagesCount: todayHours.plages.length,
        currentTimeMinutes,
        isOpen,
        matchingPlage
      });
    } else {
      // Ancien format avec une seule plage (rétrocompatibilité)
      const openTimeMinutes = parseTime(todayHours.ouverture);
      let closeTimeMinutes = parseTime(todayHours.fermeture);

      if (openTimeMinutes === null || closeTimeMinutes === null) {
        return NextResponse.json({
          isOpen: false,
          message: 'Horaires invalides',
          reason: 'invalid_hours'
        });
      }

      // Si la fermeture est à 00:00 (minuit), on la traite comme 24:00 (1440 minutes)
      const isMidnightClose = todayHours.fermeture === '00:00' || todayHours.fermeture === '0:00';
      if (isMidnightClose) {
        closeTimeMinutes = 24 * 60; // 1440 minutes
      }

      // Vérifier si on est dans la plage horaire
      if (isMidnightClose) {
        isOpen = currentTimeMinutes >= openTimeMinutes;
      } else {
        isOpen = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
      }
    }

    console.log('🕐 Vérification horaires:', {
      restaurantId: id,
      currentTime: `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`,
      currentTimeMinutes,
      isOpen,
      todayKey,
      hasPlages: Array.isArray(todayHours.plages),
      plagesCount: todayHours.plages?.length,
      matchingPlage
    });

    // Préparer les informations de plages pour l'affichage
    const plagesInfo = Array.isArray(todayHours.plages) && todayHours.plages.length > 0
      ? todayHours.plages.map(p => ({ ouverture: p.ouverture, fermeture: p.fermeture }))
      : (todayHours.ouverture && todayHours.fermeture ? [{ ouverture: todayHours.ouverture, fermeture: todayHours.fermeture }] : []);

    return NextResponse.json({
      isOpen,
      message: isOpen ? 'Restaurant ouvert' : 'Restaurant fermé',
      reason: isOpen ? 'open' : 'outside_hours',
      openTime: matchingPlage?.ouverture || todayHours.ouverture || null,
      closeTime: matchingPlage?.fermeture || todayHours.fermeture || null,
      plages: plagesInfo,
      currentTime: `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`,
      currentTimeMinutes,
      today: todayKey,
      debug: {
        currentTimeMinutes,
        isOpen,
        todayHours,
        matchingPlage,
        plagesCount: todayHours.plages?.length
      }
    });
  } catch (error) {
    console.error('Erreur vérification horaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

