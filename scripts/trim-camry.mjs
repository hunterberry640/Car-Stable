import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC = resolve(__dirname, '..', 'src', 'assets', 'Black_camry.png');
const OUT = SRC;

// Anything brighter than this counts as "car content" rather than background.
// Background is pure black (or transparent); the darkest real pixels on the car
// (shadows, tires) still have some brightness and/or color variance.
const BRIGHT_THRESH = 18; // max channel value considered background
const ALPHA_THRESH = 10;  // ignore mostly-transparent pixels

function isContentPixel(r, g, b, a) {
  if (a <= ALPHA_THRESH) return false;
  // Any channel noticeably above pure black -> content
  if (r > BRIGHT_THRESH || g > BRIGHT_THRESH || b > BRIGHT_THRESH) return true;
  return false;
}

async function computeBbox(buffer, info) {
  const { width, height, channels } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = buffer[idx];
      const g = buffer[idx + 1];
      const b = buffer[idx + 2];
      const a = channels === 4 ? buffer[idx + 3] : 255;
      if (isContentPixel(r, g, b, a)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) throw new Error('No content pixels detected.');
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function run() {
  const img = sharp(SRC).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const bbox = await computeBbox(data, info);

  console.log('Original:', info.width, 'x', info.height);
  console.log('Detected bbox:', bbox);

  await sharp(SRC)
    .extract(bbox)
    .png({ compressionLevel: 9 })
    .toFile(OUT + '.tmp');

  const fs = await import('fs/promises');
  await fs.rename(OUT + '.tmp', OUT);

  console.log('Wrote trimmed image:', OUT);
  const newMeta = await sharp(OUT).metadata();
  console.log('New size:', newMeta.width, 'x', newMeta.height);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
