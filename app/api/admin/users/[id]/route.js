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

// PUT /api/admin/users/[id]
export async function PUT(request, { params }) {
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

    // Vérifier si l'utilisateur existe
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [params.id]
    );

    if (existingUser.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const [emailCheck] = await connection.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, params.id]
    );

    if (emailCheck.length > 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Mettre à jour l'utilisateur
    await connection.execute(
      'UPDATE users SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?',
      [name, email, phone, role, params.id]
    );

    // Récupérer l'utilisateur mis à jour
    const [updatedUser] = await connection.execute(
      'SELECT id, name, email, phone, role FROM users WHERE id = ?',
      [params.id]
    );

    await connection.end();
    return NextResponse.json(updatedUser[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(request, { params }) {
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

    // Vérifier si l'utilisateur existe
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [params.id]
    );

    if (existingUser.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer l'utilisateur
    await connection.execute('DELETE FROM users WHERE id = ?', [params.id]);

    await connection.end();
    return NextResponse.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    );
  }
} 