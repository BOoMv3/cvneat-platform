/**
 * Active un partenaire à partir d'une demande acceptée :
 * compte Auth (réutilise si email déjà inscrit), rôle restaurant,
 * fiche établissement à configurer, email d'accueil.
 */

import crypto from 'crypto';
import emailService from './emailService.js';
import {
  buildPartnerAcceptanceHtml,
  buildPartnerAcceptanceText,
  PARTNER_ACCEPTANCE_SUBJECT,
} from './partner-acceptance-email.js';

function generateTempPassword() {
  const raw = crypto.randomBytes(9).toString('base64url');
  return `Cv${raw}9!`;
}

function isEmailAlreadyRegisteredError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('user already exists') ||
    err?.status === 422 ||
    err?.code === 'email_exists'
  );
}

async function findAuthUserIdByEmail(supabaseAdmin, email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  const { data: row } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .ilike('email', normalized)
    .maybeSingle();
  if (row?.id) {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(row.id);
    if (authData?.user?.id) return authData.user.id;
    return row.id;
  }

  for (let page = 1; page <= 30; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const users = data?.users || [];
    const found = users.find((u) => String(u.email || '').trim().toLowerCase() === normalized);
    if (found?.id) return found.id;
    if (users.length < 200) break;
  }
  return null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {object} request - restaurant_requests row (or equivalent payload)
 * @param {{ sendEmail?: boolean, resetPassword?: boolean }} [options]
 */
export async function activatePartnerFromRequest(supabaseAdmin, request, options = {}) {
  const sendEmail = options.sendEmail !== false;
  const resetPassword = options.resetPassword !== false;

  const email = String(request?.email || '').trim().toLowerCase();
  if (!email) throw new Error('Demande sans email');

  const nom = String(request?.nom || '').trim() || 'Restaurant partenaire';
  const description = String(request?.description || '').trim() || "Restaurant partenaire CVN'Eat";
  const adresse = String(request?.adresse || '').trim() || 'Adresse à préciser';
  const ville = String(request?.ville || '').trim() || 'Ville';
  const codePostal = String(request?.code_postal || '').trim() || '00000';
  const telephone = String(request?.telephone || '').trim() || '0000000000';

  let userId = await findAuthUserIdByEmail(supabaseAdmin, email);
  let tempPassword = null;
  let createdAuth = false;

  if (!userId) {
    tempPassword = generateTempPassword();
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'restaurant', nom, telephone },
    });

    if (createErr || !created?.user?.id) {
      if (isEmailAlreadyRegisteredError(createErr)) {
        userId = await findAuthUserIdByEmail(supabaseAdmin, email);
        if (!userId) {
          throw new Error(createErr?.message || 'Email déjà inscrit mais introuvable');
        }
      } else {
        throw new Error(createErr?.message || 'Impossible de créer le compte Auth');
      }
    } else {
      userId = created.user.id;
      createdAuth = true;
    }
  }

  if (!createdAuth && resetPassword) {
    tempPassword = generateTempPassword();
    const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      email_confirm: true,
      ban_duration: 'none',
      user_metadata: { role: 'restaurant', nom, telephone },
    });
    if (pwdErr) throw new Error(pwdErr.message);
  } else if (!createdAuth) {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
      ban_duration: 'none',
      user_metadata: { role: 'restaurant', nom, telephone },
    });
  }

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, role, email')
    .eq('id', userId)
    .maybeSingle();

  if (!existingUser) {
    const { error: insertUserErr } = await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      nom,
      prenom: '',
      telephone,
      adresse,
      code_postal: codePostal,
      ville,
      role: 'restaurant',
      points_fidelite: 0,
      historique_points: [],
      updated_at: new Date().toISOString(),
    });
    if (insertUserErr) throw new Error(insertUserErr.message);
  } else {
    const { error: updErr } = await supabaseAdmin
      .from('users')
      .update({
        role: 'restaurant',
        email,
        nom: nom || existingUser.nom,
        telephone: telephone || existingUser.telephone,
        adresse,
        code_postal: codePostal,
        ville,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (updErr) throw new Error(updErr.message);
  }

  // Fiche établissement : réutiliser si déjà liée à ce compte
  let restaurant = null;
  let createdRestaurant = false;
  const { data: existingRestaurant } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingRestaurant) {
    restaurant = existingRestaurant;
  } else {
    const insertPayload = {
      user_id: userId,
      nom,
      description,
      adresse,
      ville,
      code_postal: codePostal,
      telephone,
      email,
      type_cuisine: 'Générale',
      image_url:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop',
      // Fermé jusqu'à config (horaires + confirmation quotidienne)
      ferme_manuellement: true,
      ouvert_manuellement: false,
      horaires: {},
    };

    let { data: createdResto, error: restoErr } = await supabaseAdmin
      .from('restaurants')
      .insert(insertPayload)
      .select()
      .single();

    // Colonnes optionnelles absentes sur certains schémas
    if (restoErr && /column|schema cache/i.test(String(restoErr.message || ''))) {
      const fallback = { ...insertPayload };
      delete fallback.ferme_manuellement;
      delete fallback.ouvert_manuellement;
      delete fallback.horaires;
      const retry = await supabaseAdmin.from('restaurants').insert(fallback).select().single();
      createdResto = retry.data;
      restoErr = retry.error;
    }

    if (restoErr || !createdResto) {
      throw new Error(restoErr?.message || 'Impossible de créer la fiche établissement');
    }
    restaurant = createdResto;
    createdRestaurant = true;
  }

  if (request?.id) {
    await supabaseAdmin
      .from('restaurant_requests')
      .update({
        status: 'accepted',
        processed_at: new Date().toISOString(),
      })
      .eq('id', request.id);
  }

  let emailResult = null;
  let emailError = null;
  if (sendEmail) {
    const creds = { loginEmail: email, password: tempPassword };
    try {
      emailResult = await emailService.sendEmail({
        to: email,
        subject: PARTNER_ACCEPTANCE_SUBJECT,
        html: buildPartnerAcceptanceHtml(nom, creds),
        text: buildPartnerAcceptanceText(nom, creds),
      });
    } catch (e) {
      emailError = e?.message || String(e);
      console.error('Email partenaire accepté échoué:', emailError);
    }

    try {
      await emailService.sendEmail({
        to: 'contact@cvneat.fr',
        subject: `[COPIE] ${PARTNER_ACCEPTANCE_SUBJECT} — ${nom}`,
        html:
          buildPartnerAcceptanceHtml(nom, creds) +
          `<p style="padding:16px;font-size:12px;color:#6b7280;">Copie admin — destinataire: ${email}</p>`,
        text: buildPartnerAcceptanceText(nom, creds) + `\n\nCopie admin — destinataire: ${email}`,
      });
    } catch (e) {
      console.warn('Copie admin email partenaire échec:', e?.message || e);
    }
  }

  return {
    userId,
    email,
    tempPassword,
    createdAuth,
    createdRestaurant,
    restaurant,
    emailMessageId: emailResult?.messageId || null,
    emailError,
  };
}
