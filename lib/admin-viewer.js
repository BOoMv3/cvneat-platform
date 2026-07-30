/**
 * Associé = même visibilité que l’admin, sans droits d’écriture.
 */

export function normalizeStaffRole(role) {
  return (role || '').toString().trim().toLowerCase();
}

export function isAdminViewerRole(role) {
  const r = normalizeStaffRole(role);
  return r === 'admin' || r === 'associe';
}

export function isAdminWriterRole(role) {
  return normalizeStaffRole(role) === 'admin';
}

export function isAdminReadOnlyRole(role) {
  return normalizeStaffRole(role) === 'associe';
}
