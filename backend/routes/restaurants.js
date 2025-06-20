const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const bcrypt = require('bcrypt');

// Obtenir tous les restaurants
router.get('/', async (req, res) => {
  try {
    const [restaurants] = await db.query(`
      SELECT r.*, u.email, u.telephone 
      FROM restaurants r 
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'active'
    `);
    res.json(restaurants);
  } catch (error) {
    console.error('Erreur lors de la récupération des restaurants:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir un restaurant par ID
router.get('/:id', async (req, res) => {
  try {
    const [restaurants] = await db.query(`
      SELECT r.*, u.email, u.telephone 
      FROM restaurants r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.id = ?
    `, [req.params.id]);

    if (restaurants.length === 0) {
      return res.status(404).json({ message: 'Restaurant non trouvé' });
    }

    res.json(restaurants[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du restaurant:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer un nouveau restaurant
router.post('/', auth('partner'), upload.single('image'), handleUploadError, async (req, res) => {
  try {
    const { nom, description, adresse, type_cuisine } = req.body;
    const userId = req.user.id;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(`
      INSERT INTO restaurants (user_id, nom, description, adresse, type_cuisine, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, nom, description, adresse, type_cuisine, imageUrl]);

    res.status(201).json({
      message: 'Restaurant créé avec succès',
      restaurantId: result.insertId
    });
  } catch (error) {
    console.error('Erreur lors de la création du restaurant:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un restaurant
router.put('/:id', auth('partner'), upload.single('image'), handleUploadError, async (req, res) => {
  try {
    const { nom, description, adresse, type_cuisine } = req.body;
    const restaurantId = req.params.id;
    const userId = req.user.id;

    // Vérifier que le restaurant appartient à l'utilisateur
    const [restaurants] = await db.query(
      'SELECT * FROM restaurants WHERE id = ? AND user_id = ?',
      [restaurantId, userId]
    );

    if (restaurants.length === 0) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    let imageUrl = restaurants[0].image_url;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    await db.query(`
      UPDATE restaurants 
      SET nom = ?, description = ?, adresse = ?, type_cuisine = ?, image_url = ?
      WHERE id = ?
    `, [nom, description, adresse, type_cuisine, imageUrl, restaurantId]);

    res.json({ message: 'Restaurant mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du restaurant:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Gérer le menu (ajouter/modifier/supprimer des plats)
router.post('/:id/menu', auth('partner'), async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const { action, plat } = req.body;

    // Vérifier si le restaurant appartient au partenaire
    const [restaurants] = await db.query(
      'SELECT id FROM restaurants WHERE id = ? AND user_id = ?',
      [restaurantId, req.user.id]
    );

    if (restaurants.length === 0) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    switch (action) {
      case 'add':
        const [result] = await db.query(`
          INSERT INTO plats (restaurant_id, category_id, nom, description, prix, image_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          restaurantId,
          plat.category_id,
          plat.nom,
          plat.description,
          plat.prix,
          plat.image_url
        ]);
        res.status(201).json({
          message: 'Plat ajouté avec succès',
          platId: result.insertId
        });
        break;

      case 'update':
        await db.query(`
          UPDATE plats
          SET nom = ?, description = ?, prix = ?, category_id = ?, image_url = ?
          WHERE id = ? AND restaurant_id = ?
        `, [
          plat.nom,
          plat.description,
          plat.prix,
          plat.category_id,
          plat.image_url,
          plat.id,
          restaurantId
        ]);
        res.json({ message: 'Plat mis à jour avec succès' });
        break;

      case 'delete':
        await db.query(
          'DELETE FROM plats WHERE id = ? AND restaurant_id = ?',
          [plat.id, restaurantId]
        );
        res.json({ message: 'Plat supprimé avec succès' });
        break;

      default:
        res.status(400).json({ message: 'Action non valide' });
    }
  } catch (error) {
    console.error('Erreur lors de la gestion du menu:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Soumettre une demande de restaurant
router.post('/request', async (req, res) => {
  try {
    const { nom, email, telephone, adresse, description } = req.body;

    // Vérifier si une demande existe déjà avec cet email
    const [existingRequests] = await db.query(
      'SELECT * FROM restaurant_requests WHERE email = ?',
      [email]
    );

    if (existingRequests.length > 0) {
      return res.status(400).json({ message: 'Une demande existe déjà avec cet email' });
    }

    const [result] = await db.query(`
      INSERT INTO restaurant_requests (nom, email, telephone, adresse, description)
      VALUES (?, ?, ?, ?, ?)
    `, [nom, email, telephone, adresse, description]);

    res.status(201).json({
      message: 'Demande soumise avec succès',
      requestId: result.insertId
    });
  } catch (error) {
    console.error('Erreur lors de la soumission de la demande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir toutes les demandes de restaurant (admin uniquement)
router.get('/requests', auth('admin'), async (req, res) => {
  try {
    const [requests] = await db.query(
      'SELECT * FROM restaurant_requests ORDER BY created_at DESC'
    );
    res.json(requests);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour le statut d'une demande (admin uniquement)
router.put('/requests/:id', auth('admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const requestId = req.params.id;

    // Mettre à jour le statut de la demande
    await db.query(
      'UPDATE restaurant_requests SET status = ?, notes = ? WHERE id = ?',
      [status, notes, requestId]
    );

    // Si la demande est approuvée, créer un compte partenaire
    if (status === 'approuvee') {
      const [request] = await db.query(
        'SELECT * FROM restaurant_requests WHERE id = ?',
        [requestId]
      );

      if (request.length > 0) {
        const { email, nom } = request[0];
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Créer l'utilisateur partenaire
        const [userResult] = await db.query(`
          INSERT INTO users (email, password, role, nom)
          VALUES (?, ?, 'partner', ?)
        `, [email, hashedPassword, nom]);

        // TODO: Envoyer un email avec les identifiants temporaires
        console.log('Identifiants temporaires:', { email, password: tempPassword });
      }
    }

    res.json({ message: 'Statut de la demande mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router; 