'use client';

import Image from 'next/image';
import { FaStar, FaClock, FaMotorcycle, FaMapMarkerAlt, FaHeart, FaSearch, FaShare, FaFlag } from 'react-icons/fa';
import { useState } from 'react';

export default function RestaurantBanner({ restaurant, onBack, onToggleFavorite, isFavorite = false }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!restaurant) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Recherche dans le menu (à implémenter dans le composant parent)
      console.log('Recherche:', searchQuery);
      setSearchQuery('');
      setShowSearch(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.nom,
        text: `Découvrez ${restaurant.nom} sur CVN'EAT !`,
        url: window.location.href
      });
    } else {
      // Fallback pour les navigateurs qui ne supportent pas l'API Share
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papiers !');
    }
    setShowOptions(false);
  };

  const handleReport = () => {
    alert('Fonctionnalité de signalement à implémenter');
    setShowOptions(false);
  };

  return (
    <div className="relative w-full h-80 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 overflow-hidden">
      {/* Image de fond avec overlay */}
      <div className="absolute inset-0">
        {restaurant.banner_image ? (
          <Image
            src={restaurant.banner_image}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
          />
        ) : restaurant.profile_image ? (
          <Image
            src={restaurant.profile_image}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
          />
        ) : restaurant.image_url ? (
          <Image
            src={restaurant.image_url}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800" />
        )}
      </div>

      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Header avec boutons */}
      <div className="relative z-10 flex justify-between items-start p-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all"
        >
          <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex gap-2">
          {/* Barre de recherche */}
          <div className="relative">
            {showSearch && (
              <form onSubmit={handleSearch} className="absolute right-0 top-0 w-64 bg-white rounded-lg shadow-lg p-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans le menu..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 text-blue-600 hover:text-blue-800"
                >
                  <FaSearch className="w-4 h-4" />
                </button>
              </form>
            )}
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all"
            >
              <FaSearch className="w-5 h-5 text-gray-800" />
            </button>
          </div>

          {/* Bouton favoris */}
          <button 
            onClick={onToggleFavorite}
            className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all"
          >
            <FaHeart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-800'}`} />
          </button>

          {/* Menu d'options */}
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all"
            >
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Menu déroulant */}
            {showOptions && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <button
                  onClick={handleShare}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FaShare className="w-4 h-4" />
                  Partager
                </button>
                <button
                  onClick={handleReport}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FaFlag className="w-4 h-4" />
                  Signaler
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logo et nom du restaurant centrés */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full -mt-16">
        {/* Logo du restaurant */}
        <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center mb-4 border-4 border-white">
          {restaurant.profile_image ? (
            <Image
              src={restaurant.profile_image}
              alt={`Logo ${restaurant.nom}`}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          ) : restaurant.logo_image ? (
            <Image
              src={restaurant.logo_image}
              alt={`Logo ${restaurant.nom}`}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {restaurant.nom.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Nom du restaurant */}
        <h1 className="text-3xl font-bold text-white text-center mb-2 drop-shadow-lg">
          {restaurant.nom}
        </h1>

        {/* Sous-titre */}
        <p className="text-white text-center text-lg opacity-90 mb-4 drop-shadow-lg">
          {restaurant.description}
        </p>
      </div>

      {/* Informations en bas */}
      <div className="absolute -bottom-20 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm p-4 rounded-t-3xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <FaStar className="text-yellow-400 text-lg" />
              <span className="font-semibold text-gray-800">{restaurant.rating || '4.5'}</span>
              <span className="text-gray-600 text-sm">({restaurant.reviewCount || '100+'})</span>
            </div>
            <div className="flex items-center gap-1">
              <FaClock className="text-gray-600" />
              <span className="text-gray-800">{restaurant.deliveryTime || '25'} min</span>
            </div>
            <div className="flex items-center gap-1">
              <FaMotorcycle className="text-gray-600" />
              <span className="text-gray-800">{restaurant.deliveryFee || '2.50'}€</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FaMapMarkerAlt className="text-gray-500" />
          <span>{restaurant.adresse}, {restaurant.ville} {restaurant.code_postal}</span>
        </div>
      </div>

      {/* Overlay pour fermer les menus */}
      {(showSearch || showOptions) && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => {
            setShowSearch(false);
            setShowOptions(false);
          }}
        />
      )}
    </div>
  );
} 