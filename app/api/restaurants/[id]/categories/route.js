import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../lib/supabase';

// IMPORTANT: éviter tout caching (les partenaires peuvent réordonner)
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const restaurantId = params?.id;
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID requis' }, { status: 400 });
    }

    const db = supabaseAdmin || supabase;
    const { data, error } = await db
      .from('menu_categories')
      .select('id, name, description, sort_order')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      // Fallback: si la table n'est pas lisible publiquement (RLS), dériver depuis les plats.
      console.warn('⚠️ menu_categories non lisible, fallback depuis menus:', error);
      const { data: menuRows, error: menuErr } = await db
        .from('menus')
        .select('category')
        .eq('restaurant_id', restaurantId)
        .eq('disponible', true);

      if (menuErr) {
        console.error('Erreur fallback récupération catégories depuis menus:', menuErr);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
      }

      const seen = new Set();
      const uniq = [];
      for (const row of menuRows || []) {
        const name = (row?.category || '').trim();
        if (!name) continue;
        const k = name.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push(name);
      }

      // Ordre défini par le partenaire (category_order sur restaurant)
      let orderArr = [];
      try {
        const { data: resto } = await db.from('restaurants').select('category_order').eq('id', restaurantId).single();
        orderArr = Array.isArray(resto?.category_order) ? resto.category_order : [];
      } catch (_) {
        /* colonne category_order peut ne pas exister */
      }
      if (orderArr.length > 0) {
        const orderSet = new Set(orderArr.map((n) => String(n || '').toLowerCase().trim()).filter(Boolean));
        const ordered = orderArr.filter((n) => {
          const k = String(n || '').toLowerCase().trim();
          return uniq.some((u) => u.toLowerCase().trim() === k);
        });
        const rest = uniq.filter((n) => !orderSet.has(n.toLowerCase().trim()));
        uniq.length = 0;
        uniq.push(...ordered, ...rest);
      } else {
        // Trier par ordre logique d'un repas (boissons en dernier) si pas d'ordre personnalisé
        const getDefaultOrder = (name) => {
          const n = (name || '').toLowerCase();
          if (n.includes('formule') || n.includes('menu')) return 0;
          if (n.includes('entree') || n.includes('entrée')) return 1;
          if (n.includes('sandwich') || n.includes('burger') || n.includes('panini') || n.includes('taco') || n.includes('kebab') || n.includes('pizza') || n.includes('plat') || n.includes('salade') || n.includes('poke')) return 2;
          if (n.includes('dessert')) return 3;
          if (n.includes('boisson') || n.includes('drink') || n === 'boissons') return 4;
          if (n.includes('sauce') || n.includes('supplément') || n.includes('supplement')) return 5;
          return 6;
        };
        uniq.sort((a, b) => getDefaultOrder(a) - getDefaultOrder(b));
      }

      const fallback = uniq.map((name, idx) => ({
        id: `derived-${idx + 1}`,
        name,
        description: '',
        sort_order: idx + 1
      }));

      const res = NextResponse.json(fallback);
      res.headers.set('Cache-Control', 'no-store, max-age=0');
      return res;
    }

    const res = NextResponse.json(Array.isArray(data) ? data : []);
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (e) {
    console.error('Erreur API catégories menu:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

