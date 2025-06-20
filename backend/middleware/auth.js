const jwt = require('jsonwebtoken');
const db = require('../db');

const auth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Vérifier le token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token manquant' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Token invalide' });
      }

      // Vérifier la validité du token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded) {
        return res.status(401).json({ message: 'Token invalide' });
      }

      // Vérifier si l'utilisateur existe toujours
      const [users] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
      if (users.length === 0) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }

      const user = users[0];

      // Vérifier les rôles si spécifiés
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }

      // Ajouter l'utilisateur à la requête
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expiré' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token invalide' });
      }
      console.error('Erreur d\'authentification:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  };
};

module.exports = auth; 