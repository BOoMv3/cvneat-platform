'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import { 
  FaArrowLeft, 
  FaStar, 
  FaUser, 
  FaUtensils,
  FaCalendarAlt,
  FaThumbsUp,
  FaThumbsDown
} from 'react-icons/fa';

export default function DeliveryReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0
  });
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {}
  });
  const router = useRouter();

  useEffect(() => {
    fetchReviews();
  }, [pagination.page]);

  useEffect(() => {
    if (reviews.length > 0) {
      fetchStats();
    }
  }, [reviews, pagination.total]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/delivery/reviews?page=${pagination.page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setReviews(data.reviews);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }));
      } else {
        console.error('Erreur récupération avis:', data.error);
      }
    } catch (error) {
      console.error('Erreur récupération avis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Calculer les stats depuis les reviews déjà chargées
      if (reviews.length > 0) {
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        setStats({
          averageRating,
          totalReviews: pagination.total || reviews.length,
          ratingDistribution: calculateRatingDistribution(reviews)
        });
      }
    } catch (error) {
      console.error('Erreur calcul stats:', error);
    }
  };

  const calculateRatingDistribution = (reviews) => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating] = (distribution[review.rating] || 0) + 1;
    });
    return distribution;
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingText = (rating) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4) return 'Très bien';
    if (rating >= 3.5) return 'Bien';
    if (rating >= 3) return 'Correct';
    return 'À améliorer';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DeliveryNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">⭐ Avis clients</h1>
          <p className="text-gray-600 mt-2">{pagination.total} avis au total</p>
        </div>

        {/* Statistiques */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(stats.averageRating))}
              </div>
              <p className={`text-sm font-medium ${getRatingColor(stats.averageRating)}`}>
                {getRatingText(stats.averageRating)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Note moyenne</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {pagination.total}
              </div>
              <p className="text-sm text-gray-600">Avis reçus</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stats.ratingDistribution[5] || 0}
              </div>
              <div className="flex justify-center mb-2">
                {renderStars(5)}
              </div>
              <p className="text-sm text-gray-600">Avis 5 étoiles</p>
            </div>
          </div>
        </div>

        {/* Distribution des notes */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Distribution des notes</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.ratingDistribution[rating] || 0;
              const percentage = pagination.total > 0 ? (count / pagination.total) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <FaStar className="h-3 w-3 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste des avis */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Avis récents</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FaStar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun avis pour le moment</p>
            </div>
          ) : (
            <div className="divide-y">
              {reviews.map((review) => (
                <div key={review.id} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex">
                        {renderStars(review.rating)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{review.customer_name}</p>
                        <p className="text-sm text-gray-600">{review.restaurant_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(review.date).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {review.order_date 
                          ? new Date(review.order_date).toLocaleDateString('fr-FR')
                          : new Date(review.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  
                  {review.comment && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 italic">"{review.comment}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              
              <span className="px-3 py-2 text-gray-700">
                Page {pagination.page} sur {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 