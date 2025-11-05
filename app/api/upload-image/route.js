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
    // Note: Les noms de buckets ne doivent pas contenir d'accents
    let bucketName = 'IMAGES';
    if (folder === 'menu-images') bucketName = 'MENU-IMAGES';
    else if (folder === 'restaurant-images') bucketName = 'RESTAURANTS-IMAGES';
    else if (folder === 'advertisement-images') bucketName = 'PUBLICITE-IMAGES'; // Sans accent pour compatibilité

    console.log('📦 Upload vers bucket:', bucketName);
    console.log('📁 Dossier:', folder);
    console.log('📄 Nom du fichier:', fileName);

    // Vérifier que le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Erreur listage buckets:', listError);
    } else {
      console.log('✅ Tous les buckets disponibles:', buckets?.map(b => ({ name: b.name, public: b.public })));
      const bucketExists = buckets?.some(b => b.name === bucketName);
      const exactBucket = buckets?.find(b => b.name === bucketName);
      console.log(`🔍 Bucket "${bucketName}" existe:`, bucketExists);
      console.log(`🔍 Détails du bucket:`, exactBucket);
      
      // Vérifier aussi les variations avec accents
      const bucketWithAccent = buckets?.find(b => b.name === 'PUBLICITÉ-IMAGES');
      if (bucketWithAccent && bucketName === 'PUBLICITE-IMAGES') {
        console.warn('⚠️ ATTENTION: Un bucket "PUBLICITÉ-IMAGES" (avec accent) existe mais le code cherche "PUBLICITE-IMAGES" (sans accent)');
        console.warn('⚠️ Solution: Renommez le bucket en "PUBLICITE-IMAGES" (sans accent) dans Supabase Storage');
      }
      
      if (!bucketExists) {
        // Vérifier si un bucket similaire existe (avec accents ou casse différente)
        const similarBuckets = buckets?.filter(b => 
          b.name.toLowerCase().includes('publicite') || 
          b.name.toLowerCase().includes('publicité') ||
          b.name.toLowerCase().includes('advertisement')
        );
        
        if (similarBuckets && similarBuckets.length > 0) {
          return NextResponse.json({ 
            error: `Le bucket "${bucketName}" n'existe pas. Buckets similaires trouvés: ${similarBuckets.map(b => b.name).join(', ')}. Veuillez renommer ou créer le bucket avec exactement le nom "${bucketName}" (sans accent, en majuscules).` 
          }, { status: 400 });
        }
        
        return NextResponse.json({ 
          error: `Le bucket "${bucketName}" n'existe pas. Veuillez le créer dans Supabase Storage avec le nom exact "${bucketName}" (sans accent, en majuscules).` 
        }, { status: 400 });
      }
    }

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Erreur upload Supabase:', uploadError);
      console.error('Détails erreur:', JSON.stringify(uploadError, null, 2));
      
      // Message d'erreur plus explicite
      let errorMessage = uploadError.message;
      if (uploadError.message.includes('Bucket') || uploadError.message.includes('bucket')) {
        errorMessage = `Le bucket "${bucketName}" n'existe pas ou le nom est incorrect. Vérifiez dans Supabase Storage que le bucket existe avec exactement ce nom (sans accent, en majuscules).`;
      }
      
      return NextResponse.json({ error: `Erreur lors de l'upload: ${errorMessage}` }, { status: 500 });
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

