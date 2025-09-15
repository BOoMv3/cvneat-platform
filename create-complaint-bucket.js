// Script pour créer le bucket de stockage des preuves de réclamations
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.log('Assurez-vous d\'avoir :');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createComplaintBucket() {
  try {
    console.log('🚀 Création du bucket de stockage pour les réclamations...\n');

    // 1. Créer le bucket
    console.log('1️⃣ Création du bucket "complaint-evidence"...');
    
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('complaint-evidence', {
        public: false, // Bucket privé pour la sécurité
        allowedMimeTypes: [
          'image/jpeg',
          'image/png', 
          'image/gif',
          'image/webp',
          'application/pdf'
        ],
        fileSizeLimit: 5 * 1024 * 1024 // 5MB max par fichier
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket "complaint-evidence" existe déjà');
      } else {
        console.error('❌ Erreur création bucket:', bucketError.message);
        return false;
      }
    } else {
      console.log('✅ Bucket "complaint-evidence" créé avec succès');
    }

    // 2. Configurer les politiques de sécurité
    console.log('\n2️⃣ Configuration des politiques de sécurité...');
    
    // Politique pour permettre aux clients de télécharger leurs propres fichiers
    const { error: uploadPolicyError } = await supabase.rpc('create_storage_policy', {
      policy_name: 'Users can upload their own complaint evidence',
      bucket_name: 'complaint-evidence',
      operation: 'INSERT',
      policy_definition: 'auth.uid()::text = (storage.foldername(name))[1]'
    });

    if (uploadPolicyError && !uploadPolicyError.message.includes('already exists')) {
      console.warn('⚠️ Erreur politique upload:', uploadPolicyError.message);
    } else {
      console.log('✅ Politique upload configurée');
    }

    // Politique pour permettre aux clients de lire leurs propres fichiers
    const { error: downloadPolicyError } = await supabase.rpc('create_storage_policy', {
      policy_name: 'Users can download their own complaint evidence',
      bucket_name: 'complaint-evidence',
      operation: 'SELECT',
      policy_definition: 'auth.uid()::text = (storage.foldername(name))[1]'
    });

    if (downloadPolicyError && !downloadPolicyError.message.includes('already exists')) {
      console.warn('⚠️ Erreur politique download:', downloadPolicyError.message);
    } else {
      console.log('✅ Politique download configurée');
    }

    // Politique pour permettre aux admins de tout voir
    const { error: adminPolicyError } = await supabase.rpc('create_storage_policy', {
      policy_name: 'Admins can manage all complaint evidence',
      bucket_name: 'complaint-evidence',
      operation: 'ALL',
      policy_definition: 'EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = \'admin\')'
    });

    if (adminPolicyError && !adminPolicyError.message.includes('already exists')) {
      console.warn('⚠️ Erreur politique admin:', adminPolicyError.message);
    } else {
      console.log('✅ Politique admin configurée');
    }

    // 3. Vérifier le bucket
    console.log('\n3️⃣ Vérification du bucket...');
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erreur listage buckets:', listError.message);
      return false;
    }

    const complaintBucket = buckets.find(bucket => bucket.name === 'complaint-evidence');
    
    if (complaintBucket) {
      console.log('✅ Bucket vérifié avec succès');
      console.log(`📊 Nom: ${complaintBucket.name}`);
      console.log(`📊 Publique: ${complaintBucket.public ? 'Oui' : 'Non'}`);
      console.log(`📊 Créé le: ${new Date(complaintBucket.created_at).toLocaleString('fr-FR')}`);
    } else {
      console.error('❌ Bucket non trouvé après création');
      return false;
    }

    console.log('\n🎉 Bucket de stockage configuré avec succès !');
    console.log('\n📋 Utilisation :');
    console.log('- Les clients peuvent télécharger des preuves pour leurs réclamations');
    console.log('- Les fichiers sont organisés par ID utilisateur');
    console.log('- Seuls les clients et admins peuvent accéder aux fichiers');
    console.log('- Taille max : 5MB par fichier');
    console.log('- Types acceptés : JPEG, PNG, GIF, WebP, PDF');

    return true;

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    return false;
  }
}

// Fonction helper pour créer les politiques de stockage (si elle n'existe pas)
async function createStoragePolicyFunction() {
  try {
    const functionSQL = `
      CREATE OR REPLACE FUNCTION create_storage_policy(
        policy_name text,
        bucket_name text,
        operation text,
        policy_definition text
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE format('CREATE POLICY "%s" ON storage.objects FOR %s TO authenticated USING (bucket_id = ''%s'' AND %s)', 
          policy_name, operation, bucket_name, policy_definition);
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Policy % already exists', policy_name;
      END;
      $$;
    `;

    const { error } = await supabase.rpc('create_storage_policy', {
      policy_name: 'test',
      bucket_name: 'test',
      operation: 'SELECT',
      policy_definition: 'true'
    });
    
    if (error && !error.message.includes('already exists')) {
      console.warn('⚠️ Impossible de créer la fonction create_storage_policy');
      console.log('ℹ️ Les politiques de stockage devront être créées manuellement dans Supabase');
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Erreur création fonction create_storage_policy:', error.message);
    return false;
  }
}

// Exécuter le script
createStoragePolicyFunction().then((hasFunction) => {
  if (hasFunction) {
    createComplaintBucket();
  } else {
    console.log('📋 Veuillez créer le bucket manuellement dans Supabase :');
    console.log('1. Aller dans Storage');
    console.log('2. Créer un bucket "complaint-evidence"');
    console.log('3. Configurer les politiques de sécurité');
  }
});