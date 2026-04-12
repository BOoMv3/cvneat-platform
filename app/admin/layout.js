/**
 * Bandeau déploiement : géré par {@link AdminDeployStripeRoot} dans le layout racine
 * (script inline + client) pour éviter tout écran sans indicateur sur /admin.
 */
export default function AdminLayout({ children }) {
  return children;
}
