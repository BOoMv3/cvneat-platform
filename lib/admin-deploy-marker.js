/** Référence visible sur toutes les pages /admin pour confirmer le déploiement du front. */
export const ADMIN_UI_DEPLOY_MARKER = 'admin-ui-2026-04-12-head-iife';

export function getAdminBuildRef() {
  return process.env.NEXT_PUBLIC_CVNEAT_BUILD_REF || 'local';
}
