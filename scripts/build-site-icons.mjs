/**
 * Trim `Car Stable.png` and write favicon + social preview assets.
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '..', 'src', 'assets');

const SOURCE = path.join(assetsDir, 'Car Stable.png');
const OUT_ICON = path.join(assetsDir, 'car-stable-icon.png');
const OUT_FAVICON = path.join(assetsDir, 'favicon-32.png');
const OUT_APPLE = path.join(assetsDir, 'apple-touch-icon.png');

const WEB_PADDING = 8;
const ALPHA_THRESH = 8;
const OG_MAX = 512;

function isLogoPixel(r, g, b, a) {
  if (a > ALPHA_THRESH) return true;
  if (b > 80 && b > r + 30 && b > g + 20) return true;
  return false;
}

async function computeBbox(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  if (ch < 4) throw new Error(`Expected RGBA, got ${ch} channels`);

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    const row = y * w * ch;
    for (let x = 0; x < w; x++) {
      const i = row + x * ch;
      if (!isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (minX > maxX || minY > maxY) throw new Error('No visible pixels found');
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function main() {
  const { minX, minY, width, height } = await computeBbox(SOURCE);
  console.log(`Source bbox: (${minX}, ${minY}) ${width}x${height}`);

  const extract = { left: minX, top: minY, width, height };

  const trimmed = sharp(SOURCE)
    .extract(extract)
    .extend({
      top: WEB_PADDING,
      bottom: WEB_PADDING,
      left: WEB_PADDING,
      right: WEB_PADDING,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

  const meta = await trimmed.clone().metadata();
  let pipeline = trimmed.clone();
  if (Math.max(meta.width, meta.height) > OG_MAX) {
    pipeline = pipeline.resize(OG_MAX, OG_MAX, { fit: 'inside', withoutEnlargement: true });
  }

  await pipeline.png({ compressionLevel: 9 }).toFile(OUT_ICON);
  const iconMeta = await sharp(OUT_ICON).metadata();
  console.log(`Written: car-stable-icon.png (${iconMeta.width}x${iconMeta.height})`);

  // cover = fill the square (no letterboxing bars from non-square source)
  await sharp(OUT_ICON)
    .resize(32, 32, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(OUT_FAVICON);
  console.log('Written: favicon-32.png (32x32)');

  await sharp(OUT_ICON)
    .resize(180, 180, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(OUT_APPLE);
  console.log('Written: apple-touch-icon.png (180x180)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
