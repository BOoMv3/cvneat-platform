'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

export default function MenuManagement() {
  const router = useRouter();
  const [menu, setMenu] = useState({ categories: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image: ''
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const checkUserAndFetchMenu = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.user_metadata.role !== 'partner') {
        router.push('/login');
        return;
      }
      fetchMenu();
    };
    checkUserAndFetchMenu();
  }, [router]);

  const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
  };

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/partner/menu');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du menu');
      }
      const data = await response.json();
      setMenu(data);
      if (data.categories.length > 0) {
        setSelectedCategory(data.categories[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('/api/partner/menu/items', {
        method: 'POST',
        body: JSON.stringify({
          ...newItem,
          price: parseFloat(newItem.price),
        }),
      });
      if (!response.ok) throw new Error("Erreur lors de l'ajout de l'article");
      fetchMenu();
      setNewItem({ name: '', description: '', price: '', category_id: '', image: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;
    try {
      const response = await fetchWithAuth(`/api/partner/menu/items?id=${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression de l'article");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCategory = async (categoryId, name) => {
    try {
      const response = await fetchWithAuth('/api/partner/menu', {
        method: 'PUT',
        body: JSON.stringify({ type: 'category', id: categoryId, name }),
      });
      if (!response.ok) throw new Error('Failed to update category');
      fetchMenu();
      setEditingCategory(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette catégorie et tous ses articles ?")) return;
    try {
      const response = await fetchWithAuth('/api/partner/menu', {
        method: 'DELETE',
        body: JSON.stringify({ type: 'category', id: categoryId }),
      });
      if (!response.ok) throw new Error('Failed to delete category');
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateItem = async (itemId, data) => {
    try {
      const response = await fetchWithAuth('/api/partner/menu', {
        method: 'PUT',
        body: JSON.stringify({ type: 'item', id: itemId, ...data }),
      });
      if (!response.ok) throw new Error('Failed to update item');
      fetchMenu();
      setEditingItem(null);
    } catch (err) {
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
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Catégories */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Catégories</h2>
              <div className="space-y-2">
                {menu.categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg ${
                      selectedCategory === category.id
                        ? 'bg-black text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {menu.categories.find(c => c.id === selectedCategory)?.name || 'Sélectionnez une catégorie'}
                  </h2>
                  <button
                    onClick={() => setIsAddingItem(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                  >
                    <FaPlus /> Ajouter un item
                  </button>
                </div>

                {isAddingItem && (
                  <form onSubmit={handleAddItem} className="mb-6 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={newItem.name}
                        onChange={handleInputChange}
                        name="name"
                        placeholder="Nom de l'item"
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                      <input
                        type="number"
                        value={newItem.price}
                        onChange={handleInputChange}
                        name="price"
                        placeholder="Prix"
                        step="0.01"
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                      <input
                        type="text"
                        value={newItem.description}
                        onChange={handleInputChange}
                        name="description"
                        placeholder="Description"
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                      <input
                        type="text"
                        value={newItem.image}
                        onChange={handleInputChange}
                        name="image"
                        placeholder="URL de l'image"
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="flex justify-end gap-4 mt-4">
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                      >
                        Ajouter
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {menu.items
                    .filter(item => item.categoryId === selectedCategory)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                          <p className="text-sm font-medium">{item.price}€</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingItem(item.id)}
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 