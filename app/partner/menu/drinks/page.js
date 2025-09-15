'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaWineGlass, FaCoffee } from 'react-icons/fa';

export default function MenuDrinks() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDrink, setEditingDrink] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDrink, setNewDrink] = useState({
    nom: '',
    description: '',
    prix_petit: '',
    prix_moyen: '',
    prix_grand: '',
    disponible: true,
    is_drink: true
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Vérifier que l'utilisateur est un partenaire
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'restaurant') {
      router.push('/');
      return;
    }

    setUser(user);
    fetchRestaurantData();
  };

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      
      // Récupérer le restaurant du partenaire
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!restaurantData) {
        throw new Error('Restaurant non trouvé');
      }

      setRestaurant(restaurantData);

      // Récupérer les boissons
      const { data: drinksData } = await supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .eq('is_drink', true)
        .order('nom');

      setDrinks(drinksData || []);
    } catch (error) {
      console.error('Erreur récupération données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDrink = async () => {
    if (!newDrink.nom || !newDrink.prix_petit) {
      alert('Veuillez remplir au moins le nom et le prix petit format');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('menus')
        .insert({
          ...newDrink,
          restaurant_id: restaurant.id,
          prix: parseFloat(newDrink.prix_petit), // Prix par défaut
          prix_petit: parseFloat(newDrink.prix_petit),
          prix_moyen: newDrink.prix_moyen ? parseFloat(newDrink.prix_moyen) : null,
          prix_grand: newDrink.prix_grand ? parseFloat(newDrink.prix_grand) : null,
          is_drink: true
        })
        .select()
        .single();

      if (error) throw error;

      setDrinks(prev => [...prev, data]);
      setNewDrink({
        nom: '',
        description: '',
        prix_petit: '',
        prix_moyen: '',
        prix_grand: '',
        disponible: true,
        is_drink: true
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Erreur ajout boisson:', error);
      alert('Erreur lors de l\'ajout de la boisson');
    }
  };

  const handleEditDrink = async () => {
    if (!editingDrink.nom || !editingDrink.prix_petit) {
      alert('Veuillez remplir au moins le nom et le prix petit format');
      return;
    }

    try {
      const { error } = await supabase
        .from('menus')
        .update({
          nom: editingDrink.nom,
          description: editingDrink.description,
          prix_petit: parseFloat(editingDrink.prix_petit),
          prix_moyen: editingDrink.prix_moyen ? parseFloat(editingDrink.prix_moyen) : null,
          prix_grand: editingDrink.prix_grand ? parseFloat(editingDrink.prix_grand) : null,
          disponible: editingDrink.disponible
        })
        .eq('id', editingDrink.id);

      if (error) throw error;

      setDrinks(prev => 
        prev.map(drink => 
          drink.id === editingDrink.id ? editingDrink : drink
        )
      );
      setEditingDrink(null);
    } catch (error) {
      console.error('Erreur modification boisson:', error);
      alert('Erreur lors de la modification de la boisson');
    }
  };

  const handleDeleteDrink = async (drinkId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette boisson ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', drinkId);

      if (error) throw error;

      setDrinks(prev => prev.filter(drink => drink.id !== drinkId));
    } catch (error) {
      console.error('Erreur suppression boisson:', error);
      alert('Erreur lors de la suppression de la boisson');
    }
  };

  const toggleDrinkAvailability = async (drinkId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('menus')
        .update({ disponible: !currentStatus })
        .eq('id', drinkId);

      if (error) throw error;

      setDrinks(prev => 
        prev.map(drink => 
          drink.id === drinkId ? { ...drink, disponible: !currentStatus } : drink
        )
      );
    } catch (error) {
      console.error('Erreur modification disponibilité:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Boissons</h1>
              <p className="text-gray-600 mt-2">
                Gérez les boissons et leurs différents formats
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <FaPlus />
              Ajouter une boisson
            </button>
          </div>
        </div>

        {/* Formulaire d'ajout */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouvelle boisson</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la boisson *
                </label>
                <input
                  type="text"
                  value={newDrink.nom}
                  onChange={(e) => setNewDrink(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Coca-Cola, Eau minérale..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newDrink.description}
                  onChange={(e) => setNewDrink(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Description optionnelle..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix petit format (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newDrink.prix_petit}
                  onChange={(e) => setNewDrink(prev => ({ ...prev, prix_petit: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="2.50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix moyen format (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newDrink.prix_moyen}
                  onChange={(e) => setNewDrink(prev => ({ ...prev, prix_moyen: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="3.50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix grand format (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newDrink.prix_grand}
                  onChange={(e) => setNewDrink(prev => ({ ...prev, prix_grand: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="4.50"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddDrink}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Liste des boissons */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Boissons existantes</h3>
          </div>
          
          {drinks.length === 0 ? (
            <div className="text-center py-12">
              <FaWineGlass className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucune boisson configurée</p>
              <p className="text-gray-500 text-sm">Commencez par ajouter des boissons à votre menu</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {drinks.map((drink) => (
                <div key={drink.id} className="px-6 py-4">
                  {editingDrink?.id === drink.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input
                        type="text"
                        value={editingDrink.nom}
                        onChange={(e) => setEditingDrink(prev => ({ ...prev, nom: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nom"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingDrink.prix_petit}
                        onChange={(e) => setEditingDrink(prev => ({ ...prev, prix_petit: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Prix petit"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingDrink.prix_moyen}
                        onChange={(e) => setEditingDrink(prev => ({ ...prev, prix_moyen: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Prix moyen"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditDrink}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FaSave className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingDrink(null)}
                          className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <FaWineGlass className="h-5 w-5 text-purple-600" />
                          <h4 className="font-medium text-gray-900">{drink.nom}</h4>
                        </div>
                        {drink.description && (
                          <p className="text-sm text-gray-600 mt-1">{drink.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Petit: {drink.prix_petit}€</div>
                          {drink.prix_moyen && (
                            <div className="text-sm text-gray-500">Moyen: {drink.prix_moyen}€</div>
                          )}
                          {drink.prix_grand && (
                            <div className="text-sm text-gray-500">Grand: {drink.prix_grand}€</div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => toggleDrinkAvailability(drink.id, drink.disponible)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            drink.disponible
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {drink.disponible ? 'Disponible' : 'Indisponible'}
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingDrink(drink)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDrink(drink.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <FaTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 