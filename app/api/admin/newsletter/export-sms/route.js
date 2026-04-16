import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizePhoneForBrevo(rawPhone) {
  if (!rawPhone) return null;
  const cleaned = String(rawPhone).replace(/[^\d+]/g, '').trim();
  if (!cleaned) return null;

  // 06XXXXXXXX / 07XXXXXXXX -> +336XXXXXXXX / +337XXXXXXXX
  if (/^0[67]\d{8}$/.test(cleaned)) {
    return `+33${cleaned.slice(1)}`;
  }

  // 336XXXXXXXX / 337XXXXXXXX -> +336XXXXXXXX / +337XXXXXXXX
  if (/^33[67]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // +336XXXXXXXX / +337XXXXXXXX
  if (/^\+33[67]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

function toCsvRow(values) {
  return values
    .map((value) => {
      const v = value == null ? '' : String(value);
      return `"${v.replace(/"/g, '""')}"`;
    })
    .join(',');
}

async function readAccessToken(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    const token = form?.get('access_token');
    return token ? String(token) : null;
  }

  return null;
}

async function handleExport(request) {
  try {
    const token = await readAccessToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé - Admin requis' }, { status: 403 });
    }

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, nom, prenom, telephone')
      .not('telephone', 'is', null);

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la récupération des contacts' }, { status: 500 });
    }

    const csvRows = [toCsvRow(['SMS', 'EMAIL', 'FIRSTNAME', 'LASTNAME', 'USER_ID'])];
    let kept = 0;

    for (const u of users || []) {
      const phone = normalizePhoneForBrevo(u.telephone);
      if (!phone) continue;
      kept += 1;
      csvRows.push(
        toCsvRow([phone, u.email || '', u.prenom || '', u.nom || '', u.id || ''])
      );
    }

    const csvContent = csvRows.join('\n');
    const filename = `cvneat_sms_contacts_${new Date().toISOString().slice(0, 10)}_${kept}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request) {
  return handleExport(request);
}

export async function POST(request) {
  return handleExport(request);
}

