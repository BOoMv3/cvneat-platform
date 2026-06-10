#!/usr/bin/env node
/**
 * Détourage conservateur : retire uniquement le fond relié aux bords (damier / blanc).
 * Ne touche pas au blanc du ballon à l'intérieur.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function isEdgeBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const v = (r + g + b) / 3;

  if (r >= 248 && g >= 248 && b >= 245) return true;
  if (chroma < 22 && v >= 105 && v <= 250) return true;
  return false;
}

function floodFromEdges(data, w, h) {
  const visited = new Uint8Array(w * h);
  const queue = [];

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const pi = y * w + x;
    if (visited[pi]) return;
    visited[pi] = 1;
    const i = pi * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8 || isEdgeBackground(r, g, b)) {
      data[i + 3] = 0;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  };

  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    tryPush(x, y);
  }
}

async function exportBall(inFile, outFile, size) {
  const { data, info } = await sharp(inFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  floodFromEdges(data, info.width, info.height);

  const pngBuf = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  await sharp(pngBuf)
    .trim({ threshold: 8 })
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(outFile);

  console.log('✓', path.basename(outFile));
}

const src = path.join(root, 'public/world-cup/lot-ballon-source.webp');
await exportBall(src, path.join(root, 'public/world-cup/ballon-flottant.webp'), 480);
await exportBall(src, path.join(root, 'public/world-cup/lot-ballon.webp'), 720);
console.log('OK');
