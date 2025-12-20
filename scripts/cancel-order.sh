#!/bin/bash

# Script pour annuler une commande spécifique et rembourser le client
# Usage: ./scripts/cancel-order.sh <ORDER_ID> [ADMIN_TOKEN]

ORDER_ID=$1
ADMIN_TOKEN=${2:-$ADMIN_TOKEN}
BASE_URL=${NEXT_PUBLIC_APP_URL:-"http://localhost:3000"}

if [ -z "$ORDER_ID" ]; then
  echo "❌ Usage: ./scripts/cancel-order.sh <ORDER_ID> [ADMIN_TOKEN]"
  echo "   Ou définissez ADMIN_TOKEN dans les variables d'environnement"
  exit 1
fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Token admin requis"
  echo "   Fournissez-le comme argument ou définissez ADMIN_TOKEN dans les variables d'environnement"
  exit 1
fi

echo "🔄 Annulation de la commande $ORDER_ID..."

curl -X POST "${BASE_URL}/api/admin/orders/cancel/${ORDER_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\n"

