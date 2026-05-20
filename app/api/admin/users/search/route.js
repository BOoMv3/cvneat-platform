import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyAdminToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Non autorisé', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { error: 'Token invalide', status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Accès refusé', status: 403 };
  }

  return { userId: user.id };
}

function normalize(value) {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function scoreUser(user, query) {
  const q = normalize(query);
  const nom = normalize(user.nom);
  const prenom = normalize(user.prenom);
  const email = normalize(user.email);
  const tel = (user.telephone || '').toString().replace(/\D/g, '');
  const full = `${prenom} ${nom}`.trim();
  const rev = `${nom} ${prenom}`.trim();

  let score = 0;
  if (full === q || rev === q) score += 100;
  if (full.startsWith(q) || rev.startsWith(q)) score += 50;
  if (nom.startsWith(q) || prenom.startsWith(q)) score += 35;
  if (email.startsWith(q)) score += 30;
  if (full.includes(q) || rev.includes(q)) score += 20;
  if (email.includes(q)) score += 12;
  if (q.length >= 4 && tel.includes(q.replace(/\D/g, ''))) score += 25;
  return score;
}

export async function GET(request) {
  const auth = await verifyAdminToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
      return NextResponse.json({
        users: [],
        total: 0,
        message: 'Requête trop courte (min. 2 caractères).',
      });
    }

    const digits = q.replace(/\D/g, '');
    const orFilters = [
      `nom.ilike.%${q}%`,
      `prenom.ilike.%${q}%`,
      `email.ilike.%${q}%`,
    ];
    if (digits.length >= 4) {
      orFilters.push(`telephone.ilike.%${digits}%`);
    }

    const { data: rows, error } = await supabaseAdmin
      .from('users')
      .select('id, nom, prenom, email, telephone, role, created_at')
      .or(orFilters.join(','))
      .limit(120);

    if (error) {
      console.error('Erreur recherche clients:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la recherche client' },
        { status: 500 }
      );
    }

    const ranked = (rows || [])
      .map((u) => ({
        id: u.id,
        nom: u.nom || '',
        prenom: u.prenom || '',
        name: `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email || 'Client',
        email: u.email || '',
        telephone: u.telephone || '',
        role: u.role || 'user',
        created_at: u.created_at,
        _score: scoreUser(u, q),
      }))
      .filter((u) => u._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 50)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      users: ranked,
      total: ranked.length,
    });
  } catch (err) {
    console.error('Erreur API recherche clients:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
