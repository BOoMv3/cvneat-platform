import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/users/addresses - Récupérer les adresses de l'utilisateur
export async function GET(request) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Pour l'instant, retourner un tableau vide car la table user_addresses n'existe pas encore
    // TODO: Créer la table user_addresses et implémenter la vraie logique
    return NextResponse.json([]);

  } catch (error) {
    console.error('Erreur dans /api/users/addresses GET:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/users/addresses - Ajouter une nouvelle adresse
export async function POST(request) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer les données du body
    const body = await request.json();
    const { name, address, city, postalCode, instructions } = body;

    // Pour l'instant, retourner un succès simulé
    // TODO: Implémenter la vraie logique avec la table user_addresses
    const mockAddress = {
      id: Date.now().toString(),
      user_id: user.id,
      name,
      address,
      city,
      postal_code: postalCode,
      instructions,
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      message: 'Adresse ajoutée avec succès (simulation)',
      address: mockAddress
    });

  } catch (error) {
    console.error('Erreur dans /api/users/addresses POST:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/users/addresses - Mettre à jour une adresse
export async function PUT(request) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { id, name, address, city, postalCode, instructions, isDefault } = await request.json();

    // Validation des champs requis
    if (!id || !name || !address || !city || !postalCode) {
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

    // Vérifier que l'adresse appartient à l'utilisateur
    const [existingAddress] = await connection.execute(
      'SELECT * FROM addresses WHERE id = ? AND userId = ?',
      [id, user.id]
    );

    if (existingAddress.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Adresse non trouvée' },
        { status: 404 }
      );
    }

    // Si l'adresse est définie comme adresse par défaut, mettre à jour les autres adresses
    if (isDefault) {
      await connection.execute(
        'UPDATE addresses SET isDefault = 0 WHERE userId = ? AND id != ?',
        [user.id, id]
      );
    }

    // Mettre à jour l'adresse
    await connection.execute(
      `UPDATE addresses 
       SET name = ?, address = ?, city = ?, postalCode = ?, instructions = ?, isDefault = ?
       WHERE id = ? AND userId = ?`,
      [name, address, city, postalCode, instructions, isDefault, id, user.id]
    );

    const [updatedAddress] = await connection.execute(
      'SELECT * FROM addresses WHERE id = ?',
      [id]
    );

    await connection.end();
    return NextResponse.json(updatedAddress[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'adresse:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'adresse' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/addresses - Supprimer une adresse
export async function DELETE(request) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'adresse requis' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Vérifier que l'adresse appartient à l'utilisateur
    const [existingAddress] = await connection.execute(
      'SELECT * FROM addresses WHERE id = ? AND userId = ?',
      [id, user.id]
    );

    if (existingAddress.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Adresse non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer l'adresse
    await connection.execute(
      'DELETE FROM addresses WHERE id = ? AND userId = ?',
      [id, user.id]
    );

    // Si l'adresse supprimée était l'adresse par défaut, définir une nouvelle adresse par défaut
    if (existingAddress[0].isDefault) {
      const [remainingAddresses] = await connection.execute(
        'SELECT id FROM addresses WHERE userId = ? ORDER BY createdAt DESC LIMIT 1',
        [user.id]
      );

      if (remainingAddresses.length > 0) {
        await connection.execute(
          'UPDATE addresses SET isDefault = 1 WHERE id = ?',
          [remainingAddresses[0].id]
        );
      }
    }

    await connection.end();
    return NextResponse.json({ message: 'Adresse supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'adresse:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'adresse' },
      { status: 500 }
    );
  }
} 