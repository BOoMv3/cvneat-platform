/**
 * Fermeture globale des commandes (maintenance, pas de livreur, etc.).
 * true = commandes fermées, false = commandes ouvertes
 * Changer cette valeur puis redéployer pour ouvrir/fermer.
 */
const COMMANDES_FERMEES = true;

export function isOrdersClosed() {
  return COMMANDES_FERMEES;
}
