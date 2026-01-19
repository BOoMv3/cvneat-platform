import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

function nowMs() {
  return Date.now();
}

function normalize(str) {
  return (str || '').toString().trim();
}

function escapeSireneQueryValue(v) {
  // Très simple: garder tel quel, mais entourer de guillemets si espace.
  const s = normalize(v);
  if (!s) return '';
  if (s.includes('"')) return s.replaceAll('"', '\\"');
  return s;
}

function buildQuery({ q, name, postalCode, city }) {
  // INSEE SIRENE V3: on utilise q=... avec AND.
  // Champs courants: denominationUniteLegale, denominationUsuelleEtablissement, libelleCommuneEtablissement, codePostalEtablissement
  const parts = [];
  const rawQ = normalize(q);
  if (rawQ) return rawQ;

  const n = normalize(name);
  if (n) {
    const esc = escapeSireneQueryValue(n);
    parts.push(`(denominationUniteLegale:"${esc}" OR denominationUsuelleEtablissement:"${esc}" OR enseigne1Etablissement:"${esc}")`);
  }

  const pc = normalize(postalCode);
  if (pc) parts.push(`codePostalEtablissement:${pc}`);

  const c = normalize(city);
  if (c) {
    const esc = escapeSireneQueryValue(c);
    parts.push(`libelleCommuneEtablissement:"${esc}"`);
  }

  return parts.join(' AND ');
}

function computeFrenchVATFromSiren(siren) {
  // TVA FR = "FR" + clé(2) + SIREN
  // clé = (12 + 3*(siren % 97)) % 97
  const s = normalize(siren).replace(/\s+/g, '');
  if (!/^\d{9}$/.test(s)) return null;
  const n = Number(s);
  const key = (12 + 3 * (n % 97)) % 97;
  return `FR${key.toString().padStart(2, '0')}${s}`;
}

async function requireAdminUser(request) {
  const authHeader = request.headers.get('authorization');
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

  if (!token) return { ok: false, status: 401, error: 'Token requis' };

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) return { ok: false, status: 401, error: 'Token invalide' };

  const { data: userData, error: roleErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (roleErr || !userData || userData.role !== 'admin') {
    return { ok: false, status: 403, error: 'Accès admin requis' };
  }

  return { ok: true, user };
}

async function getInseeAccessToken() {
  const clientId = process.env.INSEE_CLIENT_ID;
  const clientSecret = process.env.INSEE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('INSEE_CLIENT_ID / INSEE_CLIENT_SECRET manquants');
  }

  // Cache
  if (tokenCache.accessToken && tokenCache.expiresAt > nowMs() + 30_000) {
    return tokenCache.accessToken;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://api.insee.fr/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`INSEE token error (${res.status}): ${txt || res.statusText}`);
  }

  const json = await res.json();
  const accessToken = json?.access_token;
  const expiresIn = Number(json?.expires_in || 0);
  if (!accessToken) throw new Error('INSEE token missing access_token');

  tokenCache = {
    accessToken,
    expiresAt: nowMs() + Math.max(60, expiresIn) * 1000,
  };

  return accessToken;
}

function mapEtablissement(et) {
  const siret = et?.siret || null;
  const unite = et?.uniteLegale || {};
  const siren = unite?.siren || (siret ? siret.slice(0, 9) : null);

  const legalName =
    unite?.denominationUniteLegale ||
    unite?.denominationUsuelle1UniteLegale ||
    unite?.nomUniteLegale ||
    et?.denominationUsuelleEtablissement ||
    et?.enseigne1Etablissement ||
    null;

  const addr = et?.adresseEtablissement || {};
  const addressParts = [
    addr?.numeroVoieEtablissement,
    addr?.indiceRepetitionEtablissement,
    addr?.typeVoieEtablissement,
    addr?.libelleVoieEtablissement,
  ]
    .filter(Boolean)
    .join(' ');

  const postalCode = addr?.codePostalEtablissement || null;
  const city = addr?.libelleCommuneEtablissement || null;

  return {
    siret,
    siren,
    vat_number: siren ? computeFrenchVATFromSiren(siren) : null,
    legal_name: legalName,
    address: addressParts || null,
    postal_code: postalCode,
    city,
    active: et?.etatAdministratifEtablissement || null,
  };
}

export async function GET(request) {
  const auth = await requireAdminUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const siret = normalize(searchParams.get('siret'));
  const q = normalize(searchParams.get('q'));
  const name = normalize(searchParams.get('name'));
  const postalCode = normalize(searchParams.get('postalCode'));
  const city = normalize(searchParams.get('city'));
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') || 10)));

  const accessToken = await getInseeAccessToken();

  // 1) Lookup direct par SIRET
  if (siret) {
    const url = `https://api.insee.fr/entreprises/sirene/V3/siret/${encodeURIComponent(siret)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `INSEE lookup error (${res.status})`, details: txt || res.statusText },
        { status: 502 }
      );
    }
    const json = await res.json();
    const et = json?.etablissement;
    return NextResponse.json({ results: et ? [mapEtablissement(et)] : [] });
  }

  // 2) Recherche
  const query = buildQuery({ q, name, postalCode, city });
  if (!query) {
    return NextResponse.json(
      { error: 'Paramètres requis: siret ou (q) ou (name + postalCode/city)' },
      { status: 400 }
    );
  }

  const url = new URL('https://api.insee.fr/entreprises/sirene/V3/siret');
  url.searchParams.set('q', query);
  url.searchParams.set('nombre', String(limit));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `INSEE search error (${res.status})`, details: txt || res.statusText, query },
      { status: 502 }
    );
  }

  const json = await res.json();
  const ets = json?.etablissements || [];
  const results = ets.map(mapEtablissement);
  return NextResponse.json({ query, results });
}


