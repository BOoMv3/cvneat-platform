/**
 * Même fallback pour /login (Suspense / useSearchParams).
 */
export default function LoginLoading() {
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
        <p style={{ color: '#4b5563', marginBottom: 16 }}>Ouverture de la connexion…</p>
        <a
          href="/login-legacy.html"
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
          Ouvrir la connexion Sunmi
        </a>
        <p style={{ marginTop: 16 }}>
          <a href="/login" style={{ color: '#ea580c' }}>
            Réessayer /login
          </a>
        </p>
      </div>
    </div>
  );
}
