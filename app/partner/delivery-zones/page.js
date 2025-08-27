'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaMapMarkerAlt, 
  FaSave, 
  FaPlus,
  FaTrash,
  FaEdit
} from 'react-icons/fa';

export default function DeliveryZones() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [zones, setZones] = useState([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  
  const [zoneForm, setZoneForm] = useState({
    name: '',
    base_fee: 0,
    distance_fee: 0,
    max_distance: 0,
    min_order_amount: 0,
    delivery_time: 30
  });
  
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Vérifier le rôle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'restaurant') {
        router.push('/');
        return;
      }

      setUser(session.user);

      // Récupérer le restaurant
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (restoError || !resto) {
        router.push('/profil-partenaire');
        return;
      }

      setRestaurant(resto);
      await fetchDeliveryZones(resto.id);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const fetchDeliveryZones = async (restaurantId) => {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('max_distance', { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Erreur récupération zones:', error);
      setError('Erreur lors de la récupération des zones');
    }
  };

  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const zoneData = {
        ...zoneForm,
        restaurant_id: restaurant.id
      };

      let result;
      if (editingZone) {
        // Mise à jour
        const { data, error } = await supabase
          .from('delivery_zones')
          .update(zoneData)
          .eq('id', editingZone.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Création
        const { data, error } = await supabase
          .from('delivery_zones')
          .insert(zoneData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      setSuccess(editingZone ? 'Zone mise à jour avec succès !' : 'Zone créée avec succès !');
      setTimeout(() => setSuccess(''), 3000);
      
      setShowZoneModal(false);
      setEditingZone(null);
      setZoneForm({
        name: '',
        base_fee: 0,
        distance_fee: 0,
        max_distance: 0,
        min_order_amount: 0,
        delivery_time: 30
      });
      
      await fetchDeliveryZones(restaurant.id);
    } catch (err) {
      setError('Erreur lors de la sauvegarde de la zone');
      console.error('Erreur sauvegarde zone:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteZone = async (zoneId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) return;

    try {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;
      
      setSuccess('Zone supprimée avec succès !');
      setTimeout(() => setSuccess(''), 3000);
      await fetchDeliveryZones(restaurant.id);
    } catch (err) {
      setError('Erreur lors de la suppression de la zone');
      console.error('Erreur suppression zone:', err);
    }
  };

  const editZone = (zone) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      base_fee: zone.base_fee,
      distance_fee: zone.distance_fee,
      max_distance: zone.max_distance,
      min_order_amount: zone.min_order_amount,
      delivery_time: zone.delivery_time
    });
    setShowZoneModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setZoneForm(prev => ({
      ...prev,
      [name]: name.includes('fee') || name.includes('amount') ? parseFloat(value) : parseInt(value)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Zones de livraison</h1>
              <p className="text-gray-600">{restaurant?.nom}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/partner')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Informations sur les zones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">ℹ️ Comment fonctionnent les zones de livraison ?</h2>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• <strong>Frais de base :</strong> Montant fixe pour chaque livraison dans cette zone</p>
            <p>• <strong>Frais par km :</strong> Montant supplémentaire par kilomètre parcouru</p>
            <p>• <strong>Distance max :</strong> Rayon maximum de livraison pour cette zone</p>
            <p>• <strong>Commande min :</strong> Montant minimum de commande pour cette zone</p>
            <p>• <strong>Temps de livraison :</strong> Estimation du temps de livraison</p>
          </div>
        </div>

        {/* Bouton d'ajout */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Vos zones de livraison</h2>
          <button
            onClick={() => {
              setEditingZone(null);
              setZoneForm({
                name: '',
                base_fee: 0,
                distance_fee: 0,
                max_distance: 0,
                min_order_amount: 0,
                delivery_time: 30
              });
              setShowZoneModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <FaPlus className="h-4 w-4" />
            <span>Ajouter une zone</span>
          </button>
        </div>

        {/* Liste des zones */}
        {zones.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <FaMapMarkerAlt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune zone de livraison</h3>
            <p className="text-gray-500 mb-4">Créez votre première zone de livraison pour commencer à recevoir des commandes</p>
            <button
              onClick={() => setShowZoneModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer une zone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map((zone) => (
              <div key={zone.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editZone(zone)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                    >
                      <FaEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Frais de base:</span>
                    <span className="font-medium">{zone.base_fee}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Frais par km:</span>
                    <span className="font-medium">{zone.distance_fee}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Distance max:</span>
                    <span className="font-medium">{zone.max_distance} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Commande min:</span>
                    <span className="font-medium">{zone.min_order_amount}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Temps livraison:</span>
                    <span className="font-medium">{zone.delivery_time} min</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    <strong>Exemple :</strong> Livraison à 5km = {zone.base_fee + (5 * zone.distance_fee)}€
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'ajout/modification de zone */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingZone ? 'Modifier la zone' : 'Ajouter une zone'}
            </h3>
            <form onSubmit={handleZoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la zone
                </label>
                <input
                  type="text"
                  name="name"
                  value={zoneForm.name}
                  onChange={handleChange}
                  placeholder="ex: Centre-ville, Banlieue, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frais de base (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="base_fee"
                    value={zoneForm.base_fee}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frais par km (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="distance_fee"
                    value={zoneForm.distance_fee}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distance max (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="max_distance"
                    value={zoneForm.max_distance}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commande min (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="min_order_amount"
                    value={zoneForm.min_order_amount}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temps de livraison (min)
                </label>
                <input
                  type="number"
                  name="delivery_time"
                  value={zoneForm.delivery_time}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sauvegarde...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="h-4 w-4" />
                      <span>{editingZone ? 'Modifier' : 'Ajouter'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowZoneModal(false);
                    setEditingZone(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 