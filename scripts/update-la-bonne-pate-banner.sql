-- Script pour mettre à jour la bannière de "La Bonne Pâte"
-- ID du restaurant: d6725fe6-59ec-413a-b39b-ddb960824999

-- ⚠️ IMPORTANT: Remplacez 'VOTRE_URL_IMAGE_ICI' par l'URL réelle de l'image
-- Vous pouvez obtenir l'URL en uploadant l'image via le dashboard partenaire
-- ou en la téléchargeant sur un service d'hébergement d'images (ImgBB, Cloudinary, etc.)

UPDATE restaurants
SET banner_image = 'VOTRE_URL_IMAGE_ICI',
    updated_at = NOW()
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';

-- Vérifier la mise à jour
SELECT 
    id,
    nom,
    banner_image,
    profile_image,
    updated_at
FROM restaurants
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';

