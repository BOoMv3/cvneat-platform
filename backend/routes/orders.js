const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Obtenir toutes les commandes (admin uniquement)
router.get('/', auth('admin'), async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, r.nom as restaurant_nom, u.email as client_email
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les commandes d'un restaurant (partenaire uniquement)
router.get('/restaurant/:restaurantId', auth('partner'), async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, u.email as client_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.restaurant_id = ?
      ORDER BY o.created_at DESC
    `, [req.params.restaurantId]);
    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les commandes d'un client
router.get('/my-orders', auth('client'), async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, r.nom as restaurant_nom
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle commande
router.post('/', auth('client'), async (req, res) => {
  try {
    const { restaurant_id, items, adresse_livraison, notes } = req.body;
    const userId = req.user.id;

    // Calculer le total
    let total = 0;
    for (const item of items) {
      const [plats] = await db.query(
        'SELECT prix FROM plats WHERE id = ?',
        [item.plat_id]
      );
      if (plats.length === 0) {
        return res.status(400).json({ message: 'Plat non trouvé' });
      }
      total += plats[0].prix * item.quantite;
    }

    // Ajouter les frais de livraison
    total += 2.50; // Frais de base

    // Créer la commande
    const [result] = await db.query(`
      INSERT INTO orders (
        user_id, restaurant_id, total, status,
        adresse_livraison, notes
      ) VALUES (?, ?, ?, 'en_attente', ?, ?)
    `, [userId, restaurant_id, total, adresse_livraison, notes]);

    // Ajouter les items de la commande
    for (const item of items) {
      await db.query(`
        INSERT INTO order_items (
          order_id, plat_id, quantite, prix_unitaire
        ) VALUES (?, ?, ?, ?)
      `, [result.insertId, item.plat_id, item.quantite, item.prix]);
    }

    res.status(201).json({
      message: 'Commande créée avec succès',
      orderId: result.insertId
    });
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour le statut d'une commande
router.put('/:id/status', auth('partner'), async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    // Vérifier que la commande appartient au restaurant du partenaire
    const [orders] = await db.query(`
      SELECT o.* FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.id = ? AND r.user_id = ?
    `, [orderId, req.user.id]);

    if (orders.length === 0) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );

    // Notifier le client via Socket.IO
    const io = req.app.get('io');
    io.to(`order-${orderId}`).emit('order-status-updated', {
      orderId,
      status
    });

    res.json({ message: 'Statut de la commande mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router; 