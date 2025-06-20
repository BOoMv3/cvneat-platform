import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export async function GET(request) {
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

    const [restaurants] = await connection.execute(
      'SELECT * FROM restaurants ORDER BY name'
    );

    await connection.end();

    return NextResponse.json(restaurants);
  } catch (error) {
    console.error('Erreur lors de la récupération des restaurants:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des restaurants' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    const [result] = await connection.execute(
      `INSERT INTO restaurants (
        name, description, address, city, postalCode,
        phone, email, openingHours, deliveryFee, minimumOrder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        minimumOrder
      ]
    );

    const [restaurants] = await connection.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [result.insertId]
    );

    await connection.end();

    return NextResponse.json(restaurants[0]);
  } catch (error) {
    console.error('Erreur lors de la création du restaurant:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création du restaurant' },
      { status: 500 }
    );
  }
} 