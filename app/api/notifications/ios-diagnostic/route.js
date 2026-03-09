import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAPNsProviderForEnv } from '../../../../lib/apns';

/**
 * Diagnostic iOS push - vérifie la config APNs et les tokens
 * GET: statut config + nombre de tokens iOS
 * Sécurité: en production exige x-debug-secret = PUSH_DEBUG_SECRET
 */
function requireDebugSecret(request) {
  if (process.env.NODE_ENV === 'production') {
    const expected = (process.env.PUSH_DEBUG_SECRET || '').toString().trim();
    if (!expected) return false;
    const got = (request.headers.get('x-debug-secret') || '').toString().trim();
    return got === expected;
  }
  return true;
}

export async function GET(request) {
  try {
    if (!requireDebugSecret(request)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const keyId = !!process.env.APNS_KEY_ID;
    const teamId = !!process.env.APNS_TEAM_ID;
    const bundleId = !!process.env.APNS_BUNDLE_ID;
    const keyContent = !!process.env.APNS_KEY_CONTENT;
    const apnsConfigOk = keyId && teamId && bundleId && keyContent;

    let providerTest = null;
    if (apnsConfigOk) {
      try {
        const prod = getAPNsProviderForEnv('production');
        const sandbox = getAPNsProviderForEnv('sandbox');
        providerTest = {
          production: !!prod,
          sandbox: !!sandbox,
        };
      } catch (e) {
        providerTest = { error: e?.message || 'Erreur création provider' };
      }
    }

    const forcedEnv = (process.env.APNS_FORCE_ENV || '').toString().trim() || null;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { count, error } = await supabase
      .from('device_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'ios');

    return NextResponse.json({
      apns_config: {
        APNS_KEY_ID: keyId,
        APNS_TEAM_ID: teamId,
        APNS_BUNDLE_ID: bundleId,
        APNS_KEY_CONTENT: keyContent,
        ok: apnsConfigOk,
      },
      apns_provider: providerTest,
      APNS_FORCE_ENV: forcedEnv,
      NODE_ENV: process.env.NODE_ENV,
      ios_token_count: error ? null : count ?? 0,
      ios_token_error: error ? error.message : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e?.message },
      { status: 500 }
    );
  }
}
