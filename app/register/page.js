'use client';
import { useState } from 'react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Les mots de passe ne correspondent pas' });
      setLoading(false);
      return;
    }

    // Inscription avec Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });
    if (signUpError) {
      setErrors({ email: signUpError.message });
      setLoading(false);
      return;
    }

    // Ajout des infos complémentaires dans la table users
    const { error: insertError } = await supabase.from('users').insert({
      id: signUpData.user.id,
      nom: formData.nom,
      prenom: formData.prenom,
      telephone: formData.telephone,
      adresse: formData.adresse,
      code_postal: formData.code_postal,
      ville: formData.ville,
      role: 'user',
    });
    if (insertError) {
      setErrors({ global: insertError.message });
      setLoading(false);
      return;
    }

    setSuccess('Inscription réussie ! Vérifiez votre email.');
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
          <h1 className="text-2xl font-bold mb-4 text-green-600">Inscription presque terminée !</h1>
          <p className="text-gray-700">
            Nous vous avons envoyé un e-mail à <strong className="font-semibold">{formData.email}</strong>.
          </p>
          <p className="mt-4 text-gray-700">
            Veuillez cliquer sur le lien dans cet e-mail pour activer votre compte.
          </p>
          <p className="mt-6 text-sm text-gray-500">
            (Pensez à vérifier votre dossier de courriers indésirables ou spam)
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