'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaCheckCircle, FaTimesCircle, FaEnvelope } from 'react-icons/fa';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      setMessage('Adresse email manquante');
      return;
    }

    // Ici vous pouvez ajouter une logique pour désinscrire l'utilisateur
    // Par exemple, marquer l'utilisateur comme "unsubscribed" dans la base de données
    // Pour l'instant, on simule juste la désinscription
    setTimeout(() => {
      setStatus('success');
      setMessage(`Vous avez été désinscrit avec succès. Vous ne recevrez plus d'emails de CVN'EAT.`);
    }, 1000);
  }, [email]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          )}
          {status === 'success' && (
            <FaCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          )}
          {status === 'error' && (
            <FaTimesCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'loading' && 'Traitement en cours...'}
          {status === 'success' && 'Désinscription réussie'}
          {status === 'error' && 'Erreur'}
        </h1>

        {email && (
          <div className="mb-4 flex items-center justify-center text-gray-600">
            <FaEnvelope className="mr-2" />
            <span className="text-sm">{email}</span>
          </div>
        )}

        <p className="text-gray-700 mb-6">
          {message || 'Veuillez patienter...'}
        </p>

        {status === 'success' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p>
              Si vous changez d'avis, vous pouvez vous réinscrire en vous connectant à votre compte CVN'EAT.
            </p>
          </div>
        )}

        <div className="mt-8">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}

