'use client';

import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Bannière de test */}
        <div className="bg-blue-600 text-white p-6 text-center font-bold text-xl mb-8 rounded-lg">
          🚀 PAGE ADMIN ULTRA-SIMPLE - TEST EN LIGNE
        </div>

        {/* Titre principal */}
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
          Dashboard Administrateur CVN'EAT
        </h1>

        {/* Statistiques basiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Utilisateurs</h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Restaurants</h3>
            <p className="text-3xl font-bold text-green-600">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Commandes</h3>
            <p className="text-3xl font-bold text-purple-600">0</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Gérer les Utilisateurs
            </button>
            <button className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Valider les Partenaires
            </button>
            <button className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Voir les Statistiques
            </button>
            <button className="p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
              Créer un Restaurant
            </button>
          </div>
        </div>

        {/* Bouton retour */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-lg font-semibold"
          >
            ← Retour à l'Accueil
          </button>
        </div>

        {/* Message de confirmation */}
        <div className="mt-8 text-center text-gray-600">
          <p>✅ Cette page admin est maintenant ultra-simple et devrait fonctionner en ligne</p>
        </div>
      </div>
    </div>
  );
} 