'use client';

import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaTruck, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

export default function DeliveryZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        // Zones de livraison fixes basées sur la configuration
        const zonesData = [
          { code: 'ganges', nom: 'Ganges', prix_base: 2.50 },
          { code: 'laroque', nom: 'Laroque', prix_base: 3.50 },
          { code: 'saint-bauzille', nom: 'Saint-Bauzille-de-Putois', prix_base: 3.50 },
          { code: 'sumene', nom: 'Sumène', prix_base: 4.00 },
          { code: 'pegairolles', nom: 'Pégairolles-de-Buèges', prix_base: 4.00 }
        ];
        setZones(zonesData);
      } catch (error) {
        setError('Erreur lors du chargement des zones');
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Zones de livraison
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez nos zones de livraison et les tarifs associés. 
            Nous livrons dans un rayon de 12km autour de Ganges (villages à max 10 minutes de route).
          </p>
        </div>

        {/* Informations générales */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <FaInfoCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Comment fonctionne notre système de tarification ?
              </h3>
              <ul className="text-blue-800 space-y-1">
                <li>• Prix de base selon la ville de livraison</li>
                <li>• Supplément de 0,50€ tous les 3km après 5km</li>
                <li>• Réduction de 0,50€ pour les commandes de 30€ et plus</li>
                <li>• Supplément de 1€ pour les commandes de moins de 15€</li>
                <li>• <strong>Aucune livraison gratuite</strong> - nos livreurs en voiture ont des coûts</li>
                <li>• Limite de livraison : 12km autour de Ganges (max 10 minutes de route)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Grille des zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone, index) => (
            <div 
              key={zone.code}
              className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all duration-300 hover:shadow-xl ${
                zone.code === 'ganges' 
                  ? 'border-orange-300 bg-orange-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    zone.code === 'ganges' 
                      ? 'bg-orange-100 text-orange-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <FaMapMarkerAlt className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {zone.nom}
                  </h3>
                </div>
                {zone.code === 'ganges' && (
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Siège
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Prix de base :</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {zone.prix_base}€
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <FaTruck className="h-4 w-4" />
                  <span>
                    {zone.code === 'ganges' ? 'Livraison locale' : 'Livraison disponible'}
                  </span>
                </div>

                {zone.code === 'ganges' && (
                  <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-orange-800">
                      <FaCheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Livraison prioritaire - Délai garanti
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Carte des zones */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Carte des zones de livraison
          </h2>
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                {/* Carte simplifiée */}
                <div className="bg-gradient-to-br from-blue-50 to-orange-50 border-2 border-gray-300 rounded-lg p-8 relative overflow-hidden">
                  {/* Centre - Ganges */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-orange-500 text-white p-3 rounded-full shadow-lg">
                      <FaMapMarkerAlt className="h-6 w-6" />
                    </div>
                    <div className="text-center mt-2">
                      <p className="font-bold text-orange-600">Ganges</p>
                      <p className="text-sm text-orange-500">2,50€</p>
                    </div>
                  </div>

                  {/* Zones périphériques */}
                  <div className="absolute top-4 left-4">
                    <div className="bg-blue-500 text-white p-2 rounded-full shadow">
                      <FaMapMarkerAlt className="h-4 w-4" />
                    </div>
                    <p className="text-xs mt-1">St-Bauzille</p>
                  </div>

                  <div className="absolute top-4 right-4">
                    <div className="bg-blue-500 text-white p-2 rounded-full shadow">
                      <FaMapMarkerAlt className="h-4 w-4" />
                    </div>
                    <p className="text-xs mt-1">St-Martin</p>
                  </div>

                  <div className="absolute bottom-4 left-4">
                    <div className="bg-blue-500 text-white p-2 rounded-full shadow">
                      <FaMapMarkerAlt className="h-4 w-4" />
                    </div>
                    <p className="text-xs mt-1">Montpellier</p>
                  </div>

                  <div className="absolute bottom-4 right-4">
                    <div className="bg-blue-500 text-white p-2 rounded-full shadow">
                      <FaMapMarkerAlt className="h-4 w-4" />
                    </div>
                    <p className="text-xs mt-1">Nîmes</p>
                  </div>

                  {/* Cercle de limite */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-dashed border-gray-400 rounded-full opacity-50"></div>
                </div>
              </div>
              
              <div className="mt-6 text-gray-600">
                <p className="text-sm">
                  <strong>Limite de livraison :</strong> 12km autour de Ganges
                </p>
                <p className="text-sm mt-2">
                  Les tarifs peuvent varier selon la distance exacte et le montant de votre commande.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Questions fréquentes
          </h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Comment sont calculés les frais de livraison ?
              </h3>
              <p className="text-gray-600">
                Les frais sont calculés automatiquement selon votre adresse de livraison, 
                la distance par rapport au restaurant et le montant de votre commande.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Y a-t-il une limite de distance ?
              </h3>
              <p className="text-gray-600">
                Oui, nous livrons dans un rayon maximum de 12km autour de Ganges 
                pour garantir la fraîcheur et la qualité de nos plats.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Comment obtenir la livraison gratuite ?
              </h3>
              <p className="text-gray-600">
                Nous ne proposons pas de livraison gratuite car nos livreurs utilisent leurs propres véhicules et ont des coûts (essence, usure, etc.). Nous proposons cependant une réduction de 0,50€ pour les commandes de 30€ et plus.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Combien de temps dure la livraison ?
              </h3>
              <p className="text-gray-600">
                Les délais varient entre 20 et 60 minutes selon la distance. 
                Les livraisons à Ganges sont prioritaires avec un délai garanti de 20-30 minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 