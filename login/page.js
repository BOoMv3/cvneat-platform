'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import FormInput from '../components/FormInput';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const registered = searchParams.get('registered') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validation des champs
      if (!formData.email || !formData.password) {
        setErrors({ general: 'Tous les champs sont requis' });
        return;
      }

      // Connexion avec Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Erreur de connexion:', error);
        setErrors({ general: error.message });
        return;
      }

      if (data.user) {
        console.log('Connexion réussie:', data.user);
        // Redirection vers la page demandée ou la page d'accueil
        router.push(redirect);
      }

    } catch (error) {
      console.error('Erreur inattendue:', error);
      setErrors({ general: 'Une erreur inattendue s\'est produite' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Connexion</h1>
          
          {registered && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              Inscription réussie ! Vous pouvez maintenant vous connecter.
            </div>
          )}

          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
              label="Mot de passe"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              error={errors.password}
              value={formData.password}
              onChange={handleChange}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <a href="/inscription" className="text-blue-600 hover:text-blue-800">
                S'inscrire
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  );
} 