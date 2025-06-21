export default function PolitiqueConfidentialite() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold mb-8">Politique de Confidentialité</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Collecte des données</h2>
          <p className="text-gray-600 mb-4">
            Nous collectons les informations suivantes :
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone</li>
            <li>Adresse de livraison</li>
            <li>Historique des commandes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Utilisation des données</h2>
          <p className="text-gray-600 mb-4">
            Vos données sont utilisées pour :
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Traiter vos commandes</li>
            <li>Améliorer nos services</li>
            <li>Vous contacter concernant vos commandes</li>
            <li>Vous envoyer des offres promotionnelles (avec votre consentement)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Protection des données</h2>
          <p className="text-gray-600">
            Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données personnelles contre tout accès non autorisé, modification, divulgation ou destruction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Vos droits</h2>
          <p className="text-gray-600 mb-4">
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement</li>
            <li>Droit à la limitation du traitement</li>
            <li>Droit à la portabilité des données</li>
            <li>Droit d'opposition</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Cookies</h2>
          <p className="text-gray-600">
            Nous utilisons des cookies pour améliorer votre expérience sur notre site. Vous pouvez configurer votre navigateur pour refuser tous les cookies ou être informé quand un cookie est envoyé.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Contact</h2>
          <p className="text-gray-600">
            Pour toute question concernant notre politique de confidentialité ou pour exercer vos droits, contactez-nous à : privacy@cvneat.com
          </p>
        </section>
      </div>
    </main>
  );
} 