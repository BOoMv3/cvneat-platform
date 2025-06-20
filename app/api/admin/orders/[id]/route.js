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

// GET /api/admin/orders/[id]
export async function GET(request, { params }) {
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

    // Récupérer les détails de la commande
    const [orders] = await connection.execute(`
      SELECT 
        o.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        r.name as restaurant_name,
        r.address as restaurant_address,
        r.phone as restaurant_phone
      FROM orders o
      JOIN users u ON o.userId = u.id
      JOIN restaurants r ON o.restaurantId = r.id
      WHERE o.id = ?
    `, [params.id]);

    if (orders.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer les articles de la commande
    const [items] = await connection.execute(`
      SELECT 
        oi.*,
        mi.name,
        mi.price
      FROM order_items oi
      JOIN menu_items mi ON oi.menuItemId = mi.id
      WHERE oi.orderId = ?
    `, [params.id]);

    // Récupérer l'adresse de livraison
    const [addresses] = await connection.execute(`
      SELECT *
      FROM addresses
      WHERE id = ?
    `, [orders[0].deliveryAddressId]);

    // Formater les données pour l'affichage
    const order = {
      id: orders[0].id,
      status: orders[0].status,
      total: orders[0].total,
      deliveryFee: orders[0].deliveryFee,
      createdAt: orders[0].createdAt,
      user: {
        name: orders[0].user_name,
        email: orders[0].user_email,
        phone: orders[0].user_phone
      },
      restaurant: {
        name: orders[0].restaurant_name,
        address: orders[0].restaurant_address,
        phone: orders[0].restaurant_phone
      },
      deliveryAddress: addresses[0],
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    };

    await connection.end();
    return NextResponse.json(order);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la commande' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/orders/[id]
export async function PUT(request, { params }) {
  const auth = await verifyAdminToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Le statut est requis' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Vérifier si la commande existe
    const [orders] = await connection.execute(
      'SELECT id FROM orders WHERE id = ?',
      [params.id]
    );

    if (orders.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour le statut de la commande
    await connection.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, params.id]
    );

    await connection.end();
    return NextResponse.json({ message: 'Statut mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
} 