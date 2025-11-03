'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import HomepageNavbar from '../../../components/HomepageNavbar';
import { FaArrowLeft, FaImage, FaEdit, FaTrash, FaEye, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';

export default function AdvertisingManagement() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]);

  useEffect(() => {
    const checkUserAndFetchAds = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await fetchAds(user.id);
      setLoading(false);
    };
    checkUserAndFetchAds();
  }, [router]);

  const fetchAds = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Erreur récupération publicités:', error);
      setAds([]);
    }
  };

  const getStatusBadge = (ad) => {
    if (!ad.is_active) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactif</span>;
    }
    
    const today = new Date();
    const startDate = ad.start_date ? new Date(ad.start_date) : null;
    const endDate = ad.end_date ? new Date(ad.end_date) : null;

    if (startDate && today < startDate) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Programmé</span>;
    }
    if (endDate && today > endDate) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Expiré</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Actif</span>;
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
      <HomepageNavbar user={user} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <FaArrowLeft className="mr-2" />
              Retour
            </button>
            <h1 className="text-3xl font-bold">Gestion de mes publicités</h1>
          </div>
          <button
            onClick={() => router.push('/advertising/request')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FaImage className="inline mr-2" />
            Nouvelle publicité
          </button>
        </div>

        {ads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FaImage className="text-6xl text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Aucune publicité</h2>
            <p className="text-gray-500 mb-6">Vous n'avez pas encore de publicité active.</p>
            <button
              onClick={() => router.push('/advertising/request')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Demander une publicité
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{ad.title || 'Sans titre'}</h3>
                    {getStatusBadge(ad)}
                  </div>
                </div>

                {ad.image_url && (
                  <div className="mb-4">
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Position:</span>
                    <span className="font-medium">{ad.position}</span>
                  </div>
                  {ad.start_date && (
                    <div className="flex justify-between">
                      <span>Début:</span>
                      <span>{new Date(ad.start_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  {ad.end_date && (
                    <div className="flex justify-between">
                      <span>Fin:</span>
                      <span>{new Date(ad.end_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Vues:</span>
                    <span className="font-medium">{ad.impressions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clics:</span>
                    <span className="font-medium">{ad.clicks || 0}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/profile/advertising/${ad.id}/edit`)}
                    className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                  >
                    <FaEdit className="inline mr-1" />
                    Modifier
                  </button>
                  <button
                    onClick={() => router.push(`/profile/advertising/${ad.id}`)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    <FaEye className="inline mr-1" />
                    Voir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

