// Script simple pour diagnostiquer l'erreur des réclamations
console.log('🔍 Diagnostic de l\'erreur des réclamations...\n');

console.log('📋 Causes possibles de l\'erreur:');
console.log('1. ❌ Table "complaints" n\'existe pas dans Supabase');
console.log('2. ❌ Table "customer_complaint_history" n\'existe pas');
console.log('3. ❌ Table "complaint_evidence" n\'existe pas');
console.log('4. ❌ Bucket "complaint-evidence" n\'existe pas');
console.log('5. ❌ Permissions RLS mal configurées');
console.log('6. ❌ Incompatibilité de types entre tables');

console.log('\n🛠️ Solutions:');
console.log('1. 📄 Copier le contenu de create-complaints-table.sql');
console.log('2. 🔗 Aller sur https://supabase.com/dashboard');
console.log('3. 📂 Sélectionner votre projet');
console.log('4. 🗃️ Aller dans "SQL Editor"');
console.log('5. 📋 Coller le contenu du fichier SQL');
console.log('6. ▶️ Exécuter le script');

console.log('\n📁 Fichiers à utiliser:');
console.log('• create-complaints-table.sql - Tables de base de données');
console.log('• create-complaint-bucket.js - Bucket de stockage');

console.log('\n🧪 Test après création:');
console.log('1. Aller sur /admin/complaints');
console.log('2. Vérifier que la page se charge sans erreur');
console.log('3. Créer une commande de test');
console.log('4. Tester le système de réclamation');

console.log('\n❓ Si l\'erreur persiste:');
console.log('• Vérifier les logs de la console du navigateur');
console.log('• Vérifier les logs de Supabase');
console.log('• S\'assurer que l\'utilisateur a le rôle "admin"');

console.log('\n✅ Le système devrait fonctionner après ces étapes !');
