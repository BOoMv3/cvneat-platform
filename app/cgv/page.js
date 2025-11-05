export default function CGV() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 fold:p-6 xs:p-8">
        <h1 className="text-2xl fold:text-2xl xs:text-3xl font-bold mb-6 fold:mb-6 xs:mb-8 text-gray-900 dark:text-white">Conditions Générales de Vente</h1>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">1. Objet</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base">
            Les présentes conditions générales de vente (CGV) constituent le socle de la négociation commerciale entre CVN'EAT, société par actions simplifiée au capital de 50 euros, immatriculée au RCS de Montpellier sous le numéro 989 966 700, dont le siège social est situé au 1 bis Rue Armand Sabatier, 34190 Ganges (ci-après "CVN'EAT" ou "la Plateforme"), et tout utilisateur (ci-après "le Client") souhaitant passer commande via la plateforme CVN'EAT.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-4 text-sm fold:text-sm xs:text-base">
            Les CGV sont systématiquement adressées ou remises à chaque acheteur pour lui permettre de passer commande. La validation de la commande implique l'acceptation sans réserve des présentes conditions générales de vente.
          </p>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">2. Commandes</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-4 text-sm fold:text-sm xs:text-base">
            <p>
              Les commandes sont passées sur le site internet <strong>www.cvneat.fr</strong>. Le client sélectionne les produits qu'il souhaite commander et les ajoute à son panier. Il peut personnaliser ses commandes (choix de viandes, sauces, ingrédients, suppléments).
            </p>
            <p>
              Le client peut à tout moment modifier son panier avant de valider sa commande. La validation de la commande vaut acceptation des présentes conditions générales de vente.
            </p>
            <p>
              CVN'EAT se réserve le droit de refuser toute commande pour des motifs légitimes, notamment en cas de problème de disponibilité des produits, d'erreur manifeste sur le prix ou la description des produits, ou de comportement suspect.
            </p>
            <p>
              Chaque commande fait l'objet d'un accusé de réception par email confirmant l'enregistrement de la commande.
            </p>
          </div>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">3. Prix</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-4 text-sm fold:text-sm xs:text-base">
            <p>
              Les prix des produits sont indiqués en euros toutes taxes comprises (TTC). Les prix indiqués sur les fiches produit ne comprennent pas les frais de livraison, qui sont calculés en fonction de la distance et facturés en supplément.
            </p>
            <p>
              CVN'EAT se réserve le droit de modifier ses prix à tout moment, étant toutefois entendu que le prix figurant au catalogue le jour de la commande sera le seul applicable au client.
            </p>
            <p>
              Les prix incluent les suppléments, customisations (viandes, sauces) et options sélectionnées par le client. Le total de la commande (produits + frais de livraison) est indiqué clairement avant validation du paiement.
            </p>
          </div>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">4. Paiement</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-4 text-sm fold:text-sm xs:text-base">
            <p>
              Le fait de valider votre commande implique pour vous l'obligation de payer le prix indiqué. Le règlement de vos achats s'effectue par carte bancaire grâce au système sécurisé Stripe.
            </p>
            <p>
              Les paiements effectués par le client ne seront considérés comme définitifs qu'après encaissement effectif des sommes dues par CVN'EAT.
            </p>
            <p>
              En cas de refus de paiement par la banque, la commande sera automatiquement annulée.
            </p>
          </div>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">5. Livraison</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-4 text-sm fold:text-sm xs:text-base">
            <p>
              Les produits sont livrés à l'adresse de livraison indiquée par le client lors de sa commande. Les délais de livraison sont donnés à titre indicatif et dépendent de la distance et des horaires du restaurant.
            </p>
            <p>
              En cas de retard de livraison significatif, le client pourra demander l'annulation de sa commande et obtenir le remboursement des sommes versées, y compris les frais de livraison.
            </p>
            <p>
              Le client doit être présent à l'adresse de livraison ou désigner une personne autorisée. Un code de sécurité peut être demandé pour valider la livraison.
            </p>
            <p>
              Les frais de livraison sont calculés en fonction de la distance entre le restaurant et l'adresse de livraison. Ils sont indiqués clairement avant la validation de la commande.
            </p>
          </div>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">6. Droit de rétractation</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base mb-4">
            Conformément aux dispositions légales en vigueur, le client dispose d'un délai de 14 jours à compter de la réception des produits pour exercer son droit de rétractation auprès de CVN'EAT, sans avoir à justifier de motifs ni à payer de pénalité.
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base">
            <strong>Exception :</strong> Le droit de rétractation ne peut être exercé pour les prestations de services de livraison de repas lorsque l'exécution a commencé avec l'accord exprès du consommateur et qu'il a renoncé à son droit de rétractation.
          </p>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">7. Garanties</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-4 text-sm fold:text-sm xs:text-base">
            <p>
              Les produits vendus sur la plateforme sont conformes à la réglementation en vigueur en France et bénéficient de la garantie légale de conformité et de la garantie contre les vices cachés.
            </p>
            <p>
              En cas de non-conformité d'un produit livré (produit manquant, produit différent, produit abîmé), le client peut contacter le service client à <a href="mailto:contact@cvneat.fr" className="text-orange-600 dark:text-orange-400 hover:underline">contact@cvneat.fr</a> pour signaler le problème. CVN'EAT examinera la réclamation et proposera une solution appropriée (remboursement, échange, bon d'achat).
            </p>
          </div>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">8. Réclamations</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base mb-4">
            Pour toute réclamation concernant une commande, un produit ou un service, le client peut contacter CVN'EAT :
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-gray-700 dark:text-gray-200 text-sm fold:text-sm xs:text-base">
              <strong>Email :</strong> <a href="mailto:contact@cvneat.fr" className="text-orange-600 dark:text-orange-400 hover:underline">contact@cvneat.fr</a><br />
              <strong>Adresse :</strong> CVN'EAT, 1 bis Rue Armand Sabatier, 34190 Ganges, France
            </p>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-4 text-sm fold:text-sm xs:text-base">
            CVN'EAT s'engage à répondre à toute réclamation dans les meilleurs délais et dans un délai maximum de 14 jours ouvrés.
          </p>
        </section>

        <section className="mb-6 fold:mb-6 xs:mb-8">
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">9. Remboursements</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-4 text-sm fold:text-sm xs:text-base">
            <p>
              En cas d'annulation de commande par le client avant le début de la préparation, le remboursement intégral (produits + frais de livraison) sera effectué.
            </p>
            <p>
              En cas d'annulation après le début de la préparation ou de la livraison, le remboursement sera partiel ou pourra être refusé selon les circonstances.
            </p>
            <p>
              Les remboursements sont effectués sur le moyen de paiement utilisé lors de la commande, dans un délai de 5 à 10 jours ouvrés après validation de la demande.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl fold:text-xl xs:text-2xl font-semibold mb-3 fold:mb-3 xs:mb-4 text-gray-900 dark:text-white">10. Litiges</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base mb-4">
            Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base mb-4">
            Conformément à l'article L. 612-1 du Code de la consommation, le client peut également recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige qui l'oppose à CVN'EAT.
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-sm fold:text-sm xs:text-base">
            À défaut de solution amiable, les tribunaux français seront seuls compétents.
          </p>
        </section>
      </div>
    </main>
  );
}
