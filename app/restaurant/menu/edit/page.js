'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaTrash, FaEdit, FaImage } from 'react-icons/fa';
import { supabase } from '../../../../lib/supabase';
import Image from 'next/image';

export default function EditMenu() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      fetchMenu();
    };
    checkAuth();
  }, [router]);

  const fetchMenu = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*, categories(*)')
        .eq('restaurant_id', user.id);

      if (menuError) throw menuError;

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', user.id);

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData);
      setItems(menuData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    try {
      setUploadingImage(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `menu-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurants')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurants')
        .getPublicUrl(filePath);

      setSelectedImage(publicUrl);
      setShowImageModal(false);
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      setError('Erreur lors du téléchargement de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('categories')
        .insert([
          { name: newCategory, restaurant_id: user.id }
        ])
        .select()
        .single();

      if (error) throw error;
      setCategories([...categories, data]);
      setNewCategory('');
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('menu_items')
        .insert([
          {
            ...newItem,
            restaurant_id: user.id,
            image: selectedImage || newItem.image
          }
        ])
        .select()
        .single();

      if (error) throw error;
      setItems([...items, data]);
      setNewItem({
        name: '',
        description: '',
        price: '',
        categoryId: '',
        image: ''
      });
      setSelectedImage(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({
          ...editingItem,
          image: selectedImage || editingItem.image
        })
        .eq('id', editingItem.id)
        .select()
        .single();

      if (error) throw error;
      setItems(items.map(item => item.id === data.id ? data : item));
      setEditingItem(null);
      setSelectedImage(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setItems(items.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Gestion du menu</h1>
            <button
              onClick={() => router.push('/restaurant/dashboard')}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Retour au tableau de bord
            </button>
          </div>

          {/* Ajout de catégorie */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Ajouter une catégorie</h2>
            <form onSubmit={handleAddCategory} className="flex gap-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nom de la catégorie"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
              <button
                type="submit"
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Ajouter
              </button>
            </form>
          </div>

          {/* Liste des catégories et items */}
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">{category.name}</h2>
                
                {/* Formulaire d'ajout d'item */}
                <form onSubmit={handleAddItem} className="mb-6">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                      type="text"
                      value={newItem.categoryId === category.id ? newItem.name : ''}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value, categoryId: category.id })}
                      placeholder="Nom de l'item"
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                    <input
                      type="text"
                      value={newItem.categoryId === category.id ? newItem.description : ''}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value, categoryId: category.id })}
                      placeholder="Description"
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                    <input
                      type="number"
                      value={newItem.categoryId === category.id ? newItem.price : ''}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value, categoryId: category.id })}
                      placeholder="Prix"
                      step="0.01"
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setShowImageModal(true);
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <FaImage />
                        {selectedImage ? 'Changer l\'image' : 'Ajouter une image'}
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </form>

                {/* Liste des items */}
                <div className="space-y-4">
                  {items
                    .filter(item => item.category_id === category.id)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          {item.image && (
                            <div className="relative w-16 h-16">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <p className="text-orange-600 font-medium">{item.price}€</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setSelectedImage(item.image);
                            }}
                            className="p-2 text-gray-600 hover:text-black"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal d'édition */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Modifier l'item</h2>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setSelectedImage(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="mt-1 block w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="mt-1 block w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prix</label>
                <input
                  type="number"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                  step="0.01"
                  className="mt-1 block w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <div className="mt-1 flex items-center gap-4">
                  {selectedImage && (
                    <div className="relative w-20 h-20">
                      <Image
                        src={selectedImage}
                        alt="Preview"
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowImageModal(true)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FaImage />
                    {selectedImage ? 'Changer l\'image' : 'Ajouter une image'}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setSelectedImage(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'upload d'image */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Ajouter une image</h2>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-black file:text-white
                  hover:file:bg-gray-800"
              />
              {uploadingImage && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 