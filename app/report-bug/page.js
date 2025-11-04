'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaBug, FaExclamationTriangle, FaCheckCircle, FaSpinner } from 'react-icons/fa';

export default function ReportBug() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    browser: '',
    severity: 'medium'
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Détecter le navigateur
      const userAgent = navigator.userAgent;
      let browser = 'Unknown';
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';
      
      setFormData(prev => ({
        ...prev,
        browser: browser,
        url: typeof window !== 'undefined' ? window.location.href : ''
      }));
    };
    checkUser();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validation
      if (!formData.title.trim() || formData.title.trim().length < 5) {
        throw new Error('Le titre doit contenir au moins 5 caractères');
      }

      if (!formData.description.trim() || formData.description.trim().length < 20) {
        throw new Error('La description doit contenir au moins 20 caractères');
      }

      // Récupérer le token d'authentification si disponible
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Envoyer le signalement
      const response = await fetch('/api/bugs/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          ...formData,
          userId: user?.id || null,
          userAgent: navigator.userAgent,
          screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi du signalement');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Signalement envoyé !</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Merci pour votre signalement. Nous allons examiner ce problème et le corriger dans les plus brefs délais.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <FaBug className="text-4xl text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Signaler un bug</h1>
              <p className="text-gray-600 dark:text-gray-300">Aidez-nous à améliorer CVN'Eat</p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-2" />
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre du bug *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Ex: Le panier ne se met pas à jour après ajout d'un article"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                required
                minLength={5}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description détaillée *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                placeholder="Décrivez le problème en détail : que s'est-il passé ? Que devriez-vous voir ? Quel est le comportement attendu ?"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                required
                minLength={20}
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL de la page (automatique)
              </label>
              <input
                type="text"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                readOnly
              />
            </div>

            {/* Gravité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gravité du bug *
              </label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                required
              >
                <option value="low">Faible - Problème mineur, ne bloque pas l'utilisation</option>
                <option value="medium">Moyenne - Problème gênant mais contournable</option>
                <option value="high">Élevée - Problème bloquant ou critique</option>
              </select>
            </div>

            {/* Informations techniques */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Informations techniques automatiques :</p>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>Navigateur : {formData.browser || 'Détection...'}</p>
                <p>Résolution : {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'}</p>
                <p>Utilisateur : {user ? `${user.email || 'Connecté'}` : 'Non connecté'}</p>
              </div>
            </div>

            {/* Bouton de soumission */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 dark:bg-red-700 text-white py-3 px-6 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-semibold"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <FaBug className="mr-2" />
                    Envoyer le signalement
                  </>
                )}
              </button>
            </div>

            {/* Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-300 text-sm">
                <strong>Note :</strong> Tous les signalements sont examinés par notre équipe. 
                Nous vous remercions de votre patience et de votre aide pour améliorer CVN'Eat !
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

