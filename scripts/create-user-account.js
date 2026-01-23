/**
 * Crée (ou met à jour) un compte utilisateur dans Supabase Auth + la table `users`.
 *
 * Usage:
 *   node scripts/create-user-account.js <email> <password> [role=user] [firstName] [lastName]
 *
 * Exemples:
 *   node scripts/create-user-account.js apple.review@cvneat.fr 'MotDePasseFort' user Apple Review
 *   node scripts/create-user-account.js adam@cvneat.fr 'adamlivreur1225' delivery Adam ""
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createOrUpdateAuthUser(email, password, role, firstName, lastName) {
  // Tentative création
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      prenom: firstName || '',
      nom: lastName || '',
      role,
    },
  });

  if (!createError && created?.user?.id) {
    return created.user;
  }

  // Si existe déjà, on met à jour
  const msg = (createError?.message || '').toLowerCase();
  const alreadyExists = msg.includes('already') && msg.includes('exists');
  if (!alreadyExists) {
    throw new Error(createError?.message || 'Erreur création user Supabase Auth');
  }

  // Retrouver l'utilisateur existant par email
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listError) throw new Error(listError.message || 'Erreur listUsers');

  const existing = (listData?.users || []).find((u) => (u?.email || '').toLowerCase() === email.toLowerCase());
  if (!existing?.id) throw new Error('Utilisateur existant non trouvé (listUsers)');

  const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: {
      prenom: firstName || '',
      nom: lastName || '',
      role,
    },
  });
  if (updateError) throw new Error(updateError.message || 'Erreur updateUserById');

  return updated?.user || { id: existing.id, email };
}

async function upsertUsersRow(userId, email, role, firstName, lastName) {
  const payload = {
    id: userId,
    email,
    prenom: firstName || '',
    nom: lastName || '',
    role,
    // Champs requis (defaults)
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
  };

  const { error } = await supabaseAdmin.from('users').upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(error.message || 'Erreur upsert table users');
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const role = (process.argv[4] || 'user').toString().trim().toLowerCase();
  const firstName = process.argv[5] || '';
  const lastName = process.argv[6] || '';

  if (!email || !password) {
    console.error('Usage: node scripts/create-user-account.js <email> <password> [role=user] [firstName] [lastName]');
    process.exit(1);
  }

  console.log(`🔧 Création / MAJ compte: ${email} (role=${role})`);

  const authUser = await createOrUpdateAuthUser(email, password, role, firstName, lastName);
  console.log(`✅ Supabase Auth OK: ${authUser.id}`);

  await upsertUsersRow(authUser.id, email, role, firstName, lastName);
  console.log('✅ Table users OK');

  console.log(`🎉 Compte prêt: ${email}`);
}

main().catch((err) => {
  console.error('❌ Erreur:', err?.message || err);
  process.exit(1);
});


