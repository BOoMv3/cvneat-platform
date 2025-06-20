const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Obtenir les commandes disponibles pour la livraison
router.get('/available-orders', auth('delivery'), async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, r.nom as restaurant_nom, r.adresse as restaurant_adresse
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.status = 'pret_a_livrer'
      AND o.delivery_id IS NULL
      ORDER BY o.created_at ASC
    `);
    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes disponibles:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Accepter une commande pour la livraison
router.post('/accept-order/:orderId', auth('delivery'), async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const deliveryId = req.user.id;

    // Vérifier si la commande est toujours disponible
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND status = ? AND delivery_id IS NULL',
      [orderId, 'pret_a_livrer']
    );

    if (orders.length === 0) {
      return res.status(400).json({ message: 'Commande non disponible' });
    }

    // Mettre à jour la commande
    await db.query(
      'UPDATE orders SET delivery_id = ?, status = ? WHERE id = ?',
      [deliveryId, 'en_livraison', orderId]
    );

    // Notifier le client et le restaurant via Socket.IO
    const io = req.app.get('io');
    io.to(`order-${orderId}`).emit('order-accepted', {
      orderId,
      deliveryId
    });

    res.json({ message: 'Commande acceptée avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour le statut de livraison
router.put('/order/:orderId/status', auth('delivery'), async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.orderId;
    const deliveryId = req.user.id;

    // Vérifier que la commande est bien assignée au livreur
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND delivery_id = ?',
      [orderId, deliveryId]
    );

    if (orders.length === 0) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Mettre à jour le statut
    await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );

    // Si la livraison est terminée, mettre à jour les statistiques du livreur
    if (status === 'livree') {
      await db.query(`
        UPDATE delivery_stats 
        SET total_deliveries = total_deliveries + 1,
            total_earnings = total_earnings + ?
        WHERE delivery_id = ?
      `, [orders[0].delivery_fee, deliveryId]);
    }

    // Notifier le client et le restaurant via Socket.IO
    const io = req.app.get('io');
    io.to(`order-${orderId}`).emit('delivery-status-updated', {
      orderId,
      status
    });

    res.json({ message: 'Statut de livraison mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les statistiques du livreur
router.get('/stats', auth('delivery'), async (req, res) => {
  try {
    const [stats] = await db.query(
      'SELECT * FROM delivery_stats WHERE delivery_id = ?',
      [req.user.id]
    );

    if (stats.length === 0) {
      // Créer les statistiques si elles n'existent pas
      await db.query(
        'INSERT INTO delivery_stats (delivery_id) VALUES (?)',
        [req.user.id]
      );
      return res.json({
        total_deliveries: 0,
        total_earnings: 0,
        rating: 0
      });
    }

    res.json(stats[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour la disponibilité du livreur
router.put('/availability', auth('delivery'), async (req, res) => {
  try {
    const { is_available } = req.body;
    await db.query(
      'UPDATE delivery_stats SET is_available = ? WHERE delivery_id = ?',
      [is_available, req.user.id]
    );
    res.json({ message: 'Disponibilité mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la disponibilité:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router; 