import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cvneat'
    });

    // Récupérer la commande avec les informations du restaurant
    const [orders] = await connection.execute(
      `SELECT o.*, r.name as restaurant_name, r.address as restaurant_address, r.city as restaurant_city
       FROM orders o
       JOIN restaurants r ON o.restaurantId = r.id
       WHERE o.id = ? AND o.userId = ?`,
      [params.id, userId]
    );

    if (orders.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    const order = orders[0];

    // Récupérer les items de la commande
    const [items] = await connection.execute(
      `SELECT oi.*, mi.name, mi.price
       FROM order_items oi
       JOIN menu_items mi ON oi.menuItemId = mi.id
       WHERE oi.orderId = ?`,
      [params.id]
    );

    await connection.end();

    // Structurer la réponse
    const response = {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      deliveryFee: order.deliveryFee,
      deliveryAddress: order.deliveryAddress,
      deliveryCity: order.deliveryCity,
      deliveryPostalCode: order.deliveryPostalCode,
      deliveryPhone: order.deliveryPhone,
      createdAt: order.createdAt,
      restaurant: {
        name: order.restaurant_name,
        address: order.restaurant_address,
        city: order.restaurant_city
      },
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la commande' },
      { status: 500 }
    );
  }
} 