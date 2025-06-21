export default function CGV() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold mb-8">Conditions Générales de Vente</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Objet</h2>
          <p className="text-gray-600">
            Les présentes conditions générales de vente (CGV) constituent le socle de la négociation commerciale et sont systématiquement adressées ou remises à chaque acheteur pour lui permettre de passer commande.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Commandes</h2>
          <div className="text-gray-600 space-y-4">
            <p>
              Les commandes sont passées sur le site internet www.cvneat.com. Le client sélectionne les produits qu'il souhaite commander et les ajoute à son panier.
            </p>
            <p>
              Le client peut à tout moment modifier son panier avant de valider sa commande. La validation de la commande vaut acceptation des présentes conditions générales de vente.
            </p>
            <p>
              CVNeat se réserve le droit de refuser toute commande pour des motifs légitimes.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Prix</h2>
          <div className="text-gray-600 space-y-4">
            <p>
              Les prix des produits sont indiqués en euros toutes taxes comprises (TTC). Les prix indiqués sur les fiches produit ne comprennent pas les frais de livraison, qui sont facturés en supplément.
            </p>
            <p>
              CVNeat se réserve le droit de modifier ses prix à tout moment, étant toutefois entendu que le prix figurant au catalogue le jour de la commande sera le seul applicable au client.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Paiement</h2>
          <div className="text-gray-600 space-y-4">
            <p>
              Le fait de valider votre commande implique pour vous l'obligation de payer le prix indiqué. Le règlement de vos achats s'effectue par carte bancaire grâce au système sécurisé.
            </p>
            <p>
              Les paiements effectués par le client ne seront considérés comme définitifs qu'après encaissement effectif des sommes dues par CVNeat.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Livraison</h2>
          <div className="text-gray-600 space-y-4">
            <p>
              Les produits sont livrés à l'adresse de livraison indiquée par le client lors de sa commande. Les délais de livraison sont donnés à titre indicatif.
            </p>
            <p>
              En cas de retard de livraison, le client pourra demander l'annulation de sa commande et obtenir le remboursement des sommes versées.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Droit de rétractation</h2>
          <p className="text-gray-600">
            Conformément aux dispositions légales en vigueur, le client dispose d'un délai de 14 jours à compter de la réception des produits pour exercer son droit de rétractation auprès de CVNeat, sans avoir à justifier de motifs ni à payer de pénalité.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Garanties</h2>
          <div className="text-gray-600 space-y-4">
            <p>
              Les produits vendus sur le site sont conformes à la réglementation en vigueur en France et bénéficient de la garantie légale de conformité et de la garantie contre les vices cachés.
            </p>
            <p>
              En cas de non-conformité d'un produit vendu, il pourra être retourné à CVNeat qui le reprendra, l'échangera ou le remboursera.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Litiges</h2>
          <p className="text-gray-600">
            Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire. À défaut, les tribunaux français seront seuls compétents.
          </p>
        </section>
      </div>
    </main>
  );
} 