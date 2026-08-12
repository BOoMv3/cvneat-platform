/**
 * Fallback "Chargement..." — SANS 'use client'.
 * Sur Sunmi, si React ne hydrate pas, les liens HTML restent cliquables.
 */
export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <div>
        <p style={{ color: '#4b5563', marginBottom: 16 }}>Chargement…</p>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
          Si ça reste bloqué, utilisez un lien ci-dessous :
        </p>
        <p style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              background: '#ea580c',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Connexion partenaire
          </a>
          <a
            href="/partner"
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              background: '#111827',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Espace partenaire
          </a>
          <a href="/" style={{ color: '#ea580c', fontWeight: 600 }}>
            Accueil
          </a>
          <a href="/login-legacy.html" style={{ color: '#6b7280', fontSize: 13 }}>
            Connexion compatible Sunmi (secours)
          </a>
        </p>
      </div>
    </div>
  );
}
