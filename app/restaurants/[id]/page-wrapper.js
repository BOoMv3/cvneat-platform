// Wrapper pour le composant RestaurantDetail
// Ce fichier n'est PAS 'use client' pour permettre generateStaticParams()
import dynamic from 'next/dynamic';

// Charger le composant client dynamiquement
const RestaurantDetail = dynamic(() => import('./page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement du restaurant...</p>
      </div>
    </div>
  )
});

// Pour l'export statique, générer des paramètres vides
// Le composant sera compilé dans le bundle mais les routes seront gérées côté client
export async function generateStaticParams() {
  return []; // Retourner un tableau vide permet à Next.js de compiler le composant sans pré-générer de routes
}

export default function RestaurantDetailWrapper({ params }) {
  return <RestaurantDetail params={params} />;
}
