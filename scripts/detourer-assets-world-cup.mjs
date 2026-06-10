#!/usr/bin/env node
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function isNearWhite(r, g, b, t = 228) {
  return r >= t && g >= t && b >= t - 8;
}

function isNearBlack(r, g, b, t = 36) {
  return r <= t && g <= t && b <= t;
}

function isNeutralGray(r, g, b, minV = 95) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 22) return false;
  const v = (r + g + b) / 3;
  return v >= minV;
}

function floodTransparent(data, w, h, matchFn) {
  const visited = new Uint8Array(w * h);
  const queue = [];
  const push = (x, y) => queue.push([x, y]);

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const pi = y * w + x;
    if (visited[pi]) continue;
    visited[pi] = 1;
    const i = pi * 4;
    if (!matchFn(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
    data[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

async function saveTrimmed(data, w, h, file) {
  const buf = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
  await sharp(buf).trim({ threshold: 10 }).png({ compressionLevel: 9 }).toFile(file);
}

async function processImage(relPath, { mode }) {
  const file = path.join(root, relPath);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (mode === 'ball') {
      if (isNearWhite(r, g, b) || isNeutralGray(r, g, b)) {
        data[i + 3] = 0;
        continue;
      }
      const min = Math.min(r, g, b);
      if (min > 198) data[i + 3] = Math.min(data[i + 3], Math.floor((228 - min) * 12));
    }

    if (mode === 'trophy') {
      if (isNeutralGray(r, g, b, 90)) {
        data[i + 3] = 0;
      }
    }

    if (mode === 'logo') {
      if (isNearWhite(r, g, b, 215) || isNeutralGray(r, g, b, 180)) {
        data[i + 3] = 0;
        continue;
      }
      const min = Math.min(r, g, b);
      if (min > 185 && saturation(r, g, b) < 0.18) {
        data[i + 3] = Math.min(data[i + 3], Math.floor((215 - min) * 6));
      }
    }
  }

  if (mode === 'ball') {
    floodTransparent(
      data,
      w,
      h,
      (r, g, b, a) => a < 8 || isNearWhite(r, g, b) || isNeutralGray(r, g, b) || isNearBlack(r, g, b)
    );
  }
  if (mode === 'trophy') {
    floodTransparent(data, w, h, (r, g, b) => isNearBlack(r, g, b) || isNeutralGray(r, g, b, 85));
    for (let i = 0; i < data.length; i += 4) {
      if (isNeutralGray(data[i], data[i + 1], data[i + 2], 85)) data[i + 3] = 0;
    }
  }
  if (mode === 'logo') {
    floodTransparent(data, w, h, (r, g, b, a) => a < 8 || isNearWhite(r, g, b, 215) || isNeutralGray(r, g, b, 175));
  }

  await saveTrimmed(data, w, h, file);
  console.log(`✓ ${relPath}`);
}

await processImage('public/world-cup/world-cup-ball.png', { mode: 'ball' });
await processImage('public/world-cup/world-cup-trophy.png', { mode: 'trophy' });
await processImage('public/cvneat-logo.png', { mode: 'logo' });
console.log('OK');
