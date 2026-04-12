import { ADMIN_UI_DEPLOY_MARKER, getAdminBuildRef } from '@/lib/admin-deploy-marker';

/**
 * Bandeau dès le premier paint sur toute l’arborescence /admin (pas seulement après fetch Supabase).
 */
export default function AdminLayout({ children }) {
  const buildRef = getAdminBuildRef();

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        data-admin-deploy-check={ADMIN_UI_DEPLOY_MARKER}
        className="sticky top-0 z-[100] border-b-4 border-emerald-800 bg-emerald-600 px-2 py-2 text-center text-xs font-bold text-white shadow-md sm:text-sm"
      >
        <span className="inline-block sm:inline">Déploiement actif</span>
        <span className="mx-1.5 hidden text-emerald-100 sm:inline">·</span>
        <code className="rounded bg-emerald-900/40 px-1.5 py-0.5 font-mono text-[11px] sm:text-xs">
          {ADMIN_UI_DEPLOY_MARKER}
        </code>
        <span className="mx-1.5 text-emerald-100">·</span>
        <code className="rounded bg-emerald-900/40 px-1.5 py-0.5 font-mono text-[11px] sm:text-xs">
          {buildRef}
        </code>
      </div>
      {children}
    </>
  );
}
