const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY non définie');
  console.log('💡 Ajoutez votre clé service_role dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStorageBucket() {
  try {
    console.log('🚀 Création du bucket menu-images...');
    
    // Créer le bucket pour les images de menu
    const { data: bucketData, error: bucketError } = await supabase.storage
      .createBucket('menu-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket menu-images existe déjà');
      } else {
        console.error('❌ Erreur création bucket:', bucketError);
        return;
      }
    } else {
      console.log('✅ Bucket menu-images créé avec succès');
    }

    // Configurer les politiques RLS pour le bucket
    console.log('🔒 Configuration des politiques RLS...');
    
    // Politique pour permettre la lecture publique des images
    const { error: readPolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Images de menu publiques" ON storage.objects
        FOR SELECT USING (bucket_id = 'menu-images');
      `
    });

    if (readPolicyError && !readPolicyError.message.includes('already exists')) {
      console.log('⚠️ Politique de lecture déjà configurée ou erreur:', readPolicyError.message);
    } else {
      console.log('✅ Politique de lecture configurée');
    }

    // Politique pour permettre l'upload aux utilisateurs authentifiés avec rôle restaurant
    const { error: insertPolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Upload images menu restaurant" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'menu-images' 
          AND auth.role() = 'authenticated'
        );
      `
    });

    if (insertPolicyError && !insertPolicyError.message.includes('already exists')) {
      console.log('⚠️ Politique d\'upload déjà configurée ou erreur:', insertPolicyError.message);
    } else {
      console.log('✅ Politique d\'upload configurée');
    }

    console.log('🎉 Configuration du stockage terminée !');
    console.log('📁 Bucket: menu-images');
    console.log('🔓 Accès: Lecture publique, Upload authentifié');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createStorageBucket(); 