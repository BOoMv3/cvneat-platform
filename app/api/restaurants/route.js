import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeRestaurantOpenFields } from '@/lib/restaurant-open-compute';

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
      .select('*, frais_livraison, ferme_manuellement, ouvert_manuellement, horaires, offre_active, offre_label, offre_description');
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

    const isLaBonnePate = (nom) => nom && (String(nom).toLowerCase().includes('bonne pâte') || String(nom).toLowerCase().includes('bonne pate'));
    const now = new Date();

    const withFermeManuel = filtered.map((r) => {
      const openFields = normalizeRestaurantOpenFields(r, now);
      const oa = r.offre_active;
      let offreActiveFinal = oa === true || oa === 1 || (typeof oa === 'string' && oa.trim().toLowerCase() === 'true');
      if (isLaBonnePate(r.nom)) { offreActiveFinal = false; }
      return {
        ...r,
        ...openFields,
        offre_active: offreActiveFinal,
        offre_label: isLaBonnePate(r.nom) ? null : (r.offre_label ?? null),
        offre_description: isLaBonnePate(r.nom) ? null : (r.offre_description ?? null),
      };
    });

    // Performance: do not query `reviews` per restaurant (N+1 queries).
    // We rely on stored `rating` / `reviews_count` columns in `restaurants`.
    const res = NextResponse.json(withFermeManuel);
    res.headers.set('X-Cvneat-Restaurants-Route', 'manual-only-v3');
    // Bloquer tout cache (navigateur, CDN Vercel, proxies) pour éviter données périmées
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    res.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('❌ Erreur serveur lors de la récupération des restaurants:', error);
    return NextResponse.json(
      { message: "Erreur serveur lors de la récupération des restaurants", error: error.message },
      { status: 500 }
    );
  }
}
