export default function MentionsLegales() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 fold:p-6 xs:p-8">
        <h1 className="text-2xl fold:text-2xl xs:text-3xl font-bold mb-6 fold:mb-6 xs:mb-8 text-gray-900 dark:text-white">Mentions Légales</h1>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">1. Informations légales</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-2 text-sm fold:text-sm xs:text-base">
            <p><strong>Raison sociale :</strong> CVN'EAT</p>
            <p><strong>Forme juridique :</strong> Société par actions simplifiée</p>
            <p><strong>Capital social :</strong> 50 euros</p>
            <p><strong>Siège social :</strong> 1 bis Rue Armand Sabatier, 34190 Ganges</p>
            <p><strong>RCS :</strong> 989 966 700 R.C.S. Montpellier</p>
            <p><strong>Date d'immatriculation :</strong> 04 août 2025</p>
            <p><strong>Directeur de publication :</strong> Muller Tony, Président</p>
          </div>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">2. Contact</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-2 text-sm fold:text-sm xs:text-base">
            <p><strong>Email :</strong> <a href="mailto:contact@cvneat.fr" className="text-orange-600 dark:text-orange-400 hover:underline">contact@cvneat.fr</a></p>
            <p><strong>Pour toute réclamation :</strong> <a href="mailto:contact@cvneat.fr" className="text-orange-600 dark:text-orange-400 hover:underline">contact@cvneat.fr</a></p>
            <p><strong>Adresse postale :</strong> 1 bis Rue Armand Sabatier, 34190 Ganges, France</p>
          </div>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">3. Hébergement</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-2 text-sm fold:text-sm xs:text-base">
            <p><strong>Hébergeur :</strong> Vercel Inc.</p>
            <p><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
            <p><strong>Site web :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 dark:text-orange-400 hover:underline">https://vercel.com</a></p>
          </div>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">4. Propriété intellectuelle</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base">
            L'ensemble du contenu de ce site (textes, images, logos, etc.) est protégé par le droit de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, est interdite sans autorisation préalable de CVN'EAT.
          </p>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">5. Responsabilité</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base">
            Les informations fournies sur ce site le sont à titre indicatif. CVN'EAT ne saurait garantir l'exactitude, la complétude, l'actualité des informations diffusées sur le site. CVN'EAT met tout en œuvre pour offrir aux utilisateurs des informations et/ou outils disponibles et vérifiés, mais ne saurait être tenue pour responsable des erreurs ou omissions.
          </p>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">6. Réclamations</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base mb-2">
            Pour toute réclamation concernant nos services, vous pouvez nous contacter à :
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base">
            <strong>Email :</strong> <a href="mailto:contact@cvneat.fr" className="text-orange-600 dark:text-orange-400 hover:underline">contact@cvneat.fr</a>
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base mt-2">
            <strong>Adresse :</strong> CVN'EAT, 1 bis Rue Armand Sabatier, 34190 Ganges, France
          </p>
        </section>

        <section>
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">7. Modifications</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base">
            CVN'EAT se réserve le droit de modifier ces mentions légales à tout moment. L'utilisateur est invité à les consulter de manière régulière.
          </p>
        </section>
      </div>
    </main>
  );
}
