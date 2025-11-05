'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaTrash, 
  FaExclamationTriangle,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaLock
} from 'react-icons/fa';

export default function AdminReset() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: avertissement, 2: confirmation, 3: saisie du mot de confirmation
  const [confirmationText, setConfirmationText] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [deletedCounts, setDeletedCounts] = useState(null);

  const REQUIRED_CONFIRMATION = 'RÉINITIALISER TOUT';

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/admin/reset/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Erreur récupération stats:', err);
      setError('Impossible de récupérer les statistiques');
    }
  };

  const handleReset = async () => {
    if (confirmationText !== REQUIRED_CONFIRMATION) {
      setError('Le texte de confirmation ne correspond pas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation: confirmationText
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réinitialisation');
      }

      setDeletedCounts(data);
      setSuccess(true);
      setStep(4); // Étape de succès
    } catch (err) {
      console.error('Erreur réinitialisation:', err);
      setError(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  // Charger les stats au montage
  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-2 fold:px-2 xs:px-3 sm:px-4 py-4 fold:py-4 xs:py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors mb-4 text-sm sm:text-base"
          >
            <FaArrowLeft className="mr-2" />
            Retour au dashboard
          </button>
          <h1 className="text-xl fold:text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🔄 Réinitialisation du site
          </h1>
          <p className="text-sm fold:text-sm xs:text-base text-gray-600 dark:text-gray-400">
            Réinitialiser toutes les données pour le lancement officiel
          </p>
        </div>

        {/* Statistiques actuelles */}
        {stats && step === 1 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 fold:p-4 xs:p-6 mb-6">
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4 flex items-center">
              <FaExclamationTriangle className="mr-2" />
              Données actuelles à supprimer
            </h2>
            <div className="grid grid-cols-1 fold:grid-cols-1 xs:grid-cols-2 gap-3 fold:gap-3 xs:gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs fold:text-xs xs:text-sm text-gray-600 dark:text-gray-400">Commandes</p>
                <p className="text-lg fold:text-lg xs:text-xl font-bold text-gray-900 dark:text-white">{stats.commandes || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs fold:text-xs xs:text-sm text-gray-600 dark:text-gray-400">Détails de commandes</p>
                <p className="text-lg fold:text-lg xs:text-xl font-bold text-gray-900 dark:text-white">{stats.details_commande || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs fold:text-xs xs:text-sm text-gray-600 dark:text-gray-400">Livraisons</p>
                <p className="text-lg fold:text-lg xs:text-xl font-bold text-gray-900 dark:text-white">{stats.livraisons || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs fold:text-xs xs:text-sm text-gray-600 dark:text-gray-400">Réclamations</p>
                <p className="text-lg fold:text-lg xs:text-xl font-bold text-gray-900 dark:text-white">{stats.reclamations || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Avertissement */}
        {step === 1 && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 fold:p-4 xs:p-6 mb-6">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-2xl mr-3 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                  ⚠️ ATTENTION : Action irréversible
                </h2>
                <ul className="list-disc list-inside space-y-2 text-sm fold:text-sm xs:text-base text-red-700 dark:text-red-300">
                  <li>Toutes les <strong>commandes</strong> seront supprimées définitivement</li>
                  <li>Tous les <strong>détails de commandes</strong> seront supprimés</li>
                  <li>Toutes les <strong>livraisons</strong> seront supprimées</li>
                  <li>Toutes les <strong>réclamations</strong> seront supprimées</li>
                  <li>Les <strong>restaurants, utilisateurs et menus</strong> seront conservés</li>
                </ul>
                <p className="mt-4 text-sm fold:text-sm xs:text-base font-semibold text-red-800 dark:text-red-200">
                  Cette action ne peut pas être annulée !
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation étape 1 */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 fold:p-4 xs:p-6 mb-6">
            <p className="text-sm fold:text-sm xs:text-base text-gray-700 dark:text-gray-300 mb-4">
              Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est définitive.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(2)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 min-h-[44px] touch-manipulation"
              >
                <FaTrash className="h-5 w-5" />
                <span>Oui, je veux réinitialiser</span>
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-semibold transition-colors min-h-[44px] touch-manipulation"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Confirmation étape 2 - Saisie du texte */}
        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 fold:p-4 xs:p-6 mb-6">
            <div className="flex items-center mb-4">
              <FaLock className="text-red-600 dark:text-red-400 text-xl mr-3" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Confirmation finale requise
              </h2>
            </div>
            <p className="text-sm fold:text-sm xs:text-base text-gray-700 dark:text-gray-300 mb-4">
              Pour confirmer cette action destructrice, veuillez saisir exactement le texte suivant :
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
              <code className="text-lg font-mono font-bold text-red-600 dark:text-red-400">
                {REQUIRED_CONFIRMATION}
              </code>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Saisissez le texte de confirmation :
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                placeholder={REQUIRED_CONFIRMATION}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white text-lg font-mono uppercase"
                autoFocus
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReset}
                disabled={loading || confirmationText !== REQUIRED_CONFIRMATION}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 min-h-[44px] touch-manipulation"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin h-5 w-5" />
                    <span>Réinitialisation en cours...</span>
                  </>
                ) : (
                  <>
                    <FaTrash className="h-5 w-5" />
                    <span>Réinitialiser maintenant</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setConfirmationText('');
                }}
                disabled={loading}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-semibold transition-colors min-h-[44px] touch-manipulation"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* Message de succès */}
        {success && deletedCounts && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 fold:p-4 xs:p-6 mb-6">
            <div className="flex items-start">
              <FaCheckCircle className="text-green-600 dark:text-green-400 text-2xl mr-3 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-green-800 dark:text-green-200 mb-4">
                  ✅ Réinitialisation réussie !
                </h2>
                <p className="text-sm fold:text-sm xs:text-base text-green-700 dark:text-green-300 mb-4">
                  Le site a été réinitialisé avec succès. Toutes les données de commandes et livraisons ont été supprimées.
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Données supprimées :</h3>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• {deletedCounts.commandes || 0} commande(s)</li>
                    <li>• {deletedCounts.details_commande || 0} détail(s) de commande(s)</li>
                    <li>• {deletedCounts.livraisons || 0} livraison(s)</li>
                    <li>• {deletedCounts.reclamations || 0} réclamation(s)</li>
                  </ul>
                </div>
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors min-h-[44px] touch-manipulation"
                >
                  Retour au dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 fold:p-4 xs:p-6 mb-6">
            <div className="flex items-start">
              <FaTimesCircle className="text-red-600 dark:text-red-400 text-2xl mr-3 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                  ❌ Erreur
                </h2>
                <p className="text-sm fold:text-sm xs:text-base text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

