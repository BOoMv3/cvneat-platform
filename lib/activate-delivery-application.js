/**
 * Active un compte livreur à partir d'une candidature approuvée :
 * rôle delivery, mot de passe temporaire, email de confirmation.
 */

import crypto from 'crypto';
import emailService from './emailService.js';
import {
  buildDeliveryAcceptanceHtml,
  buildDeliveryAcceptanceText,
  DELIVERY_ACCEPTANCE_SUBJECT,
} from './delivery-acceptance-email.js';

function generateTempPassword() {
  const raw = crypto.randomBytes(9).toString('base64url');
  return `Cv${raw}9!`;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {object} application - ligne delivery_applications
 * @param {{ sendEmail?: boolean, resetPassword?: boolean }} [options]
 */
export async function activateDeliveryFromApplication(supabaseAdmin, application, options = {}) {
  const sendEmail = options.sendEmail !== false;
  const resetPassword = options.resetPassword !== false;

  if (!application?.email) {
    throw new Error('Candidature sans email');
  }

  const email = String(application.email).trim().toLowerCase();
  const prenom = (application.prenom || '').trim() || 'Livreur';
  const nom = (application.nom || '').trim() || '';
  const phone = (application.phone || '').trim() || null;

  let userId = application.user_id || null;
  let userRow = null;

  if (userId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, email, role, prenom, nom, telephone')
      .eq('id', userId)
      .maybeSingle();
    userRow = data;
  }

  if (!userRow) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, email, role, prenom, nom, telephone')
      .eq('email', email)
      .maybeSingle();
    userRow = data;
    userId = data?.id || null;
  }

  let tempPassword = null;
  let createdAuth = false;

  if (!userId) {
    tempPassword = generateTempPassword();
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'delivery', prenom, nom },
    });
    if (createErr || !created?.user?.id) {
      throw new Error(createErr?.message || 'Impossible de créer le compte Auth');
    }
    userId = created.user.id;
    createdAuth = true;

    const { error: upsertErr } = await supabaseAdmin.from('users').upsert(
      {
        id: userId,
        email,
        role: 'delivery',
        prenom,
        nom,
        telephone: phone || '0000000000',
        adresse: application.address || 'Adresse à préciser',
        code_postal: application.postal_code || '00000',
        ville: application.city || 'Ville',
        points_fidelite: 0,
        historique_points: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (upsertErr) throw new Error(upsertErr.message);
  } else {
    if (resetPassword) {
      tempPassword = generateTempPassword();
      const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
        ban_duration: 'none',
        user_metadata: {
          role: 'delivery',
          prenom: prenom || userRow?.prenom,
          nom: nom || userRow?.nom,
        },
        app_metadata: {
          suspended_until: null,
          suspension_reason: null,
          suspension_penalty_eur: null,
        },
      });
      if (pwdErr) throw new Error(pwdErr.message);
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
        ban_duration: 'none',
        user_metadata: {
          role: 'delivery',
          prenom: prenom || userRow?.prenom,
          nom: nom || userRow?.nom,
        },
      });
    }

    const updatePayload = {
      role: 'delivery',
      prenom: prenom || userRow?.prenom || null,
      nom: nom || userRow?.nom || null,
      updated_at: new Date().toISOString(),
    };
    if (phone) updatePayload.telephone = phone;
    if (application.address) updatePayload.adresse = application.address;
    if (application.city) updatePayload.ville = application.city;
    if (application.postal_code) updatePayload.code_postal = application.postal_code;

    // Lever une éventuelle suspension users (best-effort)
    updatePayload.suspended_until = null;
    updatePayload.suspension_reason = null;
    updatePayload.suspension_penalty_eur = null;

    const { error: updErr } = await supabaseAdmin.from('users').update(updatePayload).eq('id', userId);
    if (updErr) {
      // Colonnes suspension absentes ?
      const { error: updErr2 } = await supabaseAdmin
        .from('users')
        .update({
          role: 'delivery',
          prenom: updatePayload.prenom,
          nom: updatePayload.nom,
          telephone: updatePayload.telephone,
          adresse: updatePayload.adresse,
          ville: updatePayload.ville,
          code_postal: updatePayload.code_postal,
          updated_at: updatePayload.updated_at,
        })
        .eq('id', userId);
      if (updErr2) throw new Error(updErr2.message);
    }
  }

  if (application.id) {
    await supabaseAdmin
      .from('delivery_applications')
      .update({
        status: 'approved',
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id);
  }

  let emailResult = null;
  let emailError = null;
  if (sendEmail) {
    const creds = { loginEmail: email, password: tempPassword };
    try {
      emailResult = await emailService.sendEmail({
        to: email,
        subject: DELIVERY_ACCEPTANCE_SUBJECT,
        html: buildDeliveryAcceptanceHtml(prenom, creds),
        text: buildDeliveryAcceptanceText(prenom, creds),
      });
    } catch (e) {
      emailError = e?.message || String(e);
      console.error('Email candidature acceptée échoué:', emailError);
    }

    try {
      await emailService.sendEmail({
        to: 'contact@cvneat.fr',
        subject: `[COPIE] ${DELIVERY_ACCEPTANCE_SUBJECT} — ${prenom} ${nom}`.trim(),
        html:
          buildDeliveryAcceptanceHtml(prenom, creds) +
          `<p style="padding:16px;font-size:12px;color:#6b7280;">Copie admin — destinataire: ${email}</p>`,
        text: buildDeliveryAcceptanceText(prenom, creds) + `\n\nCopie admin — destinataire: ${email}`,
      });
    } catch (e) {
      console.warn('Copie admin email échec:', e?.message || e);
    }
  }

  return {
    userId,
    email,
    prenom,
    nom,
    tempPassword,
    createdAuth,
    emailMessageId: emailResult?.messageId || null,
    emailError,
  };
}
