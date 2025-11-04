'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function PartnerMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: ''
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    sort_order: 0
  });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImageEdit, setUploadingImageEdit] = useState(false);
  const [user, setUser] = useState(null);

  const restaurantId = '4572cee6-1fc6-4f32-b007-57c46871ec70'; // ID du restaurant partenaire

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer les catégories
      const { data: categoriesData } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order');

      // Récupérer les éléments de menu
      const { data: menuData } = await supabase
        .from('menus')
        .select('*, menu_categories(name)')
        .eq('restaurant_id', restaurantId)
        .order('name');

      setCategories(categoriesData || []);
      setMenuItems(menuData || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .insert([{
          ...newCategory,
          restaurant_id: restaurantId
        }])
        .select();

      if (error) throw error;

      setCategories([...categories, data[0]]);
      setNewCategory({ name: '', description: '', sort_order: 0 });
      setShowCategoryForm(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la catégorie:', error);
      alert('Erreur lors de l\'ajout de la catégorie');
    }
  };

  const handleUpdateCategory = async () => {
    try {
      const { error } = await supabase
        .from('menu_categories')
        .update({
          name: editingCategory.name,
          description: editingCategory.description,
          sort_order: editingCategory.sort_order
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? editingCategory : cat
      ));
      setEditingCategory(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      alert('Erreur lors de la mise à jour de la catégorie');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    try {
      const { error } = await supabase
        .from('menu_categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(categories.filter(cat => cat.id !== categoryId));
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      alert('Erreur lors de la suppression de la catégorie');
    }
  };

  const handleAddMenuItem = async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .insert([{
          ...newItem,
          restaurant_id: restaurantId,
          price: parseFloat(newItem.price)
        }])
        .select();

      if (error) throw error;

      setMenuItems([...menuItems, data[0]]);
      setNewItem({ name: '', description: '', price: '', category_id: '', image_url: '' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'élément:', error);
      alert('Erreur lors de l\'ajout de l\'élément');
    }
  };

  const handleUpdateMenuItem = async () => {
    try {
      const { error } = await supabase
        .from('menus')
        .update({
          name: editingItem.name,
          description: editingItem.description,
          price: parseFloat(editingItem.price),
          category_id: editingItem.category_id,
          image_url: editingItem.image_url
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setMenuItems(menuItems.map(item => 
        item.id === editingItem.id ? editingItem : item
      ));
      setEditingItem(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setMenuItems(menuItems.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Gestion du Menu</h1>

        {/* 🎯 GESTION DES CATÉGORIES */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">📂 Catégories de Menu</h2>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Nouvelle Catégorie
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Formulaire d'ajout de catégorie */}
            {showCategoryForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Nouvelle Catégorie</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Nom de la catégorie"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Ordre d'affichage"
                    value={newCategory.sort_order}
                    onChange={(e) => setNewCategory({...newCategory, sort_order: parseInt(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => setShowCategoryForm(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Liste des catégories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {editingCategory?.id === category.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={editingCategory.description}
                        onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={editingCategory.sort_order}
                        onChange={(e) => setEditingCategory({...editingCategory, sort_order: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateCategory}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          #{category.sort_order}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🍽️ GESTION DES ÉLÉMENTS DE MENU */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">🍽️ Éléments de Menu</h2>
          </div>

          <div className="p-6">
            {/* Formulaire d'ajout d'élément */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nouvel Élément</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nom du plat"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Prix (€)"
                  value={newItem.price}
                  onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newItem.category_id}
                  onChange={(e) => setNewItem({...newItem, category_id: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image du plat
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      
                      setUploadingImage(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('folder', 'menu-images');
                        if (user?.id) formData.append('userId', user.id);

                        const response = await fetch('/api/upload-image', {
                          method: 'POST',
                          body: formData
                        });

                        const data = await response.json();
                        if (response.ok && data.imageUrl) {
                          setNewItem({...newItem, image_url: data.imageUrl});
                        } else {
                          alert(data.error || 'Erreur lors de l\'upload de l\'image');
                        }
                      } catch (error) {
                        console.error('Erreur upload:', error);
                        alert('Erreur lors de l\'upload de l\'image');
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <div className="text-sm text-blue-600">Upload en cours...</div>
                  )}
                  <div className="text-sm text-gray-600">Ou utilisez une URL :</div>
                  <input
                    type="url"
                    placeholder="https://exemple.com/image.jpg"
                    value={newItem.image_url}
                    onChange={(e) => setNewItem({...newItem, image_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {newItem.image_url && (
                    <div className="mt-2">
                      <img src={newItem.image_url} alt="Aperçu" className="w-32 h-32 object-cover rounded-md" />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleAddMenuItem}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ajouter l'élément
                </button>
              </div>
            </div>

            {/* Affichage des éléments par catégorie */}
            {categories.map((category) => {
              const categoryItems = menuItems.filter(item => item.category_id === category.id);
              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                    📂 {category.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        {editingItem?.id === item.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingItem.name}
                              onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={editingItem.description}
                              onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={editingItem.price}
                              onChange={(e) => setEditingItem({...editingItem, price: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                              value={editingItem.category_id}
                              onChange={(e) => setEditingItem({...editingItem, category_id: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Image du plat
                              </label>
                              <div className="space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    
                                    setUploadingImageEdit(true);
                                    try {
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      formData.append('folder', 'menu-images');
                                      if (user?.id) formData.append('userId', user.id);

                                      const response = await fetch('/api/upload-image', {
                                        method: 'POST',
                                        body: formData
                                      });

                                      const data = await response.json();
                                      if (response.ok && data.imageUrl) {
                                        setEditingItem({...editingItem, image_url: data.imageUrl});
                                      } else {
                                        alert(data.error || 'Erreur lors de l\'upload de l\'image');
                                      }
                                    } catch (error) {
                                      console.error('Erreur upload:', error);
                                      alert('Erreur lors de l\'upload de l\'image');
                                    } finally {
                                      setUploadingImageEdit(false);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  disabled={uploadingImageEdit}
                                />
                                {uploadingImageEdit && (
                                  <div className="text-sm text-blue-600">Upload en cours...</div>
                                )}
                                <div className="text-sm text-gray-600">Ou utilisez une URL :</div>
                                <input
                                  type="url"
                                  placeholder="https://exemple.com/image.jpg"
                                  value={editingItem.image_url}
                                  onChange={(e) => setEditingItem({...editingItem, image_url: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {editingItem.image_url && (
                                  <div className="mt-2">
                                    <img src={editingItem.image_url} alt="Aperçu" className="w-32 h-32 object-cover rounded-md" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdateMenuItem}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                Sauvegarder
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                              <span className="text-lg font-bold text-green-600">{item.price}€</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                            {item.image_url && (
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="w-full h-32 object-cover rounded-md mb-3"
                              />
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDeleteMenuItem(item.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 