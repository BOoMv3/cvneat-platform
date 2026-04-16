import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function toCsvRow(values) {
  return values
    .map((value) => {
      const v = value == null ? '' : String(value);
      return `"${v.replace(/"/g, '""')}"`;
    })
    .join(',');
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
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
      .not('email', 'is', null);

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la récupération des contacts' }, { status: 500 });
    }

    const csvRows = [toCsvRow(['EMAIL', 'FIRSTNAME', 'LASTNAME', 'SMS', 'USER_ID'])];
    let kept = 0;

    for (const u of users || []) {
      const email = String(u.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) continue;
      kept += 1;
      csvRows.push(
        toCsvRow([email, u.prenom || '', u.nom || '', u.telephone || '', u.id || ''])
      );
    }

    const csvContent = csvRows.join('\n');
    const filename = `cvneat_email_contacts_${new Date().toISOString().slice(0, 10)}_${kept}.csv`;

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

