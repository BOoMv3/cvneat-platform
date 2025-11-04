'use client';

import { useState, useEffect } from 'react';
import { FaStar, FaUser, FaThumbsUp, FaThumbsDown } from 'react-icons/fa';
import StarRating from './StarRating';

export default function ReviewsSection({ restaurantId, className = '' }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: '',
    name: ''
  });

  useEffect(() => {
    fetchReviews();
  }, [restaurantId]);

  const fetchReviews = async () => {
    try {
      // Récupérer les vrais avis depuis la base de données
      // Pour l'instant, on laisse vide - les avis seront ajoutés par les clients après leurs commandes
      setReviews([]);
    } catch (error) {
      console.error('Erreur lors du chargement des avis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (newReview.rating === 0 || !newReview.comment.trim()) {
      alert('Veuillez donner une note et écrire un commentaire');
      return;
    }

    try {
      // Simulation de l'ajout d'un avis
      const review = {
        id: reviews.length + 1,
        name: newReview.name || 'Anonyme',
        rating: newReview.rating,
        comment: newReview.comment,
        date: new Date().toISOString().split('T')[0],
        helpful: 0
      };

      setReviews([review, ...reviews]);
      setNewReview({ rating: 0, comment: '', name: '' });
      setShowAddReview(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'avis:', error);
    }
  };

  const handleHelpful = (reviewId) => {
    setReviews(reviews.map(review => 
      review.id === reviewId 
        ? { ...review, helpful: review.helpful + 1 }
        : review
    ));
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-20 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Avis clients
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <StarRating rating={averageRating} size="lg" />
              <span className="text-gray-600 dark:text-gray-300">
                {averageRating.toFixed(1)} sur 5
              </span>
            </div>
            <span className="text-gray-500 dark:text-gray-400">
              ({reviews.length} avis)
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAddReview(!showAddReview)}
          className="bg-orange-500 dark:bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors"
        >
          Laisser un avis
        </button>
      </div>

      {/* Formulaire d'ajout d'avis */}
      {showAddReview && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 bg-gray-50 dark:bg-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Votre avis</h4>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Votre note
              </label>
              <StarRating
                rating={newReview.rating}
                interactive={true}
                onRatingChange={(rating) => setNewReview({ ...newReview, rating })}
                size="lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom (optionnel)
              </label>
              <input
                type="text"
                value={newReview.name}
                onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                placeholder="Votre nom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Votre commentaire
              </label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                rows="4"
                placeholder="Partagez votre expérience..."
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-orange-500 dark:bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors"
              >
                Publier l'avis
              </button>
              <button
                type="button"
                onClick={() => setShowAddReview(false)}
                className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des avis */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <FaUser className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Aucun avis pour le moment</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Soyez le premier à laisser un avis !</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                    <FaUser className="text-orange-500 dark:text-orange-400" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">{review.name}</h5>
                    <div className="flex items-center space-x-2">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-gray-500 dark:text-gray-400 text-sm">{review.date}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-3 ml-13">{review.comment}</p>
              
              <div className="flex items-center space-x-4 ml-13">
                <button
                  onClick={() => handleHelpful(review.id)}
                  className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  <FaThumbsUp className="text-sm" />
                  <span className="text-sm">Utile ({review.helpful})</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}