'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import StarRating from './StarRating';
import { FaUser, FaCalendarAlt } from 'react-icons/fa';

export default function ReviewsSection({ restaurantId, userId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [restaurantId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      } else {
        setError('Erreur lors du chargement des avis');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des avis:', error);
      setError('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!userId) {
      alert('Vous devez être connecté pour laisser un avis');
      return;
    }

    if (newReview.rating === 0) {
      alert('Veuillez sélectionner une note');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rating: newReview.rating,
          comment: newReview.comment
        })
      });

      if (response.ok) {
        setNewReview({ rating: 0, comment: '' });
        setShowAddReview(false);
        await fetchReviews(); // Recharger les avis
        alert('Avis ajouté avec succès !');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erreur lors de l\'ajout de l\'avis');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'avis:', error);
      alert('Erreur lors de l\'ajout de l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          Avis clients ({reviews.length})
        </h3>
        
        {userId && (
          <button
            onClick={() => setShowAddReview(!showAddReview)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Laisser un avis
          </button>
        )}
      </div>

      {/* Formulaire d'ajout d'avis */}
      {showAddReview && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Votre avis</h4>
          
          <form onSubmit={handleSubmitReview}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note *
              </label>
              <StarRating
                rating={newReview.rating}
                onRatingChange={(rating) => setNewReview(prev => ({ ...prev, rating }))}
                interactive={true}
                size="lg"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Partagez votre expérience..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={4}
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Envoi...' : 'Publier l\'avis'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowAddReview(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des avis */}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun avis pour le moment.</p>
          {userId && (
            <p className="text-sm text-gray-400 mt-2">
              Soyez le premier à laisser un avis !
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    {review.users?.avatar_url ? (
                      <img
                        src={review.users.avatar_url}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <FaUser className="text-gray-600" />
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">
                      {review.users?.prenom} {review.users?.nom}
                    </p>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                </div>
                
                <div className="flex items-center text-gray-500 text-sm">
                  <FaCalendarAlt className="mr-1" />
                  {formatDate(review.created_at)}
                </div>
              </div>
              
              {review.comment && (
                <p className="text-gray-700 mt-2">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
