const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Créer une intention de paiement
router.post('/create-intent', auth('client'), async (req, res) => {
  try {
    const { orderId } = req.body;

    // Récupérer les détails de la commande
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    const order = orders[0];

    // Créer l'intention de paiement Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Stripe utilise les centimes
      currency: 'eur',
      metadata: {
        orderId: order.id
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'intention de paiement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Webhook Stripe pour les événements de paiement
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Gérer les événements de paiement
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        // Mettre à jour le statut de la commande
        await db.query(
          'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
          ['en_preparation', 'payee', orderId]
        );

        // Notifier le restaurant via Socket.IO
        const io = req.app.get('io');
        io.to(`restaurant-${orderId}`).emit('new-order', { orderId });
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedOrderId = failedPayment.metadata.orderId;

        // Mettre à jour le statut de la commande
        await db.query(
          'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
          ['annulee', 'echoue', failedOrderId]
        );
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erreur webhook Stripe:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Obtenir l'historique des paiements d'un client
router.get('/history', auth('client'), async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT p.*, o.total, o.status as order_status
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE o.user_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(payments);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des paiements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router; 