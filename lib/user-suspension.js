/** Suspension / ban temporaire des comptes (ex. livreurs). */

export function isSuspensionActive(userOrRow, now = new Date()) {
  if (!userOrRow) return false;
  const until = userOrRow.suspended_until || userOrRow.suspendedUntil;
  if (!until) return false;
  const ts = new Date(until).getTime();
  if (Number.isNaN(ts)) return false;
  return ts > now.getTime();
}

export function formatSuspensionUntilFr(until) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(until));
  } catch {
    return String(until || '');
  }
}

export function buildSuspensionMessage(userOrRow) {
  const reason =
    (userOrRow?.suspension_reason || userOrRow?.suspensionReason || '').toString().trim() ||
    'Votre compte est temporairement suspendu suite à des signalements.';
  const until = userOrRow?.suspended_until || userOrRow?.suspendedUntil;
  const penalty = Number(userOrRow?.suspension_penalty_eur ?? userOrRow?.suspensionPenaltyEur ?? 0);
  const parts = [reason];
  if (until) {
    parts.push(`Fin de la suspension : ${formatSuspensionUntilFr(until)}.`);
  }
  if (Number.isFinite(penalty) && penalty > 0) {
    parts.push(`Pénalité appliquée sur vos gains : ${penalty.toFixed(2)} €.`);
  }
  parts.push('Pour toute question : contact@cvneat.fr');
  return parts.join(' ');
}

export function suspensionPayload(userOrRow) {
  return {
    suspended: true,
    suspended_until: userOrRow?.suspended_until || userOrRow?.suspendedUntil || null,
    suspension_reason: userOrRow?.suspension_reason || userOrRow?.suspensionReason || null,
    suspension_penalty_eur: Number(userOrRow?.suspension_penalty_eur ?? userOrRow?.suspensionPenaltyEur ?? 0) || 0,
    message: buildSuspensionMessage(userOrRow),
  };
}
