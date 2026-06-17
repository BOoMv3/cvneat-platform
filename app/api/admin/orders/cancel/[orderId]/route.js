import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cancelOrderWithRefund } from '../../../../../../lib/admin-cancel-order';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const verifyAdminToken = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Non autorisé', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { error: 'Token invalide', status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Accès refusé - Admin requis', status: 403 };
  }

  return { userId: user.id };
};

export async function POST(request, { params }) {
  try {
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({ error: 'ID de commande requis' }, { status: 400 });
    }

    const result = await cancelOrderWithRefund(supabaseAdmin, orderId, {
      adminAction: 'admin_cancel_specific_order',
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          details: result.details,
          stripe_refund_id: result.stripe_refund_id,
        },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur API cancel order:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'annulation de la commande', details: error.message },
      { status: 500 }
    );
  }
}
