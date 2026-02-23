'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { FaStar, FaHeart, FaThumbsUp, FaThumbsDown } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';

export default function OrderFeedback() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [feedback, setFeedback] = useState({
    overall_satisfaction: 0,
    food_quality: 0,
    delivery_speed: 0,
    delivery_quality: 0,
    restaurant_rating: 0,
    comment: '',
    had_issues: false,
    issue_type: '',
    issue_description: ''
  });

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) {
      setError('Commande non trouvée');
      setLoading(false);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Vous devez être connecté pour laisser un avis');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Commande non trouvée');
        return;
      }

      const data = await res.json();
      const statut = data.statut || data.status;

      if (statut !== 'livree') {
        setError('Vous ne pouvez donner votre avis que pour une commande livrée');
        return;
      }

      setOrder({
        ...data,
        order_number: data.numero_commande || data.order_number || data.id?.slice(0, 8),
        total_amount: data.total || data.total_amount,
        restaurant: data.restaurant || { name: 'Restaurant', id: data.restaurant_id },
        restaurant_id: data.restaurant?.id || data.restaurant_id,
        livreur_id: data.livreur_id
      });
    } catch (err) {
      setError('Erreur lors du chargement de la commande');
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (category, rating) => {
    setFeedback(prev => ({
      ...prev,
      [category]: rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Vous devez être connecté');
        return;
      }

      // Sauvegarder le feedback
      const feedbackData = {
        order_id: orderId,
        customer_id: session.user.id,
        restaurant_id: order.restaurant?.id || order.restaurant_id,
        ...feedback,
        submitted_at: new Date().toISOString()
      };

      const { error: feedbackError } = await supabase
        .from('order_feedback')
        .insert([feedbackData]);

      if (feedbackError) {
        throw feedbackError;
      }

      // Noter aussi le livreur (delivery_ratings) si livraison et note qualité livraison > 0
      if (order.livreur_id && (feedback.delivery_quality || feedback.delivery_speed) > 0) {
        const livreurRating = feedback.delivery_quality || feedback.delivery_speed || feedback.overall_satisfaction;
        try {
          await fetch('/api/delivery/ratings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              order_id: orderId,
              rating: livreurRating,
              comment: feedback.comment || null
            })
          });
        } catch (e) {
          console.warn('Erreur enregistrement note livreur:', e);
        }
      }

      // Si le client a signalé des problèmes, proposer une réclamation
      if (feedback.had_issues && feedback.issue_description) {
        setSuccess('feedback_submitted_with_issues');
      } else {
        setSuccess('feedback_submitted');
      }

    } catch (err) {
      setError('Erreur lors de la soumission du feedback');
      console.error('Erreur feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader title="Feedback commande" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader title="Feedback commande" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader title="Merci pour votre avis !" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-800 mb-4">
                {success === 'feedback_submitted' 
                  ? 'Merci pour votre avis positif !' 
                  : 'Merci pour votre retour !'}
              </h2>
              
              {success === 'feedback_submitted_with_issues' && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 mb-4">
                    Nous avons noté que vous avez rencontré des problèmes. 
                    Souhaitez-vous que nous vous aidions à résoudre cela ?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => router.push(`/complaint/${orderId}`)}
                      className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
                    >
                      Signaler le problème
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                    >
                      Non merci
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Votre avis nous intéresse" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Comment s'est passée votre commande ?
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Commande #{order.order_number} de {order.restaurant.name}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Satisfaction générale */}
              <div>
                <label className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Dans l'ensemble, êtes-vous satisfait de votre commande ?
                </label>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleStarClick('overall_satisfaction', rating)}
                      className="text-4xl transition-colors"
                    >
                      <FaStar 
                        className={feedback.overall_satisfaction >= rating 
                          ? 'text-yellow-400' 
                          : 'text-gray-300 dark:text-gray-600'
                        } 
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {feedback.overall_satisfaction === 0 && 'Cliquez sur les étoiles'}
                  {feedback.overall_satisfaction === 1 && 'Très insatisfait'}
                  {feedback.overall_satisfaction === 2 && 'Insatisfait'}
                  {feedback.overall_satisfaction === 3 && 'Neutre'}
                  {feedback.overall_satisfaction === 4 && 'Satisfait'}
                  {feedback.overall_satisfaction === 5 && 'Très satisfait'}
                </p>
              </div>

              {/* Détails si satisfaction > 0 */}
              {feedback.overall_satisfaction > 0 && (
                <>
                  {/* Qualité de la nourriture */}
                  <div>
                    <label className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Qualité de la nourriture
                    </label>
                    <div className="flex justify-center space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleStarClick('food_quality', rating)}
                          className="text-3xl transition-colors"
                        >
                          <FaStar 
                            className={feedback.food_quality >= rating 
                              ? 'text-yellow-400' 
                              : 'text-gray-300 dark:text-gray-600'
                            } 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vitesse de livraison */}
                  <div>
                    <label className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Vitesse de livraison
                    </label>
                    <div className="flex justify-center space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleStarClick('delivery_speed', rating)}
                          className="text-3xl transition-colors"
                        >
                          <FaStar 
                            className={feedback.delivery_speed >= rating 
                              ? 'text-yellow-400' 
                              : 'text-gray-300 dark:text-gray-600'
                            } 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Qualité du service de livraison */}
                  <div>
                    <label className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Qualité du service de livraison
                    </label>
                    <div className="flex justify-center space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleStarClick('delivery_quality', rating)}
                          className="text-3xl transition-colors"
                        >
                          <FaStar 
                            className={feedback.delivery_quality >= rating 
                              ? 'text-yellow-400' 
                              : 'text-gray-300 dark:text-gray-600'
                            } 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Commentaire */}
                  <div>
                    <label className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Un commentaire ? (optionnel)
                    </label>
                    <textarea
                      value={feedback.comment}
                      onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                      className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      rows={4}
                      placeholder="Partagez votre expérience..."
                    />
                  </div>

                  {/* Avez-vous rencontré des problèmes ? */}
                  <div>
                    <label className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Avez-vous rencontré des problèmes ?
                    </label>
                    <div className="flex justify-center space-x-4">
                      <button
                        type="button"
                        onClick={() => setFeedback(prev => ({ ...prev, had_issues: false }))}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg border-2 transition-colors ${
                          !feedback.had_issues 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-gray-300 text-gray-700'
                        }`}
                      >
                        <FaThumbsUp />
                        <span>Non, tout va bien</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedback(prev => ({ ...prev, had_issues: true }))}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg border-2 transition-colors ${
                          feedback.had_issues 
                            ? 'border-red-500 bg-red-50 text-red-700' 
                            : 'border-gray-300 text-gray-700'
                        }`}
                      >
                        <FaThumbsDown />
                        <span>Oui, j'ai eu des problèmes</span>
                      </button>
                    </div>
                  </div>

                  {/* Description du problème si applicable */}
                  {feedback.had_issues && (
                    <div>
                      <label className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Pouvez-vous nous décrire le problème ?
                      </label>
                      <textarea
                        value={feedback.issue_description}
                        onChange={(e) => setFeedback(prev => ({ ...prev, issue_description: e.target.value }))}
                        className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        rows={3}
                        placeholder="Décrivez le problème rencontré..."
                      />
                    </div>
                  )}
                </>
              )}

              {/* Bouton de soumission */}
              <div className="text-center">
                <button
                  type="submit"
                  disabled={feedback.overall_satisfaction === 0 || submitting}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Envoi en cours...' : 'Envoyer mon avis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
