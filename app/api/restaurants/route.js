import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Important endpoint for the homepage: keep it fast.
// We allow short CDN caching to reduce server CPU load.
export const dynamic = 'force-dynamic';

// Créer un client admin pour bypasser RLS
let supabaseAdmin = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey
    });
  } else {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('✅ Client Supabase Admin initialisé');
  }
} catch (error) {
  console.error('❌ Erreur initialisation Supabase Admin:', error);
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      console.error('❌ Client Supabase Admin non initialisé');
      return NextResponse.json(
        { message: "Configuration Supabase manquante", error: "Variables d'environnement non définies" },
        { status: 500 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*, frais_livraison, ferme_manuellement, horaires, offre_active, offre_label, offre_description');
      // .eq('status', 'active'); // Temporairement désactivé pour debug

    if (error) {
      console.error('❌ Erreur Supabase lors de la récupération des restaurants:', error);
      return NextResponse.json({ message: "Erreur lors de la récupération des restaurants", error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      const res = NextResponse.json([]);
      // Pas de cache pour garder ferme_manuellement à jour (éviter liste "ouvert" vs détail "fermé manuellement")
      res.headers.set('Cache-Control', 'no-store, max-age=0');
      return res;
    }

    // Exclure les restaurants retirés (Molokai, O Toasty, etc.)
    const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const masquesContient = ['molokai', 'otoasty'];
    const filtered = data.filter((r) => {
      const n = normalize(r.nom);
      return !masquesContient.some((mot) => n.includes(mot));
    });

    // Relecture ferme_manuellement + ouvert_manuellement pour certains restos (éviter cache, affichage correct "ouvert manuellement")
    const getFreshStatus = async (resto) => {
      if (!resto?.id) return null;
      try {
        const { data: fresh, error: freshErr } = await supabaseAdmin.from('restaurants').select('ferme_manuellement, ouvert_manuellement').eq('id', resto.id).single();
        if (freshErr || !fresh) return null;
        return fresh;
      } catch (_) {
        return null;
      }
    };
    const bonnePate = filtered.find((r) => normalize(r.nom).includes('bonne pate'));
    const cinqPizza = filtered.find((r) => normalize(r.nom).includes('cinq pizza'));
    const saonaTea = filtered.find((r) => normalize(r.nom).includes('saona'));
    let bonnePateStatus = null;
    let cinqPizzaStatus = null;
    let saonaTeaStatus = null;
    try {
      [bonnePateStatus, cinqPizzaStatus, saonaTeaStatus] = await Promise.all([
        bonnePate ? getFreshStatus(bonnePate) : null,
        cinqPizza ? getFreshStatus(cinqPizza) : null,
        saonaTea ? getFreshStatus(saonaTea) : null
      ]);
    } catch (_) {
      // Si colonne ouvert_manuellement absente ou autre erreur, on garde les données du premier select
    }

    const withFermeManuel = filtered.map((r) => {
      const n = normalize(r.nom);
      const raw = r.ferme_manuellement;
      let fm = raw === true || raw === 1 || String(raw || '').trim().toLowerCase() === 'true';
      let om = r.ouvert_manuellement === true || r.ouvert_manuellement === 1 || String(r.ouvert_manuellement || '').trim().toLowerCase() === 'true';
      // Promo : pour tous les restaurants, on utilise les données du select (ceux qui ont activé une promo l'ont en base)
      const offreActive = r.offre_active === true || r.offre_active === 1 || String(r.offre_active || '').trim().toLowerCase() === 'true';
      const offreLabel = r.offre_label ?? null;
      const offreDesc = r.offre_description ?? null;
      if (n.includes('bonne pate') && bonnePateStatus) {
        fm = !!(bonnePateStatus.ferme_manuellement === true || bonnePateStatus.ferme_manuellement === 1);
        om = !!(bonnePateStatus.ouvert_manuellement === true || bonnePateStatus.ouvert_manuellement === 1);
      }
      if (n.includes('cinq pizza') && cinqPizzaStatus) {
        fm = !!(cinqPizzaStatus.ferme_manuellement === true || cinqPizzaStatus.ferme_manuellement === 1);
        om = !!(cinqPizzaStatus.ouvert_manuellement === true || cinqPizzaStatus.ouvert_manuellement === 1);
      }
      if (n.includes('saona') && saonaTeaStatus) {
        fm = !!(saonaTeaStatus.ferme_manuellement === true || saonaTeaStatus.ferme_manuellement === 1);
        om = !!(saonaTeaStatus.ouvert_manuellement === true || saonaTeaStatus.ouvert_manuellement === 1);
      }
      return { ...r, ferme_manuellement: fm, ouvert_manuellement: om, offre_active: offreActive, offre_label: offreLabel, offre_description: offreDesc };
    });

    // Performance: do not query `reviews` per restaurant (N+1 queries).
    // We rely on stored `rating` / `reviews_count` columns in `restaurants`.
    const res = NextResponse.json(withFermeManuel);
    // Pas de cache pour ferme_manuellement frais (cohérence liste/détail)
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('❌ Erreur serveur lors de la récupération des restaurants:', error);
    return NextResponse.json(
      { message: "Erreur serveur lors de la récupération des restaurants", error: error.message },
      { status: 500 }
    );
  }
}
