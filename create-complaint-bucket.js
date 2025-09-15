// Script pour créer le bucket Supabase pour les preuves de réclamations
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createComplaintBucket() {
  try {
    console.log('🪣 Création du bucket pour les preuves de réclamations...');

    // Créer le bucket
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('complaint-evidence', {
        public: false,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5 * 1024 * 1024 // 5MB
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket "complaint-evidence" existe déjà');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Bucket "complaint-evidence" créé avec succès');
    }

    // Créer les politiques RLS pour le bucket
    console.log('🔒 Configuration des politiques de sécurité...');

    // Politique pour permettre l'upload aux utilisateurs authentifiés
    const { error: uploadPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'complaint-evidence',
      policy_name: 'Allow authenticated uploads',
      policy_definition: 'auth.role() = \'authenticated\'',
      policy_operation: 'INSERT'
    });

    if (uploadPolicyError && !uploadPolicyError.message.includes('already exists')) {
      console.warn('⚠️ Erreur politique upload:', uploadPolicyError.message);
    } else {
      console.log('✅ Politique d\'upload configurée');
    }

    // Politique pour permettre la lecture aux admins et aux propriétaires
    const { error: readPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'complaint-evidence',
      policy_name: 'Allow admin and owner reads',
      policy_definition: `
        auth.role() = 'authenticated' AND (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'admin'
          ) OR
          EXISTS (
            SELECT 1 FROM complaints 
            WHERE complaints.customer_id::text = auth.uid()::text
            AND complaints.id::text = (storage.foldername(name))[1]
          )
        )
      `,
      policy_operation: 'SELECT'
    });

    if (readPolicyError && !readPolicyError.message.includes('already exists')) {
      console.warn('⚠️ Erreur politique lecture:', readPolicyError.message);
    } else {
      console.log('✅ Politique de lecture configurée');
    }

    console.log('🎉 Configuration terminée !');
    console.log('');
    console.log('📋 Prochaines étapes :');
    console.log('1. Exécuter le script SQL pour créer les tables');
    console.log('2. Ajouter le lien vers /admin/complaints dans le menu admin');
    console.log('3. Tester le système avec une commande livrée');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    process.exit(1);
  }
}

// Fonction helper pour créer les politiques (si elle n'existe pas)
async function createStoragePolicyFunction() {
  try {
    const { error } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'test',
      policy_name: 'test',
      policy_definition: 'true',
      policy_operation: 'SELECT'
    });

    if (error && error.message.includes('function create_storage_policy does not exist')) {
      console.log('📝 Création de la fonction helper pour les politiques...');
      
      const functionSQL = `
        CREATE OR REPLACE FUNCTION create_storage_policy(
          bucket_name text,
          policy_name text,
          policy_definition text,
          policy_operation text
        )
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE format('
            CREATE POLICY %I ON storage.objects
            FOR %s
            TO authenticated
            USING (bucket_id = %L AND %s)
          ', policy_name, policy_operation, bucket_name, policy_definition);
        EXCEPTION
          WHEN duplicate_object THEN
            -- Politique existe déjà, ignorer
            NULL;
        END;
        $$;
      `;

      const { error: createError } = await supabase.rpc('exec_sql', { sql: functionSQL });
      
      if (createError) {
        console.warn('⚠️ Impossible de créer la fonction helper:', createError.message);
        console.log('ℹ️ Les politiques devront être créées manuellement dans Supabase');
      } else {
        console.log('✅ Fonction helper créée');
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur création fonction helper:', error.message);
  }
}

// Exécuter le script
createStoragePolicyFunction().then(() => {
  createComplaintBucket();
});
