import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

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

// GET /api/admin/users
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

    const [rows] = await connection.execute(
      'SELECT id, name, email, phone, role FROM users ORDER BY name'
    );

    await connection.end();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users
export async function POST(request) {
  const auth = await verifyAdminToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, email, phone, role } = await request.json();

    if (!name || !email || !phone || !role) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Vérifier si l'email existe déjà
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Créer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Insérer le nouvel utilisateur
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, hashedPassword, role]
    );

    // Récupérer l'utilisateur créé
    const [newUser] = await connection.execute(
      'SELECT id, name, email, phone, role FROM users WHERE id = ?',
      [result.insertId]
    );

    await connection.end();

    // Envoyer un email avec le mot de passe temporaire
    // TODO: Implémenter l'envoi d'email

    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    );
  }
} 