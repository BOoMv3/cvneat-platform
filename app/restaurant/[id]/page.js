'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RestaurantPage({ params }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Page chargée avec les paramètres:', params);
    
    const fetchRestaurant = async () => {
      try {
        console.log('ID du restaurant:', params.id);
        const response = await fetch(`/api/restaurants/${params.id}`);
        console.log('Statut de la réponse:', response.status);
        const data = await response.json();
        console.log('Données reçues:', data);
        
        if (!response.ok) {
          console.error('Erreur détaillée:', data);
          throw new Error(data.message || 'Erreur lors du chargement du restaurant');
        }
        
        setRestaurant(data);
      } catch (error) {
        console.error('Erreur complète:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRestaurant();
    } else {
      console.error('Pas d\'ID de restaurant fourni');
      setError('ID du restaurant manquant');
      setLoading(false);
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Restaurant non trouvé</h1>
          <button 
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-[400px]">
        <Image
          src={restaurant.imageUrl}
          alt={restaurant.name}
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{restaurant.name}</h1>
            <p className="text-xl md:text-2xl">{restaurant.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">Informations</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">Adresse</h3>
                <p className="text-gray-600">{restaurant.address}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Téléphone</h3>
                <p className="text-gray-600">{restaurant.phone}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Temps de livraison</h3>
                <p className="text-gray-600">{restaurant.deliveryTime} minutes</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Frais de livraison</h3>
                <p className="text-gray-600">{restaurant.deliveryFee}€</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Commande minimum</h3>
                <p className="text-gray-600">{restaurant.minOrder}€</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">Menu</h2>
            <p className="text-gray-600">Le menu sera bientôt disponible.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 