import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

// Fonction pour vérifier le token et le rôle admin
const verifyAdminToken = async (request) => {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return { error: 'Token manquant', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return { error: 'Accès non autorisé', status: 403 };
    }
    return { userId: decoded.userId };
  } catch (error) {
    return { error: 'Token invalide', status: 401 };
  }
};

// GET /api/admin/orders
export async function GET(request) {
  const auth = await verifyAdminToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Récupérer toutes les commandes avec les informations du client et du restaurant
    const [orders] = await connection.execute(`
      SELECT 
        o.*,
        u.name as user_name,
        u.email as user_email,
        r.name as restaurant_name,
        r.address as restaurant_address
      FROM orders o
      JOIN users u ON o.userId = u.id
      JOIN restaurants r ON o.restaurantId = r.id
      ORDER BY o.createdAt DESC
    `);

    // Formater les données pour l'affichage
    const formattedOrders = orders.map(order => ({
      id: order.id,
      status: order.status,
      total: order.total,
      deliveryFee: order.deliveryFee,
      createdAt: order.createdAt,
      user: {
        name: order.user_name,
        email: order.user_email
      },
      restaurant: {
        name: order.restaurant_name,
        address: order.restaurant_address
      }
    }));

    await connection.end();
    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    );
  }
} 