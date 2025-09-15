// Script pour créer le système de réclamations complet
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createComplaintsSystem() {
  try {
    console.log('🚀 Création du système de réclamations...\n');

    // 1. Lire le fichier SQL
    console.log('1️⃣ Lecture du fichier SQL...');
    const sqlFilePath = path.join(__dirname, 'create-complaints-table.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ Fichier create-complaints-table.sql non trouvé');
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ Fichier SQL lu');

    // 2. Diviser le SQL en instructions individuelles
    console.log('2️⃣ Exécution des instructions SQL...');
    
    // Supprimer les commentaires et diviser par point-virgule
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`📝 Exécution: ${statement.substring(0, 50)}...`);
          
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            if (error.message.includes('already exists') || 
                error.message.includes('does not exist') ||
                error.message.includes('relation') && error.message.includes('already exists')) {
              console.log(`⚠️ Déjà existant: ${error.message}`);
            } else {
              console.log(`❌ Erreur: ${error.message}`);
              errorCount++;
            }
          } else {
            console.log('✅ Succès');
            successCount++;
          }
        } catch (err) {
          console.log(`❌ Exception: ${err.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Résultat: ${successCount} succès, ${errorCount} erreurs`);

    // 3. Créer le bucket de stockage
    console.log('\n3️⃣ Création du bucket de stockage...');
    try {
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
          console.log('❌ Erreur bucket:', bucketError.message);
        }
      } else {
        console.log('✅ Bucket "complaint-evidence" créé');
      }
    } catch (err) {
      console.log('❌ Erreur création bucket:', err.message);
    }

    // 4. Vérifier le résultat
    console.log('\n4️⃣ Vérification finale...');
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.log('❌ Table complaints non accessible:', error.message);
      } else {
        console.log('✅ Système de réclamations opérationnel');
        console.log('🎉 Prêt à utiliser !');
      }
    } catch (err) {
      console.log('❌ Erreur vérification finale:', err.message);
    }

    console.log('\n📋 Prochaines étapes:');
    console.log('1. Aller sur /admin/complaints pour gérer les réclamations');
    console.log('2. Tester avec une commande livrée');
    console.log('3. Vérifier les permissions RLS si nécessaire');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Fonction helper pour exécuter du SQL (si elle n'existe pas)
async function createExecSqlFunction() {
  try {
    const functionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE EXCEPTION 'SQL Error: %', SQLERRM;
      END;
      $$;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
    
    if (error && !error.message.includes('already exists')) {
      console.warn('⚠️ Impossible de créer la fonction exec_sql:', error.message);
      console.log('ℹ️ Exécutez manuellement le SQL dans Supabase');
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Erreur création fonction exec_sql:', error.message);
    return false;
  }
}

// Exécuter le script
createExecSqlFunction().then((hasFunction) => {
  if (hasFunction) {
    createComplaintsSystem();
  } else {
    console.log('📋 Veuillez exécuter manuellement le contenu de create-complaints-table.sql dans Supabase');
  }
});
