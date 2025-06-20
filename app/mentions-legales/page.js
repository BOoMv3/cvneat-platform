import Navbar from '@/components/Navbar';
import Footer from '../components/Footer';

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-8">Mentions Légales</h1>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Informations légales</h2>
            <div className="text-gray-600 space-y-2">
              <p><strong>Raison sociale :</strong> CVNeat SAS</p>
              <p><strong>Forme juridique :</strong> Société par Actions Simplifiée</p>
              <p><strong>Capital social :</strong> 10 000 €</p>
              <p><strong>Siège social :</strong> 123 Rue de Paris, 75001 Paris</p>
              <p><strong>RCS :</strong> Paris B 123 456 789</p>
              <p><strong>SIRET :</strong> 123 456 789 00010</p>
              <p><strong>N° TVA intracommunautaire :</strong> FR 12 123456789</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Contact</h2>
            <div className="text-gray-600 space-y-2">
              <p><strong>Email :</strong> contact@cvneat.com</p>
              <p><strong>Téléphone :</strong> 01 23 45 67 89</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Hébergement</h2>
            <div className="text-gray-600 space-y-2">
              <p><strong>Hébergeur :</strong> Vercel Inc.</p>
              <p><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789</p>
              <p><strong>Site web :</strong> https://vercel.com</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Propriété intellectuelle</h2>
            <p className="text-gray-600">
              L'ensemble du contenu de ce site (textes, images, logos, etc.) est protégé par le droit de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, est interdite sans autorisation préalable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Responsabilité</h2>
            <p className="text-gray-600">
              Les informations fournies sur ce site le sont à titre indicatif. CVNeat ne saurait garantir l'exactitude, la complétude, l'actualité des informations diffusées sur le site. CVNeat met tout en œuvre pour offrir aux utilisateurs des informations et/ou outils disponibles et vérifiés, mais ne saurait être tenue pour responsable des erreurs ou omissions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Modifications</h2>
            <p className="text-gray-600">
              CVNeat se réserve le droit de modifier ces mentions légales à tout moment. L'utilisateur est invité à les consulter de manière régulière.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
} 