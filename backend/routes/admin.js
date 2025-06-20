const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Obtenir les statistiques globales
router.get('/stats', auth('admin'), async (req, res) => {
  try {
    // Nombre total de commandes
    const [totalOrders] = await db.query('SELECT COUNT(*) as count FROM orders');
    
    // Chiffre d'affaires total
    const [totalRevenue] = await db.query('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != "annulee"');
    
    // Nombre de restaurants actifs
    const [activeRestaurants] = await db.query('SELECT COUNT(*) as count FROM restaurants WHERE status = "active"');
    
    // Nombre de livreurs actifs
    const [activeDelivery] = await db.query('SELECT COUNT(*) as count FROM delivery_stats WHERE is_available = true');

    res.json({
      totalOrders: totalOrders[0].count,
      totalRevenue: totalRevenue[0].total,
      activeRestaurants: activeRestaurants[0].count,
      activeDelivery: activeDelivery[0].count
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir tous les utilisateurs
router.get('/users', auth('admin'), async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, email, role, nom, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour le rôle d'un utilisateur
router.put('/users/:id/role', auth('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    await db.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );

    res.json({ message: 'Rôle mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les statistiques des restaurants
router.get('/restaurants/stats', auth('admin'), async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        r.id,
        r.nom,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        AVG(o.total) as average_order_value
      FROM restaurants r
      LEFT JOIN orders o ON r.id = o.restaurant_id
      WHERE r.status = 'active'
      GROUP BY r.id, r.nom
      ORDER BY total_revenue DESC
    `);
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des restaurants:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les statistiques des livreurs
router.get('/delivery/stats', auth('admin'), async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        u.id,
        u.nom,
        ds.total_deliveries,
        ds.total_earnings,
        ds.rating,
        ds.is_available
      FROM users u
      JOIN delivery_stats ds ON u.id = ds.delivery_id
      WHERE u.role = 'delivery'
      ORDER BY ds.total_deliveries DESC
    `);
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des livreurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Gérer les commissions
router.put('/commission', auth('admin'), async (req, res) => {
  try {
    const { restaurant_commission, delivery_base_fee, delivery_per_km_fee } = req.body;

    // Mettre à jour les configurations
    await db.query(`
      UPDATE config 
      SET 
        restaurant_commission = ?,
        delivery_base_fee = ?,
        delivery_per_km_fee = ?
      WHERE id = 1
    `, [restaurant_commission, delivery_base_fee, delivery_per_km_fee]);

    res.json({ message: 'Commissions mises à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des commissions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router; 