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

  useEffect(() => {
    fetchAd();
  }, [position]);

  const fetchAd = async () => {
    try {
      // Récupérer les publicités actives OU payées (même en attente d'approbation)
      const { data: allAds, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('position', position)
        .in('status', ['approved', 'active', 'pending_approval'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erreur récupération publicités:', error);
        return;
      }

      // Filtrer : is_active = true OU (payment_status = 'paid' ET status = 'pending_approval')
      const data = allAds?.find(ad => 
        ad.is_active === true || 
        (ad.payment_status === 'paid' && ad.status === 'pending_approval')
      ) || null;

      // Vérifier si la date est dans la plage valide
      if (data) {
        const today = new Date().toISOString().split('T')[0];
        const startDate = data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : null;
        const endDate = data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : null;
        
        if ((!startDate || today >= startDate) && (!endDate || today <= endDate)) {
          setAd(data);
        }
      }
    } catch (error) {
      // Erreur silencieuse - pas de publicité à afficher
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (ad && ad.link_url) {
      // Enregistrer le clic
      try {
        await supabase
          .from('advertisements')
          .update({ clicks: ad.clicks + 1 })
          .eq('id', ad.id);
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement du clic:', error);
      }

      // Ouvrir le lien
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
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
        return 'w-full h-48 sm:h-56 md:h-64 my-6 sm:my-8 rounded-2xl overflow-hidden';
      case 'sidebar_left':
      case 'sidebar_right':
        return 'w-full h-64 sm:h-80 mb-6 rounded-xl overflow-hidden sticky top-4';
      case 'footer':
        return 'w-full h-24 sm:h-32 mt-8 sm:mt-12 rounded-xl overflow-hidden';
      case 'popup':
        return 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
      default:
        return 'w-full h-32';
    }
  };

  const renderAdContent = () => {
    // Style différent pour banner_top (plus discret et mieux intégré)
    if (position === 'banner_top') {
      return (
        <div 
          className={`relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 ${getPositionStyles()}`}
          onClick={handleClick}
        >
          <div className="relative h-full">
            <img
              src={ad.image_url}
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

    // Style pour les autres positions
    return (
      <div 
        className={`relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 ${getPositionStyles()}`}
        onClick={handleClick}
      >
        <div className="relative h-full">
          <img
            src={ad.image_url}
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
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex items-end">
            <div className="p-4 sm:p-6 text-white w-full">
              <h3 className="text-base sm:text-lg font-bold mb-2 line-clamp-1">
                {ad.title}
              </h3>
              {ad.description && (
                <p className="text-sm sm:text-base opacity-90 line-clamp-2 mb-2">
                  {ad.description}
                </p>
              )}
              {ad.link_url && (
                <div className="flex items-center mt-2 text-sm">
                  <FaExternalLinkAlt className="h-4 w-4 mr-2" />
                  <span>En savoir plus</span>
                </div>
              )}
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

  return renderAdContent();
}
