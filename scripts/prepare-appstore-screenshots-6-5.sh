#!/bin/bash
set -euo pipefail

# Prépare des captures App Store "iPhone 6,5 pouces" (1242x2688).
# Utilise sips (macOS). Aucune dépendance.
#
# Usage:
# 1) Mets tes captures dans: screenshots/raw/
# 2) Lance:  ./scripts/prepare-appstore-screenshots-6-5.sh
# 3) Résultat: screenshots/appstore-6.5/

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IN_DIR="$ROOT_DIR/screenshots/raw"
OUT_DIR="$ROOT_DIR/screenshots/appstore-6.5"

TARGET_W=1242
TARGET_H=2688

mkdir -p "$OUT_DIR"

if [ ! -d "$IN_DIR" ]; then
  echo "❌ Dossier introuvable: $IN_DIR"
  echo "➡️  Crée-le et mets-y tes captures (png/jpg)."
  exit 1
fi

shopt -s nullglob
FILES=("$IN_DIR"/*.{png,jpg,jpeg,JPG,JPEG,PNG})

if [ ${#FILES[@]} -eq 0 ]; then
  echo "❌ Aucune image trouvée dans $IN_DIR"
  exit 1
fi

echo "🖼️  Conversion captures -> iPhone 6,5\" (${TARGET_W}x${TARGET_H})"
echo "📂 Input : $IN_DIR"
echo "📂 Output: $OUT_DIR"

for f in "${FILES[@]}"; do
  base="$(basename "$f")"
  name="${base%.*}"
  out="$OUT_DIR/${name}.png"

  # Convertir en PNG (si besoin) + resize exact.
  # NOTE: Les captures iPhone récentes (1170x2532) ont quasiment le même ratio que 1242x2688,
  # donc ce resize ne déforme pas visiblement.
  sips -s format png "$f" --out "$out" >/dev/null
  sips -z $TARGET_H $TARGET_W "$out" --out "$out" >/dev/null

  # Vérifier dimensions finales
  w="$(sips -g pixelWidth "$out" 2>/dev/null | tail -n 1 | awk '{print $2}')"
  h="$(sips -g pixelHeight "$out" 2>/dev/null | tail -n 1 | awk '{print $2}')"
  if [ "$w" != "$TARGET_W" ] || [ "$h" != "$TARGET_H" ]; then
    echo "⚠️  $base -> obtenu ${w}x${h} (attendu ${TARGET_W}x${TARGET_H})"
  else
    echo "✅ $base -> ${TARGET_W}x${TARGET_H}"
  fi
done

echo ""
echo "✅ Terminé. Uploade les PNG de: $OUT_DIR"


