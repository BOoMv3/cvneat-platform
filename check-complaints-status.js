// Script de diagnostic pour vérifier l'état des réclamations
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Défini' : '❌ Manquant');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Défini' : '❌ Manquant');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkComplaintsStatus() {
  try {
    console.log('🔍 Diagnostic du système de réclamations...\n');

    // 1. Vérifier si la table complaints existe
    console.log('1️⃣ Vérification de la table complaints...');
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('count', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('relation "complaints" does not exist')) {
          console.log('❌ Table "complaints" n\'existe pas');
          console.log('📋 Action requise: Exécuter le script SQL create-complaints-table.sql');
        } else {
          console.log('❌ Erreur table complaints:', error.message);
        }
      } else {
        console.log('✅ Table "complaints" existe');
        console.log(`📊 Nombre de réclamations: ${data?.length || 0}`);
      }
    } catch (err) {
      console.log('❌ Erreur accès table complaints:', err.message);
    }

    // 2. Vérifier si la table customer_complaint_history existe
    console.log('\n2️⃣ Vérification de la table customer_complaint_history...');
    try {
      const { data, error } = await supabase
        .from('customer_complaint_history')
        .select('count', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('relation "customer_complaint_history" does not exist')) {
          console.log('❌ Table "customer_complaint_history" n\'existe pas');
        } else {
          console.log('❌ Erreur table customer_complaint_history:', error.message);
        }
      } else {
        console.log('✅ Table "customer_complaint_history" existe');
        console.log(`📊 Nombre d\'entrées: ${data?.length || 0}`);
      }
    } catch (err) {
      console.log('❌ Erreur accès table customer_complaint_history:', err.message);
    }

    // 3. Vérifier si la table complaint_evidence existe
    console.log('\n3️⃣ Vérification de la table complaint_evidence...');
    try {
      const { data, error } = await supabase
        .from('complaint_evidence')
        .select('count', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('relation "complaint_evidence" does not exist')) {
          console.log('❌ Table "complaint_evidence" n\'existe pas');
        } else {
          console.log('❌ Erreur table complaint_evidence:', error.message);
        }
      } else {
        console.log('✅ Table "complaint_evidence" existe');
        console.log(`📊 Nombre d\'entrées: ${data?.length || 0}`);
      }
    } catch (err) {
      console.log('❌ Erreur accès table complaint_evidence:', err.message);
    }

    // 4. Vérifier si la table orders existe et sa structure
    console.log('\n4️⃣ Vérification de la table orders...');
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at', { limit: 1 });

      if (error) {
        console.log('❌ Erreur table orders:', error.message);
      } else {
        console.log('✅ Table "orders" existe');
        if (data && data.length > 0) {
          const order = data[0];
          console.log(`📊 Type ID: ${typeof order.id}`);
          console.log(`📊 Exemple ID: ${order.id}`);
          console.log(`📊 Exemple created_at: ${order.created_at}`);
        }
      }
    } catch (err) {
      console.log('❌ Erreur accès table orders:', err.message);
    }

    // 5. Vérifier si la table restaurants existe
    console.log('\n5️⃣ Vérification de la table restaurants...');
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.log('❌ Erreur table restaurants:', error.message);
      } else {
        console.log('✅ Table "restaurants" existe');
        console.log(`📊 Nombre de restaurants: ${data?.length || 0}`);
      }
    } catch (err) {
      console.log('❌ Erreur accès table restaurants:', err.message);
    }

    // 6. Vérifier si la table users existe
    console.log('\n6️⃣ Vérification de la table users...');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.log('❌ Erreur table users:', error.message);
      } else {
        console.log('✅ Table "users" existe');
        console.log(`📊 Nombre d\'utilisateurs: ${data?.length || 0}`);
      }
    } catch (err) {
      console.log('❌ Erreur accès table users:', err.message);
    }

    // 7. Vérifier le bucket de stockage
    console.log('\n7️⃣ Vérification du bucket complaint-evidence...');
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.log('❌ Erreur listage buckets:', error.message);
      } else {
        const complaintBucket = data.find(bucket => bucket.name === 'complaint-evidence');
        if (complaintBucket) {
          console.log('✅ Bucket "complaint-evidence" existe');
          console.log(`📊 Publique: ${complaintBucket.public}`);
        } else {
          console.log('❌ Bucket "complaint-evidence" n\'existe pas');
          console.log('📋 Action requise: Exécuter node create-complaint-bucket.js');
        }
      }
    } catch (err) {
      console.log('❌ Erreur vérification bucket:', err.message);
    }

    console.log('\n📋 Résumé des actions requises:');
    console.log('1. Si des tables manquent: Exécuter create-complaints-table.sql dans Supabase');
    console.log('2. Si le bucket manque: Exécuter node create-complaint-bucket.js');
    console.log('3. Vérifier les permissions RLS dans Supabase');
    console.log('4. Tester avec une commande livrée');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkComplaintsStatus();
