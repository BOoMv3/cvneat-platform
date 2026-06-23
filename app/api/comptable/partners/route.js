import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireFinanceAccess } from '../../../../lib/require-finance-access';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const auth = await requireFinanceAccess(request, supabaseAdmin);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, legal_name, siret, vat_number, email, telephone, adresse, code_postal, ville, commission_rate, status, created_at')
      .order('nom', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ partners: data || [], count: (data || []).length });
  } catch (error) {
    console.error('comptable/partners:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
