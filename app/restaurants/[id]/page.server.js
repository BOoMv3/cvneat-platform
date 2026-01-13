// Fichier serveur séparé pour generateStaticParams
// Ce fichier n'est pas 'use client' pour permettre l'export statique
export async function generateStaticParams() {
  return []; // Retourner un tableau vide permet à Next.js de créer la page sans pré-générer de routes
}

