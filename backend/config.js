require('dotenv').config();

module.exports = {
  // Configuration de la base de données
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cvneat',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  // Configuration JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'votre_secret_jwt',
    expiresIn: '24h'
  },

  // Configuration du serveur
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },

  // Configuration des emails
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  },

  // Configuration Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },

  // Configuration des uploads
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },

  commission: {
    restaurant: 0.15, // 15% de commission sur les commandes
  },
  delivery: {
    baseFee: 2.50, // Frais de base pour la livraison
    perKmFee: 0.50 // Frais par kilomètre
  }
}; 