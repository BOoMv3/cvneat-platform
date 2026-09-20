import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminWriterRole } from '@/lib/admin-viewer';
import { activateDeliveryFromApplication } from '@/lib/activate-delivery-application';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assertAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Token requis' };
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { ok: false, status: 401, error: 'Token invalide' };
  }
  const { data: ud } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
  if (!ud || !isAdminWriterRole(ud.role)) {
    return { ok: false, status: 403, error: 'Rôle admin requis' };
  }
  return { ok: true, user };
}

export async function PATCH(request, { params }) {
  try {
    const auth = await assertAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide (pending, approved, rejected)' }, { status: 400 });
    }

    const { data: application, error: fetchErr } = await supabaseAdmin
      .from('delivery_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 });
    }

    if (status === 'approved') {
      try {
        const activation = await activateDeliveryFromApplication(supabaseAdmin, application, {
          sendEmail: true,
          resetPassword: true,
        });

        const { data: updated } = await supabaseAdmin
          .from('delivery_applications')
          .select('*')
          .eq('id', id)
          .single();

        return NextResponse.json({
          application: updated || { ...application, status: 'approved', user_id: activation.userId },
          activation: {
            userId: activation.userId,
            email: activation.email,
            emailSent: !!activation.emailMessageId,
            emailError: activation.emailError || null,
            createdAuth: activation.createdAuth,
          },
        });
      } catch (actErr) {
        console.error('Activation livreur échouée:', actErr);
        return NextResponse.json(
          { error: actErr?.message || "Impossible d'activer le compte livreur" },
          { status: 500 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from('delivery_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur PATCH delivery_applications:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ application: data });
  } catch (err) {
    console.error('Erreur PATCH delivery-applications:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
