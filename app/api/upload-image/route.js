import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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
        const originalName = file.name || 'image';
        const rawExt = originalName.includes('.') ? originalName.split('.').pop() : '';
        const safeExt = rawExt?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || 'jpg';
        const safeFolder = folder.replace(/[^a-z0-9\-_/]/gi, '');
        const fileName = `${safeFolder}/${userId || 'anonymous'}_${Date.now()}.${safeExt}`;

        // Convertir le fichier en ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Déterminer la liste des buckets à tester
        const bucketCandidates = (() => {
          switch (folder) {
            case 'menu-images':
              return ['MENU-IMAGES', 'menu-images', 'IMAGES', 'images'];
            case 'restaurant-images':
              return ['RESTAURANTS-IMAGES', 'restaurants-images', 'IMAGES', 'images'];
            case 'advertisement-images':
              return ['PUBLICITE-IMAGES', 'publicite-images', 'PUBLICITE', 'publicite', 'IMAGES', 'images'];
            default:
              return ['IMAGES', 'images'];
          }
        })();

        let uploadSuccess = false;
        let lastUploadError = null;

        for (const bucketName of bucketCandidates) {
          try {
            console.log('📦 Tentative upload Supabase vers bucket:', bucketName);
            const { error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false
              });

            if (uploadError) {
              lastUploadError = uploadError;
              console.warn(`⚠️ Upload échoué pour bucket ${bucketName}:`, uploadError.message);
              continue;
            }

            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(fileName);

            if (urlData?.publicUrl) {
              imageUrl = urlData.publicUrl;
              provider = `supabase:${bucketName}`;
              uploadSuccess = true;
              console.log('✅ Upload Supabase réussi via bucket', bucketName);
              break;
            }
          } catch (bucketError) {
            lastUploadError = bucketError;
            console.warn(`⚠️ Erreur lors de l'upload vers ${bucketName}:`, bucketError.message);
          }
        }

        if (!uploadSuccess) {
          if (lastUploadError) {
            console.warn('⚠️ Upload Supabase échoué, passage à ImgBB:', lastUploadError.message);
          } else {
            console.warn('⚠️ Aucun bucket Supabase valide trouvé, passage à ImgBB');
          }
          throw lastUploadError || new Error('Impossible d\'uploader sur Supabase');
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

