'use client';
import { useState, useEffect } from 'react';
// import Navbar from '@/components/Navbar';
import FormInput from '@/components/FormInput';
import { supabase } from '@/lib/supabase';

export default function Register() {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
    adresse: '',
    telephone: '',
    code_postal: '',
    ville: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [manualConfirmationLink, setManualConfirmationLink] = useState('');
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);

  // Charger le script reCAPTCHA
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    
    if (!siteKey) {
      console.warn('NEXT_PUBLIC_RECAPTCHA_SITE_KEY non configurée - reCAPTCHA désactivé');
      return;
    }

    // Vérifier si le script est déjà chargé
    if (typeof window !== 'undefined' && window.grecaptcha) {
      setRecaptchaLoaded(true);
      return;
    }

    // Charger le script reCAPTCHA
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setRecaptchaLoaded(true);
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Nettoyage optionnel
    };
  }, []);

  // Obtenir le token reCAPTCHA
  const getRecaptchaToken = async () => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    
    if (!siteKey) {
      console.warn('NEXT_PUBLIC_RECAPTCHA_SITE_KEY non configurée');
      return null;
    }

    if (typeof window === 'undefined' || !window.grecaptcha) {
      console.warn('reCAPTCHA non chargé');
      return null;
    }

    try {
      const token = await window.grecaptcha.execute(siteKey, { action: 'register' });
      return token;
    } catch (error) {
      console.error('Erreur lors de l\'exécution de reCAPTCHA:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    setManualConfirmationLink('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Les mots de passe ne correspondent pas' });
      setLoading(false);
      return;
    }

    // Vérifier reCAPTCHA (obligatoire)
    const recaptchaToken = await getRecaptchaToken();
    if (!recaptchaToken) {
      setErrors({ global: 'Vérification de sécurité requise. Veuillez réessayer.' });
      setLoading(false);
      return;
    }

    try {
      const verifyResponse = await fetch('/api/recaptcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recaptchaToken }),
      });

      const verifyData = await verifyResponse.json();
      
      if (!verifyData.success) {
        setErrors({ global: 'Vérification de sécurité échouée. Veuillez réessayer.' });
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Erreur vérification reCAPTCHA:', error);
      setErrors({ global: 'Erreur lors de la vérification de sécurité. Veuillez réessayer.' });
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
      setErrors({ email: 'Cet email est déjà utilisé' });
      setLoading(false);
      return;
    }

    // Inscription avec Supabase Auth avec redirection email
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
      setErrors({ email: signUpError.message });
      setLoading(false);
      return;
    }

    // Vérifier si l'utilisateur a été créé
    if (!signUpData.user) {
      setErrors({ global: 'Erreur lors de la création du compte' });
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
      code_postal: formData.code_postal,
      ville: formData.ville,
      role: 'user',
    });
    if (insertError) {
      // Si l'insertion échoue, supprimer l'utilisateur Auth pour éviter les doublons
      console.error('Erreur insertion utilisateur:', insertError);
      await supabase.auth.admin.deleteUser(signUpData.user.id).catch(() => {});
      setErrors({ global: insertError.message || 'Erreur lors de la création du profil' });
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

    setSuccess('Inscription réussie !');
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-green-600">Confirmez votre inscription</h1>
          <p className="text-gray-700">
            Cliquez sur le lien sécurisé ci-dessous afin de valider votre compte CVN&apos;EAT.
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
              Le lien n’a pas pu être généré automatiquement. Réessayez ou contactez-nous pour recevoir votre confirmation.
            </p>
          )}
          <p className="mt-6 text-sm text-gray-500">
            Une fois le lien ouvert, suivez les instructions affichées pour activer le compte.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Inscription</h1>
        {errors.global && <div className="mb-3 sm:mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{errors.global}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormInput
              label="Prénom"
              name="prenom"
              placeholder="Votre prénom"
              required
              error={errors.prenom}
              value={formData.prenom}
              onChange={handleChange}
            />
            <FormInput
              label="Nom"
              name="nom"
              placeholder="Votre nom"
              required
              error={errors.nom}
              value={formData.nom}
              onChange={handleChange}
            />
          </div>
          <FormInput
            label="Email"
            type="email"
            name="email"
            placeholder="votre@email.com"
            required
            error={errors.email}
            value={formData.email}
            onChange={handleChange}
          />
          <FormInput
            label="Téléphone"
            type="tel"
            name="telephone"
            placeholder="06 12 34 56 78"
            required
            error={errors.telephone}
            value={formData.telephone}
            onChange={handleChange}
          />
          <FormInput
            label="Adresse"
            name="adresse"
            placeholder="Votre adresse de livraison"
            required
            error={errors.adresse}
            value={formData.adresse}
            onChange={handleChange}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormInput
              label="Code postal"
              name="code_postal"
              placeholder="34190"
              required
              error={errors.code_postal}
              value={formData.code_postal}
              onChange={handleChange}
            />
            <FormInput
              label="Ville"
              name="ville"
              placeholder="Ganges"
              required
              error={errors.ville}
              value={formData.ville}
              onChange={handleChange}
            />
          </div>
          <FormInput
            label="Mot de passe"
            type="password"
            name="password"
            placeholder="••••••••"
            required
            error={errors.password}
            value={formData.password}
            onChange={handleChange}
          />
          <FormInput
            label="Confirmer le mot de passe"
            type="password"
            name="confirmPassword"
            placeholder="••••••••"
            required
            error={errors.confirmPassword}
            value={formData.confirmPassword}
            onChange={handleChange}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 min-h-[44px] touch-manipulation text-sm sm:text-base"
            disabled={loading}
          >
            {loading ? "Inscription en cours..." : "S'inscrire"}
          </button>
        </form>
      </div>
    </main>
  );
} 