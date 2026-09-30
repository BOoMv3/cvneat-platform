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
        background: '#ffffff',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <div>
        <p style={{ color: '#111827', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          Un instant…
        </p>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
          Chargement de CVN&apos;EAT. Si ça reste bloqué :
        </p>
        <p style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              background: '#ea580c',
              color: '#fff',
              borderRadius: 10,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Accueil restaurants
          </a>
          <a
            href="/track-order"
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              background: '#111827',
              color: '#fff',
              borderRadius: 10,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Suivre ma commande
          </a>
          <a href="/login" style={{ color: '#ea580c', fontWeight: 600 }}>
            Connexion
          </a>
        </p>
      </div>
    </div>
  );
}
