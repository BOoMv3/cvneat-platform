'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaUtensils, FaWineGlass } from 'react-icons/fa';

export default function MenuSupplements() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSupplement, setEditingSupplement] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupplement, setNewSupplement] = useState({
    nom: '',
    description: '',
    prix: '',
    menu_item_id: '',
    disponible: true
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

    if (userData?.role !== 'partner') {
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

      // Récupérer les éléments du menu
      const { data: menuData } = await supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('nom');

      setMenuItems(menuData || []);

      // Récupérer tous les suppléments
      const { data: supplementsData } = await supabase
        .from('menu_supplements')
        .select(`
          *,
          menu_item:menus(nom)
        `)
        .in('menu_item_id', menuData?.map(item => item.id) || [])
        .order('ordre');

      setSupplements(supplementsData || []);
    } catch (error) {
      console.error('Erreur récupération données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplement = async () => {
    if (!newSupplement.nom || !newSupplement.prix || !newSupplement.menu_item_id) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('menu_supplements')
        .insert({
          ...newSupplement,
          prix: parseFloat(newSupplement.prix),
          ordre: supplements.length + 1
        })
        .select()
        .single();

      if (error) throw error;

      setSupplements(prev => [...prev, data]);
      setNewSupplement({
        nom: '',
        description: '',
        prix: '',
        menu_item_id: '',
        disponible: true
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Erreur ajout supplément:', error);
      alert('Erreur lors de l\'ajout du supplément');
    }
  };

  const handleEditSupplement = async () => {
    if (!editingSupplement.nom || !editingSupplement.prix) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_supplements')
        .update({
          nom: editingSupplement.nom,
          description: editingSupplement.description,
          prix: parseFloat(editingSupplement.prix),
          disponible: editingSupplement.disponible
        })
        .eq('id', editingSupplement.id);

      if (error) throw error;

      setSupplements(prev => 
        prev.map(sup => 
          sup.id === editingSupplement.id ? editingSupplement : sup
        )
      );
      setEditingSupplement(null);
    } catch (error) {
      console.error('Erreur modification supplément:', error);
      alert('Erreur lors de la modification du supplément');
    }
  };

  const handleDeleteSupplement = async (supplementId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce supplément ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_supplements')
        .delete()
        .eq('id', supplementId);

      if (error) throw error;

      setSupplements(prev => prev.filter(sup => sup.id !== supplementId));
    } catch (error) {
      console.error('Erreur suppression supplément:', error);
      alert('Erreur lors de la suppression du supplément');
    }
  };

  const toggleSupplementAvailability = async (supplementId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('menu_supplements')
        .update({ disponible: !currentStatus })
        .eq('id', supplementId);

      if (error) throw error;

      setSupplements(prev => 
        prev.map(sup => 
          sup.id === supplementId ? { ...sup, disponible: !currentStatus } : sup
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
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Suppléments</h1>
              <p className="text-gray-600 mt-2">
                Gérez les suppléments et options pour vos plats
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <FaPlus />
              Ajouter un supplément
            </button>
          </div>
        </div>

        {/* Formulaire d'ajout */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouveau supplément</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du supplément *
                </label>
                <input
                  type="text"
                  value={newSupplement.nom}
                  onChange={(e) => setNewSupplement(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Fromage râpé, Bacon, Sauce..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newSupplement.prix}
                  onChange={(e) => setNewSupplement(prev => ({ ...prev, prix: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plat associé *
                </label>
                <select
                  value={newSupplement.menu_item_id}
                  onChange={(e) => setNewSupplement(prev => ({ ...prev, menu_item_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Sélectionner un plat</option>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.nom}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newSupplement.description}
                  onChange={(e) => setNewSupplement(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Description optionnelle..."
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
                onClick={handleAddSupplement}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Liste des suppléments */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Suppléments existants</h3>
          </div>
          
          {supplements.length === 0 ? (
            <div className="text-center py-12">
              <FaUtensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun supplément configuré</p>
              <p className="text-gray-500 text-sm">Commencez par ajouter des suppléments pour vos plats</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {supplements.map((supplement) => (
                <div key={supplement.id} className="px-6 py-4">
                  {editingSupplement?.id === supplement.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={editingSupplement.nom}
                        onChange={(e) => setEditingSupplement(prev => ({ ...prev, nom: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingSupplement.prix}
                        onChange={(e) => setEditingSupplement(prev => ({ ...prev, prix: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditSupplement}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FaSave className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingSupplement(null)}
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
                          <h4 className="font-medium text-gray-900">{supplement.nom}</h4>
                          <span className="text-sm text-gray-500">
                            pour {supplement.menu_item?.nom}
                          </span>
                        </div>
                        {supplement.description && (
                          <p className="text-sm text-gray-600 mt-1">{supplement.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-900">{supplement.prix}€</span>
                        
                        <button
                          onClick={() => toggleSupplementAvailability(supplement.id, supplement.disponible)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            supplement.disponible
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {supplement.disponible ? 'Disponible' : 'Indisponible'}
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingSupplement(supplement)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplement(supplement.id)}
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