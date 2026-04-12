#!/usr/bin/env bash
# Applique les migrations du repo sur le projet Supabase distant (équivalent "option A").
#
# Prérequis (au choix) :
#  A) npx supabase@latest login   → enregistre ~/.supabase/access-token
#  B) ou PAT : https://supabase.com/dashboard/account/tokens
#     puis export SUPABASE_ACCESS_TOKEN='…'
# Puis : ./scripts/supabase-db-push.sh
#
# Note : .env.local est temporairement déplacé pendant la commande, car une valeur
# mal quotée (ex. FIREBASE_PRIVATE_KEY) empêche le CLI de parser le fichier.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" && -f "${HOME}/.supabase/access-token" ]]; then
  SUPABASE_ACCESS_TOKEN="$(tr -d '\n\r' <"${HOME}/.supabase/access-token")"
  export SUPABASE_ACCESS_TOKEN
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Aucun token trouvé."
  echo "  A) Une fois sur ton Mac : npx supabase@latest login   (ouvre le navigateur)"
  echo "  B) Ou crée un PAT : https://supabase.com/dashboard/account/tokens"
  echo "     puis : export SUPABASE_ACCESS_TOKEN='…' && ./scripts/supabase-db-push.sh"
  exit 1
fi

PROJECT_REF="jxbgrvlmvnofaxbtcmsw"
ENV_BACKUP=""

restore_env() {
  if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
    mv "$ENV_BACKUP" "$ROOT/.env.local"
  fi
}
trap restore_env EXIT

if [[ -f "$ROOT/.env.local" ]]; then
  ENV_BACKUP="$ROOT/.env.local.supabase_push_bak.$$"
  mv "$ROOT/.env.local" "$ENV_BACKUP"
fi

echo "→ Liaison du projet $PROJECT_REF …"
LINK_ARGS=(--project-ref "$PROJECT_REF" --yes)
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  LINK_ARGS+=(--password "$SUPABASE_DB_PASSWORD")
fi
npx --yes supabase@latest link "${LINK_ARGS[@]}"

echo "→ db push (migrations en attente) …"
npx supabase@latest db push --yes

echo "Terminé. Vérifie dans Supabase > Database > Migrations (ou lance une requête test)."
