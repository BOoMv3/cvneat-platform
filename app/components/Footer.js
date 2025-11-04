import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* À propos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">À propos</h3>
            <p className="text-gray-400">
              CVNeat est votre plateforme de livraison de repas préférée, connectant les meilleurs restaurants à vos papilles.
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens rapides</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/restaurants" className="text-gray-400 hover:text-white">
                  Restaurants
                </Link>
              </li>
              <li>
                <Link href="/devenir-partenaire" className="text-gray-400 hover:text-white">
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="text-gray-400 hover:text-white">
                  Mes favoris
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Légal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/mentions-legales" className="text-gray-400 hover:text-white">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/politique-confidentialite" className="text-gray-400 hover:text-white">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/cgv" className="text-gray-400 hover:text-white">
                  CGV
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/report-bug" className="text-gray-400 hover:text-white flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Signaler un bug
                </Link>
              </li>
              <li className="text-gray-400">
                Email: contact@cvneat.com
              </li>
              <li className="text-gray-400">
                Tél: 01 23 45 67 89
              </li>
              <li className="text-gray-400">
                Adresse: 123 Rue de Paris, 75001 Paris
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} CVNeat. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
} 