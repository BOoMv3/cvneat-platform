'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import FormInput from '../components/FormInput';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implémenter la logique de connexion
    console.log('Tentative de connexion avec:', formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Connexion</h1>
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
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Se connecter
            </button>
          </form>
        </div>
      </main>
    </>
  );
} 