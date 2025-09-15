'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';

export default function RestaurantSettings() {
  const [settings, setSettings] = useState({
    name: '',
    address: '',
    description: '',
    banner_image_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkUserAndFetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.user_metadata.role !== 'restaurant') {
            router.push('/login');
            return;
        }
        fetchSettings();
    };
    checkUserAndFetchSettings();
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

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/restaurants/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Mise à jour...');
    try {
      const response = await fetchWithAuth('/api/restaurants/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      setMessage('Paramètres mis à jour avec succès !');
    } catch (error) {
      setMessage(`Erreur: ${error.message}`);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
        <Navbar />
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Paramètres du Restaurant</h1>
            {message && <p className="mb-4">{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name">Nom du restaurant</label>
                    <input type="text" name="name" id="name" value={settings.name} onChange={handleInputChange} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label htmlFor="address">Adresse</label>
                    <input type="text" name="address" id="address" value={settings.address} onChange={handleInputChange} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label htmlFor="description">Description</label>
                    <textarea name="description" id="description" value={settings.description} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea>
                </div>
                <div>
                    <label htmlFor="banner_image_url">URL de la bannière</label>
                    <input type="text" name="banner_image_url" id="banner_image_url" value={settings.banner_image_url} onChange={handleInputChange} className="w-full p-2 border rounded" />
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Sauvegarder</button>
            </form>
        </div>
    </div>
  );
} 