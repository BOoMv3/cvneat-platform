'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function Inscription() {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
    telephone: '',
    adresse: '',
    codePostal: '',
    ville: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [manualConfirmationLink, setManualConfirmationLink] = useState('');

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
    setSuccess(false);
    setManualConfirmationLink('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', formData.email)
      .maybeSingle();
    
    if (existingUser) {
      setError('Cet email est déjà utilisé');
      setLoading(false);
      return;
    }

    // Inscription avec Supabase Auth avec redirection email
    // Note: Pour activer les emails de confirmation, aller dans Supabase Dashboard > 
    // Authentication > Settings et activer "Enable email confirmations"
    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cvneat.fr';
    const redirectBase = rawSiteUrl.endsWith('/') ? rawSiteUrl.slice(0, -1) : rawSiteUrl;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${redirectBase}/auth/confirm`,
        data: {
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.telephone
        }
      }
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Vérifier si l'utilisateur a été créé
    if (!signUpData.user) {
      setError('Erreur lors de la création du compte');
      setLoading(false);
      return;
    }

    // Ajout des infos complémentaires dans la table users
    const { error: insertError } = await supabase.from('users').insert({
      id: signUpData.user.id,
      nom: formData.nom,
      prenom: formData.prenom,
      email: formData.email,
      telephone: formData.telephone,
      adresse: formData.adresse,
      code_postal: formData.codePostal,
      ville: formData.ville,
      role: formData.role || 'user',
    });
    if (insertError) {
      // Si l'insertion échoue, supprimer l'utilisateur Auth pour éviter les doublons
      console.error('Erreur insertion utilisateur:', insertError);
      await supabase.auth.admin.deleteUser(signUpData.user.id).catch(() => {});
      setError(insertError.message || 'Erreur lors de la création du profil');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, sendEmail: false }),
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.confirmationUrl) {
          setManualConfirmationLink(payload.confirmationUrl);
          if (typeof window !== 'undefined') {
            window.open(payload.confirmationUrl, '_blank', 'noopener,noreferrer');
          }
        }
      } else {
        const payload = await response.json().catch(() => ({}));
        console.warn('Impossible d’envoyer l’email de confirmation:', payload?.error || response.statusText);
      }
    } catch (confirmationError) {
      console.warn('Erreur lors de la génération du lien de confirmation:', confirmationError);
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Confirmez votre inscription</h2>
          <p className="text-gray-700">
            Cliquez sur le lien sécurisé ci-dessous pour valider votre compte CVN&apos;EAT.
          </p>
          {manualConfirmationLink ? (
            <p className="mt-6">
              <a
                href={manualConfirmationLink}
                className="inline-flex items-center justify-center px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Valider mon compte
              </a>
              <span className="block mt-2 text-xs text-gray-500 break-words">
                {manualConfirmationLink}
              </span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Le lien n’a pas pu être généré automatiquement. Réessayez ou contactez le support pour recevoir votre confirmation.
            </p>
          )}
          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center rounded-md border border-transparent bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Créer un compte</h2>
          <p className="mt-2 text-gray-600">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-orange-500 hover:text-orange-600">
              Se connecter
            </Link>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-700">
                Prénom
              </label>
              <input
                type="text"
                id="prenom"
                name="prenom"
                required
                value={formData.prenom}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
                Nom
              </label>
              <input
                type="text"
                id="nom"
                name="nom"
                required
                value={formData.nom}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div>
            <label htmlFor="telephone" className="block text-sm font-medium text-gray-700">
              Téléphone
            </label>
            <input
              type="tel"
              id="telephone"
              name="telephone"
              required
              value={formData.telephone}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div>
            <label htmlFor="adresse" className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              type="text"
              id="adresse"
              name="adresse"
              required
              value={formData.adresse}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="codePostal" className="block text-sm font-medium text-gray-700">
                Code Postal
              </label>
              <input
                type="text"
                id="codePostal"
                name="codePostal"
                required
                value={formData.codePostal}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div>
              <label htmlFor="ville" className="block text-sm font-medium text-gray-700">
                Ville
              </label>
              <input
                type="text"
                id="ville"
                name="ville"
                required
                value={formData.ville}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de compte
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="user">Client</option>
              <option value="restaurant">Partenaire Restaurant</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {loading ? 'Inscription en cours...' : 'S\'inscrire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 