'use client';
import { useState, useEffect } from 'react';
import { FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4YnFydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4NzcsImV4cCI6MjA1MDA1MDg3N30.G7iFlb2vKi1ouABfyI_azLbZ8XGi66tf9kx_dtVIE40'
);

export default function Advertisement({ position, className = '' }) {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAd();
  }, [position]);

  const fetchAd = async () => {
    try {
      // Récupérer les publicités actives
      // Afficher les publicités qui sont :
      // 1. is_active = true ET status = 'approved' ou 'active'
      // 2. OU is_active = true ET status = 'pending_approval' ET payment_status = 'paid' (pour afficher immédiatement après paiement)
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('position', position)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10); // Récupérer plusieurs pour filtrer ensuite

      if (error) {
        console.error('Erreur lors de la récupération de la publicité:', error);
        setLoading(false);
        return;
      }

      // Filtrer les publicités selon leur statut
      const validAds = data?.filter(ad => {
        // Afficher si status est 'approved' ou 'active'
        if (ad.status === 'approved' || ad.status === 'active') {
          return true;
        }
        // Afficher si status est 'pending_approval' mais le paiement est validé
        if (ad.status === 'pending_approval' && ad.payment_status === 'paid') {
          return true;
        }
        return false;
      });

      // Prendre la première publicité valide
      const adToDisplay = validAds?.[0];

      // Vérifier si la date est dans la plage valide
      if (adToDisplay) {
        const today = new Date().toISOString().split('T')[0];
        const startDate = adToDisplay.start_date ? new Date(adToDisplay.start_date).toISOString().split('T')[0] : null;
        const endDate = adToDisplay.end_date ? new Date(adToDisplay.end_date).toISOString().split('T')[0] : null;
        
        if ((!startDate || today >= startDate) && (!endDate || today <= endDate)) {
          const parsedUpdatedAt = adToDisplay.updated_at
            ? new Date(adToDisplay.updated_at).getTime()
            : null;
          const versionKey = Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : Date.now();

          const cacheBustingUrl = adToDisplay.image_url
            ? `${adToDisplay.image_url}${adToDisplay.image_url.includes('?') ? '&' : '?'}cb=${versionKey}`
            : null;
          setAd({
            ...adToDisplay,
            image_url_with_cache_bust: cacheBustingUrl
          });
        } else {
          console.log('Publicité hors période:', { startDate, endDate, today });
        }
      } else {
        console.log('Aucune publicité valide trouvée pour la position:', position);
        console.log('Publicités trouvées:', data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la publicité:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (!ad) return;
    
    // Enregistrer le clic
    try {
      await supabase
        .from('advertisements')
        .update({ clicks: (ad.clicks || 0) + 1 })
        .eq('id', ad.id);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du clic:', error);
    }

    // Afficher le modal avec les détails
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleModalLinkClick = () => {
    if (ad && ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
      setShowModal(false);
    }
  };

  const handleImpression = async () => {
    if (ad) {
      try {
        await supabase
          .from('advertisements')
          .update({ impressions: ad.impressions + 1 })
          .eq('id', ad.id);
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de l\'impression:', error);
      }
    }
  };

  // Enregistrer l'impression quand l'annonce est visible
  useEffect(() => {
    if (ad) {
      handleImpression();
    }
  }, [ad]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}>
        <div className="h-32 flex items-center justify-center">
          <div className="text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!ad) {
    return null;
  }

  const getPositionStyles = () => {
    switch (position) {
      case 'banner_top':
        return 'w-full h-24 sm:h-32 md:h-36 mb-6 sm:mb-8 rounded-xl overflow-hidden';
      case 'banner_middle':
        return 'w-full h-48 sm:h-64 md:h-80 my-6 sm:my-8 rounded-2xl overflow-hidden';
      case 'sidebar_left':
      case 'sidebar_right':
        return 'w-full h-64 sm:h-80 mb-6 rounded-xl overflow-hidden sticky top-4';
      case 'footer':
        return 'w-full h-40 sm:h-56 md:h-64 mt-8 sm:mt-12 rounded-xl overflow-hidden';
      case 'popup':
        return 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
      default:
        return 'w-full h-32';
    }
  };

  const renderAdContent = () => {
    // Utiliser object-contain pour banner_middle et footer pour que toute l'image soit visible
    const imageClass = (position === 'banner_middle' || position === 'footer') 
      ? 'w-full h-full object-contain bg-gray-100 dark:bg-gray-800'
      : 'w-full h-full object-cover';

    // Style différent pour banner_top (plus discret et mieux intégré)
    if (position === 'banner_top') {
      return (
        <div 
          className={`relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 ${getPositionStyles()}`}
          onClick={handleClick}
        >
          <div className="relative h-full">
            <div className="absolute top-2 left-2 z-10 bg-yellow-400/95 text-yellow-900 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow">Publicité</div>
            <img
              src={ad.image_url_with_cache_bust || ad.image_url}
              alt={ad.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div 
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white"
              style={{ display: 'none' }}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📢</div>
                <div className="text-sm font-medium">{ad.title}</div>
              </div>
            </div>
            
            {/* Overlay minimaliste pour banner_top */}
            {ad.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent p-3 sm:p-4">
                <h3 className="text-white text-sm sm:text-base font-semibold line-clamp-1">
                  {ad.title}
                </h3>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Style pour les autres positions (banner_middle et footer avec object-contain)
    return (
      <div 
        className={`relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 ${getPositionStyles()}`}
        onClick={handleClick}
      >
        <div className="relative h-full flex items-center justify-center">
          <div className="absolute top-2 left-2 z-10 bg-yellow-400/95 text-yellow-900 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow">Publicité</div>
          <img
            src={ad.image_url_with_cache_bust || ad.image_url}
            alt={ad.title}
            className={imageClass}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div 
            className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white"
            style={{ display: 'none' }}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📢</div>
              <div className="text-sm font-medium">{ad.title}</div>
            </div>
          </div>
          
          {/* Overlay avec indication de clic */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="p-4 text-white text-center">
              <div className="flex items-center justify-center text-sm font-medium">
                <FaExternalLinkAlt className="h-4 w-4 mr-2" />
                <span>Cliquez pour voir les détails</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (position === 'popup') {
    return showPopup ? (
      <div className={getPositionStyles()}>
        <div className="relative">
          {renderAdContent()}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPopup(false);
            }}
            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
          >
            <FaTimes className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
    ) : null;
  }

  return (
    <>
      {renderAdContent()}
      
      {/* Modal pour afficher les détails de la publicité */}
      {showModal && ad && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={handleModalClose}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <FaTimes className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Image */}
            <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <img
                src={ad.image_url_with_cache_bust || ad.image_url}
                alt={ad.title}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div 
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white"
                style={{ display: 'none' }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">📢</div>
                  <div className="text-lg font-medium">{ad.title}</div>
                </div>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {ad.title}
              </h2>
              
              {ad.description && (
                <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg mb-6 leading-relaxed">
                  {ad.description}
                </p>
              )}

              {/* Informations supplémentaires */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
                {ad.advertiser_name && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <span className="font-medium mr-2">Annonceur:</span>
                    <span>{ad.advertiser_name}</span>
                  </div>
                )}
                {ad.start_date && ad.end_date && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <span className="font-medium mr-2">Période:</span>
                    <span>
                      {new Date(ad.start_date).toLocaleDateString('fr-FR')} - {new Date(ad.end_date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Bouton d'action */}
              {ad.link_url && (
                <div className="mt-6">
                  <button
                    onClick={handleModalLinkClick}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <FaExternalLinkAlt className="h-5 w-5 mr-2" />
                    En savoir plus
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
