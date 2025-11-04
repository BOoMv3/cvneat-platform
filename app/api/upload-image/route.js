import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'general'; // menu-images, restaurant-images, advertisement-images
    const userId = formData.get('userId');

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 });
    }

    // Créer un client Supabase avec les permissions admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${userId || 'anonymous'}_${Date.now()}.${fileExt}`;

    // Convertir le fichier en ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Déterminer le bucket selon le type (utiliser les noms exacts des buckets Supabase)
    let bucketName = 'IMAGES';
    if (folder === 'menu-images') bucketName = 'MENU-IMAGES';
    else if (folder === 'restaurant-images') bucketName = 'RESTAURANTS-IMAGES';
    else if (folder === 'advertisement-images') bucketName = 'PUBLICITÉ-IMAGES';

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Erreur upload Supabase:', uploadError);
      return NextResponse.json({ error: `Erreur lors de l'upload: ${uploadError.message}` }, { status: 500 });
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('Erreur API upload image:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l\'upload' }, { status: 500 });
  }
}

