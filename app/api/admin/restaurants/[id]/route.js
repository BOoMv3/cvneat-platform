import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export async function PUT(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const {
      name,
      description,
      address,
      city,
      postalCode,
      phone,
      email,
      openingHours,
      deliveryFee,
      minimumOrder
    } = await request.json();

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cvneat'
    });

    // Vérifier si le restaurant existe
    const [restaurants] = await connection.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [params.id]
    );

    if (restaurants.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Restaurant non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour le restaurant
    await connection.execute(
      `UPDATE restaurants SET
        name = ?,
        description = ?,
        address = ?,
        city = ?,
        postalCode = ?,
        phone = ?,
        email = ?,
        openingHours = ?,
        deliveryFee = ?,
        minimumOrder = ?
      WHERE id = ?`,
      [
        name,
        description,
        address,
        city,
        postalCode,
        phone,
        email,
        openingHours,
        deliveryFee,
        minimumOrder,
        params.id
      ]
    );

    // Récupérer le restaurant mis à jour
    const [updatedRestaurants] = await connection.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [params.id]
    );

    await connection.end();

    return NextResponse.json(updatedRestaurants[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du restaurant:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du restaurant' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'cvneat'
    });

    // Vérifier si le restaurant existe
    const [restaurants] = await connection.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [params.id]
    );

    if (restaurants.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Restaurant non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer le restaurant
    await connection.execute(
      'DELETE FROM restaurants WHERE id = ?',
      [params.id]
    );

    await connection.end();

    return NextResponse.json({ message: 'Restaurant supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du restaurant:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du restaurant' },
      { status: 500 }
    );
  }
} 