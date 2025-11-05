import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY; // Clé API ImgBB (gratuite, voir GUIDE_CONFIGURATION_IMGBB.md)

// Fonction pour uploader vers ImgBB (solution alternative)
async function uploadToImgBB(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // ImgBB accepte l'image en base64 directement dans l'URL
    const formData = new URLSearchParams();
    formData.append('image', base64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        imageUrl: data.data.url,
        deleteUrl: data.data.delete_url,
        provider: 'imgbb'
      };
    } else {
      throw new Error(data.error?.message || 'Erreur ImgBB');
    }
  } catch (error) {
    console.error('Erreur upload ImgBB:', error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'general'; // menu-images, restaurant-images, advertisement-images
    const userId = formData.get('userId');

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Vérifier la taille du fichier (max 10MB pour ImgBB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Le fichier est trop volumineux (max 10MB)' }, { status: 400 });
    }

    // Essayer d'abord Supabase si configuré
    let imageUrl = null;
    let provider = 'unknown';

    if (supabaseUrl && supabaseServiceKey) {
      try {
        // Créer un client Supabase avec les permissions admin
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Générer un nom de fichier unique
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${userId || 'anonymous'}_${Date.now()}.${fileExt}`;

        // Convertir le fichier en ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Déterminer le bucket selon le type
        let bucketName = 'IMAGES';
        if (folder === 'menu-images') bucketName = 'MENU-IMAGES';
        else if (folder === 'restaurant-images') bucketName = 'RESTAURANTS-IMAGES';
        else if (folder === 'advertisement-images') bucketName = 'PUBLICITE-IMAGES';

        console.log('📦 Tentative upload Supabase vers bucket:', bucketName);

        // Upload vers Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false
          });

        if (!uploadError) {
          // Obtenir l'URL publique
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
          provider = 'supabase';
          console.log('✅ Upload Supabase réussi');
        } else {
          console.warn('⚠️ Upload Supabase échoué, passage à ImgBB:', uploadError.message);
          throw uploadError;
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase non disponible, utilisation d\'ImgBB comme alternative');
      }
    }

    // Si Supabase a échoué ou n'est pas configuré, utiliser ImgBB
    if (!imageUrl) {
      if (!IMGBB_API_KEY) {
        return NextResponse.json({ 
          error: 'Aucun service d\'upload configuré. Veuillez configurer Supabase Storage ou ImgBB (voir GUIDE_CONFIGURATION_IMGBB.md)' 
        }, { status: 500 });
      }
      
      try {
        console.log('📤 Upload vers ImgBB...');
        const imgbbResult = await uploadToImgBB(file);
        imageUrl = imgbbResult.imageUrl;
        provider = 'imgbb';
        console.log('✅ Upload ImgBB réussi');
      } catch (imgbbError) {
        console.error('❌ Erreur upload ImgBB:', imgbbError);
        return NextResponse.json({ 
          error: `Erreur lors de l'upload: ${imgbbError.message || 'Impossible d\'uploader l\'image. Veuillez vérifier votre clé API ImgBB.'}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      provider: provider,
      fileName: file.name
    });

  } catch (error) {
    console.error('Erreur API upload image:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l\'upload' }, { status: 500 });
  }
}

