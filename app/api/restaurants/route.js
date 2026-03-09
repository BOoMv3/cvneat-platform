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
      .select('*, frais_livraison, ferme_manuellement, horaires');
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

    // Relecture ferme_manuellement pour La Bonne Pâte + Le Cinq Pizza (éviter cache)
    const getFermeManuel = async (resto) => {
      if (!resto?.id) return null;
      const { data } = await supabaseAdmin.from('restaurants').select('ferme_manuellement').eq('id', resto.id).single();
      if (data && (data.ferme_manuellement === true || data.ferme_manuellement === 1)) return true;
      if (data && data.ferme_manuellement === false) return false;
      return resto.ferme_manuellement === true || resto.ferme_manuellement === 1;
    };
    const bonnePate = filtered.find((r) => normalize(r.nom).includes('bonne pate'));
    const cinqPizza = filtered.find((r) => normalize(r.nom).includes('cinq pizza'));
    const [bonnePateFm, cinqPizzaFm] = await Promise.all([
      bonnePate ? getFermeManuel(bonnePate) : null,
      cinqPizza ? getFermeManuel(cinqPizza) : null
    ]);

    const withFermeManuel = filtered.map((r) => {
      const n = normalize(r.nom);
      const raw = r.ferme_manuellement;
      let value = raw === true || raw === 1 || String(raw || '').trim().toLowerCase() === 'true';
      if (n.includes('bonne pate') && bonnePateFm !== null) value = !!bonnePateFm;
      if (n.includes('cinq pizza') && cinqPizzaFm !== null) value = !!cinqPizzaFm;
      return { ...r, ferme_manuellement: value };
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
