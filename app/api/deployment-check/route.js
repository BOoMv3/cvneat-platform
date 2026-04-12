import { NextResponse } from 'next/server';
import { ADMIN_UI_DEPLOY_MARKER } from '@/lib/admin-deploy-marker';

export const dynamic = 'force-dynamic';

/**
 * Vérifie quel build est réellement déployé (sans dépendre du cache HTML/JS du navigateur).
 * Ouvre GET /api/deployment-check après un déploiement : le champ marker doit correspondre au repo.
 */
export function GET() {
  return NextResponse.json(
    {
      marker: ADMIN_UI_DEPLOY_MARKER,
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      nodeEnv: process.env.NODE_ENV || null,
      at: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
