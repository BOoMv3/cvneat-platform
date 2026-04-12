import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin as sharedSupabaseAdmin } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

function serializeForClient(value) {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Error) return value.message || String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const getAdminClient = () => {
  if (sharedSupabaseAdmin) {
    return sharedSupabaseAdmin;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !url) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/** PostgREST avec le JWT utilisateur (aligné sur /api/partner/restaurant/[id]). */
async function supabaseRestWithJwt(token, path, { method = 'GET', body = null, extraHeaders = {} } = {}) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anonKey) {
    return { ok: false, status: 500, json: { message: 'Config Supabase manquante' } };
  }
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...extraHeaders,
    },
    body: body != null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text?.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, json };
}

// GET /api/admin/restaurants/[id] - Récupérer un restaurant spécifique
export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const restaurantId = resolvedParams?.id;
    if (!restaurantId || typeof restaurantId !== 'string') {
      return NextResponse.json({ error: 'ID restaurant manquant ou invalide' }, { status: 400 });
    }

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        menus(*),
        orders(count),
        partner:users(email, nom, prenom, telephone)
      `)
      .eq('id', restaurantId)
      .single();

    if (error) throw error;

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Erreur récupération restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/admin/restaurants/[id] - Mettre à jour un restaurant
export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const rawId = resolvedParams?.id;
    const restaurantId =
      typeof rawId === 'string'
        ? rawId.trim()
        : Array.isArray(rawId)
          ? String(rawId[0] ?? '').trim()
          : rawId != null
            ? String(rawId).trim()
            : '';
    if (!restaurantId) {
      return NextResponse.json({ error: 'ID restaurant manquant ou invalide' }, { status: 400 });
    }

    // Vérifier admin via service role (ne dépend pas de la RLS sur users avec le JWT).
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur : SUPABASE_SERVICE_ROLE_KEY manquante' },
        { status: 500 }
      );
    }
    const { data: adminRow, error: adminRoleErr } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (adminRoleErr || String(adminRow?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    let bodyJson;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
    }
    if (bodyJson == null || typeof bodyJson !== 'object' || Array.isArray(bodyJson)) {
      return NextResponse.json({ error: 'Corps attendu : un objet JSON' }, { status: 400 });
    }

    const {
      nom,
      adresse,
      telephone,
      email,
      description,
      horaires,
      is_active,
      ferme_manuellement,
      ouvert_manuellement,
      manual_status_updated_at,
      manual_status_updated_by,
      commission_rate,
      legal_name,
      siret,
      vat_number,
      strategie_boost_reduction_pct
    } = bodyJson;

    // Toggle admin (dashboard) : RPC SECURITY DEFINER (contourne RLS / rôle 'Admin' vs 'admin').
    // Si la migration 20260410190000 n’est pas appliquée, on retombe sur le PATCH plus bas.
    const TOGGLE_KEYS = new Set([
      'ferme_manuellement',
      'ouvert_manuellement',
      'manual_status_updated_at',
      'manual_status_updated_by',
    ]);
    const bodyKeys = Object.keys(bodyJson);
    const isAdminManualToggle =
      bodyKeys.length > 0 &&
      bodyKeys.every((k) => TOGGLE_KEYS.has(k)) &&
      (ferme_manuellement !== undefined || ouvert_manuellement !== undefined);

    if (isAdminManualToggle) {
      const rpcRes = await supabaseRestWithJwt(token, '/rest/v1/rpc/admin_set_restaurant_manual_status', {
        method: 'POST',
        body: {
          p_restaurant_id: restaurantId,
          p_ferme_manuellement: !!ferme_manuellement,
          p_ouvert_manuellement: !!ouvert_manuellement,
        },
        extraHeaders: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      });
      const j = rpcRes.json;
      const rpcRows = Array.isArray(j) ? j : j && typeof j === 'object' && !j.message && !j.code ? [j] : [];
      const rpcRow = rpcRows[0];
      if (rpcRes.ok && rpcRow) {
        return NextResponse.json({ success: true, restaurant: rpcRow });
      }
      if (rpcRes.ok && !rpcRow) {
        return NextResponse.json(
          {
            error: 'RPC OK mais aucune ligne retournée (restaurant introuvable ou id invalide).',
            p_restaurant_id: restaurantId,
          },
          { status: 404 }
        );
      }
      const fnMissing =
        rpcRes.status === 404 ||
        j?.code === 'PGRST202' ||
        (typeof j?.message === 'string' &&
          (j.message.includes('Could not find the function') || j.message.includes('schema cache')));
      if (!fnMissing) {
        const msg =
          (typeof j?.message === 'string' && j.message) ||
          (typeof j?.hint === 'string' && j.hint) ||
          `Erreur RPC (HTTP ${rpcRes.status})`;
        return NextResponse.json(
          {
            error: msg,
            code: j?.code,
            hint: j?.hint,
            details: j,
            httpStatus: rpcRes.status,
            aide:
              'Si le message parle des « droits administrateur » : ton compte doit exister dans public.users avec le même id que Supabase Auth et role « admin » (minuscules ou majuscules). Sinon la RPC refuse.',
          },
          { status: rpcRes.status >= 400 && rpcRes.status < 600 ? rpcRes.status : 400 }
        );
      }
      console.warn(
        'PUT admin/restaurants: RPC admin_set_restaurant_manual_status absente (migration ?), repli PATCH.',
        rpcRes.status,
        j
      );
    }

    const updateData = {};
    if (nom !== undefined) updateData.nom = nom;
    if (adresse !== undefined) updateData.adresse = adresse;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (email !== undefined) updateData.email = email;
    if (description !== undefined) updateData.description = description;
    if (horaires !== undefined) updateData.horaires = horaires;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (commission_rate !== undefined) updateData.commission_rate = commission_rate;
    if (legal_name !== undefined) updateData.legal_name = legal_name;
    if (siret !== undefined) updateData.siret = siret;
    if (vat_number !== undefined) updateData.vat_number = vat_number;
    if (strategie_boost_reduction_pct !== undefined) updateData.strategie_boost_reduction_pct = strategie_boost_reduction_pct === '' || strategie_boost_reduction_pct === null ? null : Number(strategie_boost_reduction_pct);
    if (ferme_manuellement !== undefined) updateData.ferme_manuellement = !!ferme_manuellement;
    if (ouvert_manuellement !== undefined) updateData.ouvert_manuellement = !!ouvert_manuellement;
    if (ferme_manuellement !== undefined || ouvert_manuellement !== undefined) {
      updateData.updated_at = new Date().toISOString();
      updateData.manual_status_updated_at = new Date().toISOString();
      // Migration 20260319000012 (owner only) exige manual_status_updated_by = restaurants.user_id.
      // L’admin n’est pas le propriétaire : sans ça, Postgres lève « owner uniquement ».
      const { data: ownerRow, error: ownerErr } = await supabaseAdmin
        .from('restaurants')
        .select('user_id')
        .eq('id', restaurantId)
        .maybeSingle();
      if (ownerErr) {
        console.error('PUT admin/restaurants owner lookup:', ownerErr);
        return NextResponse.json(
          { error: 'Impossible de lire le restaurant', details: ownerErr.message },
          { status: 500 }
        );
      }
      const ownerId = ownerRow?.user_id != null ? String(ownerRow.user_id).trim() : '';
      if (!ownerId) {
        return NextResponse.json(
          {
            error:
              'Ce restaurant n’a pas de propriétaire (user_id). Corrige la fiche en base ou applique la migration owner-or-admin.',
          },
          { status: 409 }
        );
      }
      updateData.manual_status_updated_by = ownerId;
    } else {
      if (manual_status_updated_at !== undefined) updateData.manual_status_updated_at = manual_status_updated_at;
      if (manual_status_updated_by !== undefined) updateData.manual_status_updated_by = manual_status_updated_by;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    // PostgREST + JWT (aligné sur /api/partner/restaurant/[id]) pour que les triggers voient auth.uid().
    const patchPath = `/rest/v1/restaurants?id=eq.${encodeURIComponent(restaurantId)}&select=*`;
    const patchRes = await supabaseRestWithJwt(token, patchPath, {
      method: 'PATCH',
      body: updateData,
      extraHeaders: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    });

    const outRows = Array.isArray(patchRes.json) ? patchRes.json : patchRes.json ? [patchRes.json] : [];
    const updatedRestaurant = outRows[0];
    const patchFailed = !patchRes.ok || patchRes.status === 204 || !updatedRestaurant;

    if (patchFailed) {
      const j = patchRes.json || {};
      console.error('PUT admin/restaurants REST:', patchRes.status, j);
      const msg =
        j.message ||
        j.error_description ||
        (typeof j.error === 'string' ? j.error : j.error?.message) ||
        j.hint ||
        (!patchRes.ok ? `Mise à jour refusée (HTTP ${patchRes.status})` : 'Aucune ligne modifiée (id inconnu ou RLS).');
      const status =
        !patchRes.ok && (patchRes.status === 401 || patchRes.status === 403)
          ? patchRes.status
          : !patchRes.ok && patchRes.status >= 400 && patchRes.status < 500
            ? patchRes.status
            : 400;
      return NextResponse.json(
        { error: msg, details: j, httpStatus: patchRes.status, rowsReturned: outRows.length },
        { status }
      );
    }

    // Envoyer email de notification au partenaire si le statut change
    if (is_active !== undefined && is_active !== updatedRestaurant.is_active) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: is_active ? 'restaurantActivated' : 'restaurantDeactivated',
            data: {
              restaurantName: updatedRestaurant.nom,
              partnerName: [updatedRestaurant.partner?.prenom, updatedRestaurant.partner?.nom].filter(Boolean).join(' ') || null,
              reason: is_active ? 'Votre restaurant a été activé' : 'Votre restaurant a été désactivé'
            },
            recipientEmail: updatedRestaurant.partner?.email
          })
        });
      } catch (emailError) {
        console.error('Erreur envoi email notification restaurant:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      restaurant: updatedRestaurant
    });
  } catch (error) {
    console.error('Erreur mise à jour restaurant:', error);
    return NextResponse.json(
      {
        error: 'Erreur serveur',
        details: serializeForClient(error),
        name: error?.name,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/restaurants/[id] - Supprimer définitivement un restaurant
export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Utiliser un client admin pour contourner les RLS
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: 'Configuration Supabase incomplète',
          details: 'SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant. Veuillez vérifier votre fichier .env.local.'
        },
        { status: 500 }
      );
    }

    // Récupérer les infos du restaurant avant suppression
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select(`
        *,
        partner:users(id, email, nom, prenom)
      `)
      .eq('id', params.id)
      .single();

    if (restaurantError) {
      console.error('Erreur récupération restaurant (admin):', restaurantError);
      return NextResponse.json(
        {
          error: 'Impossible de récupérer le restaurant',
          details: restaurantError.message || 'Erreur inconnue lors de la récupération du restaurant'
        },
        { status: restaurantError.code === 'PGRST116' ? 404 : 500 }
      );
    }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Vérifier s'il y a des commandes en cours
    const { data: activeOrders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut')
      .eq('restaurant_id', params.id)
      .in('statut', ['en_attente', 'acceptee', 'en_preparation', 'prete']);

    if (ordersError) {
      console.error('Erreur vérification commandes:', ordersError);
    }

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json({
        error: 'Impossible de supprimer le restaurant',
        details: `Il y a ${activeOrders.length} commande(s) en cours. Veuillez d'abord traiter ces commandes.`,
        code: 'ACTIVE_ORDERS'
      }, { status: 409 });
    }

    // Vérifier le nombre total de commandes (pour information)
    const { count: totalOrdersCount } = await supabaseAdmin
      .from('commandes')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', params.id);

    // Supprimer le restaurant (cascade devrait supprimer les menus, formules, etc.)
    // Si les contraintes de clés étrangères sont en ON DELETE CASCADE
    const { error: deleteError } = await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Erreur suppression restaurant:', deleteError);
      
      // Vérifier si c'est une erreur de contrainte de clé étrangère
      if (deleteError.code === '23503' || deleteError.message?.includes('foreign key')) {
        return NextResponse.json({
          error: 'Impossible de supprimer le restaurant',
          details: 'Le restaurant est lié à d\'autres données (commandes, menus, formules, etc.). Vous pouvez le désactiver au lieu de le supprimer.',
          code: 'FOREIGN_KEY_CONSTRAINT',
          suggestion: 'Utilisez PUT pour désactiver le restaurant (is_active: false)'
        }, { status: 409 });
      }

      return NextResponse.json({
        error: 'Erreur lors de la suppression du restaurant',
        details: deleteError.message || 'Erreur inconnue',
        code: deleteError.code
      }, { status: 500 });
    }

    // Envoyer email de notification au partenaire
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'restaurantDeleted',
          data: {
            restaurantName: restaurant.nom,
            partnerName: [restaurant.partner?.prenom, restaurant.partner?.nom].filter(Boolean).join(' ') || null,
            reason: 'Votre restaurant a été supprimé définitivement par l\'administration'
          },
          recipientEmail: restaurant.partner?.email
        })
      });
    } catch (emailError) {
      console.error('Erreur envoi email suppression:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant supprimé définitivement',
      deletedRestaurant: {
        id: restaurant.id,
        nom: restaurant.nom,
        email: restaurant.email
      },
      stats: {
        totalOrders: totalOrdersCount || 0
      }
    });
  } catch (error) {
    console.error('Erreur suppression restaurant:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
} 