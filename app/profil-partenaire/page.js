'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ProfilPartenaire() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
    email: '',
    type_cuisine: '',
    description: '',
    horaires: {
      lundi: { ouverture: '09:00', fermeture: '22:00' },
      mardi: { ouverture: '09:00', fermeture: '22:00' },
      mercredi: { ouverture: '09:00', fermeture: '22:00' },
      jeudi: { ouverture: '09:00', fermeture: '22:00' },
      vendredi: { ouverture: '09:00', fermeture: '22:00' },
      samedi: { ouverture: '09:00', fermeture: '22:00' },
      dimanche: { ouverture: '09:00', fermeture: '22:00' }
    }
  });
  const router = useRouter();

  useEffect(() => {
    const getUserAndRestaurant = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (userError || !userData || !userData.role.split(',').includes('restaurant')) {
        router.push('/');
        return;
      }
      setUser(session.user);
      setFormData(prev => ({ ...prev, email: session.user.email }));
      
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      if (restoError && restoError.code !== 'PGRST116') {
        setError(restoError.message);
      }
      setRestaurant(resto);
      setLoading(false);
    };
    getUserAndRestaurant();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          user_id: user.id,
          ...formData,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      setRestaurant(data);
      setSuccess('Restaurant créé avec succès !');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Profil Restaurant</h1>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

        {!restaurant ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Créer votre restaurant</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du restaurant</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                  <input
                    type="text"
                    name="code_postal"
                    value={formData.code_postal}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    name="ville"
                    value={formData.ville}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de cuisine</label>
                <select
                  name="type_cuisine"
                  value={formData.type_cuisine}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Sélectionnez un type de cuisine</option>
                  <option value="francaise">Française</option>
                  <option value="italienne">Italienne</option>
                  <option value="japonaise">Japonaise</option>
                  <option value="chinoise">Chinoise</option>
                  <option value="indienne">Indienne</option>
                  <option value="mexicaine">Mexicaine</option>
                  <option value="libanaise">Libanaise</option>
                  <option value="fast-food">Fast-food</option>
                  <option value="pizzeria">Pizzeria</option>
                  <option value="burger">Burger</option>
                  <option value="sushi">Sushi</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  rows="4"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Création en cours...' : 'Créer le restaurant'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Informations du restaurant</h2>
            <div className="space-y-4">
              <p><strong>Nom :</strong> {restaurant.nom}</p>
              <p><strong>Email :</strong> {restaurant.email}</p>
              <p><strong>Adresse :</strong> {restaurant.adresse}</p>
              <p><strong>Code postal :</strong> {restaurant.code_postal}</p>
              <p><strong>Ville :</strong> {restaurant.ville}</p>
              <p><strong>Téléphone :</strong> {restaurant.telephone}</p>
              <p><strong>Type de cuisine :</strong> {restaurant.type_cuisine}</p>
              <p><strong>Description :</strong> {restaurant.description}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 