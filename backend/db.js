const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool(config.database);

// Test de la connexion
pool.getConnection()
  .then(connection => {
    console.log('Base de données connectée avec succès');
    connection.release();
  })
  .catch(err => {
    console.error('Erreur de connexion à la base de données:', err);
    process.exit(1);
  });

module.exports = pool; 