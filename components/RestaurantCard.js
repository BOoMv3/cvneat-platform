'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaStar, FaClock, FaMotorcycle, FaHeart } from 'react-icons/fa';

const READY_RESTAURANTS = new Set([
  'la bonne pate',
  "l'eclipse",
  'leclipse'
]);

const normalizeName = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export default function RestaurantCard({ restaurant, onToggleFavorite, isFavorite = false }) {
  const {
    id,
    nom,
    description,
    image,
    logo,
    rating,
    review_count,
    delivery_time,
    prep_time_minutes,
    delivery_fee,
    minimum_order,
    is_sponsored
  } = restaurant;

  const isRestaurantReady = READY_RESTAURANTS.has(normalizeName(nom));

  return (
    <Link href={`/restaurant-view?id=${encodeURIComponent(id)}`} className="block">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
        {/* Image de fond avec logo intégré */}
        <div className="relative h-48 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={nom}
              fill
              className="object-cover opacity-60 group-hover:opacity-70 transition-opacity"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800" />
          )}

          {/* Overlay sombre */}
          <div className="absolute inset-0 bg-black bg-opacity-30" />

          {/* Logo du restaurant centré */}
          <div className="absolute inset-0 flex items-center justify-center">
            {logo ? (
              <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white">
                <Image
                  src={logo}
                  alt={`Logo ${nom}`}
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white">
                <span className="text-2xl font-bold text-purple-600">
                  {nom.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Nom du restaurant en bas */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4">
            <h3 className="text-white font-bold text-lg text-center drop-shadow-lg">
              {nom}
            </h3>
          </div>

          {/* Badge sponsorisé */}
          {is_sponsored && (
            <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              Sponsorisé
            </div>
          )}

          {!isRestaurantReady && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              Disponible lundi
            </div>
          )}

          {/* Bouton favori */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite && onToggleFavorite(restaurant);
            }}
            className="absolute top-3 right-3 w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all"
          >
            <FaHeart className={`w-4 h-4 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Informations du restaurant */}
        <div className="p-4">
          {/* Description */}
          {description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {description}
            </p>
          )}

          {/* Détails de livraison */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <FaMotorcycle className="text-gray-500" />
              <span>{delivery_fee || '2.50'}€</span>
            </div>
            <div className="flex items-center gap-1">
              <FaClock className="text-gray-500" />
              <span>{prep_time_minutes || delivery_time || '25'} min</span>
            </div>
          </div>

          {/* Note et commande minimum */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <FaStar className="text-yellow-400" />
              <span className="font-semibold text-gray-800">
                {(review_count || 0) > 0 ? (parseFloat(rating) || 0).toFixed(1) : '—'}
              </span>
              <span className="text-gray-600">
                ({(review_count || 0) > 0 ? review_count : '0'} avis)
              </span>
            </div>
            {minimum_order && (
              <span className="text-xs text-gray-500">
                Min. {minimum_order}€
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
} 