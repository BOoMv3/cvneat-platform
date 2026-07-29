import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BUCKET = 'delivery-docs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function requireDelivery(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: 'Non autorisé', status: 401 };
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { error: 'Token invalide', status: 401 };

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile?.role || '').toLowerCase();
  if (!['delivery', 'livreur'].includes(role)) {
    return { error: 'Accès livreur requis', status: 403 };
  }
  return { user };
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    });
  }
}

export async function POST(request) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    const mime = file.type || 'application/octet-stream';
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(mime)) {
      return NextResponse.json({ error: 'Format accepté : PDF, JPG, PNG' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 8 Mo)' }, { status: 400 });
    }

    await ensureBucket();

    const ext =
      mime === 'application/pdf'
        ? 'pdf'
        : mime === 'image/png'
          ? 'png'
          : mime === 'image/webp'
            ? 'webp'
            : 'jpg';
    const path = `${auth.user.id}/kbis-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType: mime,
      upsert: true,
    });
    if (upErr) {
      return NextResponse.json({ error: upErr.message || 'Échec upload' }, { status: 500 });
    }

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const kbis_url = pub?.publicUrl || null;
    if (!kbis_url) {
      return NextResponse.json({ error: 'URL KBIS introuvable' }, { status: 500 });
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('users')
      .update({ kbis_url, updated_at: new Date().toISOString() })
      .eq('id', auth.user.id)
      .select('id, kbis_url, siret, legal_name')
      .single();

    if (updErr) {
      // Colonne absente si migration non appliquée
      if (String(updErr.message || '').includes('kbis_url')) {
        return NextResponse.json(
          {
            error:
              'Colonne kbis_url absente — applique supabase/migrations/20260729200000_delivery_kbis_url.sql',
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, kbis_url: updated.kbis_url, profile: updated });
  } catch (e) {
    console.error('kbis upload:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
