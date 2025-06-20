const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const config = require('./config');
const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const deliveryRoutes = require('./routes/delivery');
const adminRoutes = require('./routes/admin');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configuration de Socket.IO avec CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? "http://localhost:3000" : process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: false // Désactivé pour permettre les images
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? "http://localhost:3000" : process.env.FRONTEND_URL,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin', adminRoutes);

// Gestion des erreurs 404
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erreur serveur',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Nouvelle connexion socket:', socket.id);

  // Authentification du socket
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      console.log(`Socket authentifié: ${socket.id} (${socket.userRole})`);
    } catch (error) {
      console.error('Erreur d\'authentification socket:', error);
      socket.disconnect();
    }
  });

  // Rejoindre les salles appropriées
  socket.on('join-restaurant', (restaurantId) => {
    if (socket.userRole === 'partner' || socket.userRole === 'admin') {
      socket.join(`restaurant-${restaurantId}`);
      console.log(`Socket ${socket.id} a rejoint restaurant-${restaurantId}`);
    }
  });

  socket.on('join-delivery', (deliveryId) => {
    if (socket.userRole === 'delivery' || socket.userRole === 'admin') {
      socket.join(`delivery-${deliveryId}`);
      console.log(`Socket ${socket.id} a rejoint delivery-${deliveryId}`);
    }
  });

  socket.on('join-admin', () => {
    if (socket.userRole === 'admin') {
      socket.join('admin');
      console.log(`Socket ${socket.id} a rejoint la salle admin`);
    }
  });

  // Gestion de la déconnexion
  socket.on('disconnect', () => {
    console.log('Déconnexion socket:', socket.id);
  });
});

// Export pour les routes
app.set('io', io);

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV}`);
}); 