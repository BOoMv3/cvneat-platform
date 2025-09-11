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
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('position', position)
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString().split('T')[0])
        .lte('end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors du chargement de la publicité:', error);
      } else if (data) {
        setAd(data);
      }
    } catch (error) {
      console.error('Erreur:', error);
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
        return 'w-full h-32 sm:h-40 mb-4 sm:mb-6';
      case 'banner_middle':
        return 'w-full h-24 sm:h-32 my-4 sm:my-6';
      case 'sidebar_left':
      case 'sidebar_right':
        return 'w-full h-48 sm:h-64 mb-4';
      case 'footer':
        return 'w-full h-20 sm:h-24 mt-4 sm:mt-6';
      case 'popup':
        return 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
      default:
        return 'w-full h-32';
    }
  };

  const renderAdContent = () => (
    <div 
      className={`relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200 ${getPositionStyles()}`}
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
        
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-end">
          <div className="p-3 sm:p-4 text-white">
            <h3 className="text-sm sm:text-base font-semibold mb-1 line-clamp-1">
              {ad.title}
            </h3>
            {ad.description && (
              <p className="text-xs sm:text-sm opacity-90 line-clamp-2">
                {ad.description}
              </p>
            )}
            {ad.link_url && (
              <div className="flex items-center mt-2 text-xs">
                <FaExternalLinkAlt className="h-3 w-3 mr-1" />
                <span>En savoir plus</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

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
