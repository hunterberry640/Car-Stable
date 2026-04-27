/**
 * Tight-crop Car Stable logo from transparent PNG.
 * - Writes web asset: src/assets/car-stable-logo.png (crop + small transparent padding)
 * - With --write-source: overwrites src/assets/Car Stable style 3.png (crop only, no padding)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '..', 'src', 'assets');

const SOURCE = path.join(assetsDir, 'Car Stable style 3 (1).png');
const OUT = path.join(assetsDir, 'car-stable-logo.png');
const WEB_PADDING = 16;
const ALPHA_THRESH = 8;

function isLogoPixel(r, g, b, a) {
  if (a > ALPHA_THRESH) return true;
  if (b > 80 && b > r + 30 && b > g + 20) return true;
  return false;
}

const writeSource = process.argv.includes('--write-source');

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
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1, srcW: w, srcH: h };
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Missing:', SOURCE);
    process.exit(1);
  }

  const { minX, minY, width, height, srcW, srcH } = await computeBbox(SOURCE);
  console.log(`Source: ${srcW}x${srcH}  →  bbox (${minX}, ${minY}) ${width}x${height}`);

  const extract = { left: minX, top: minY, width, height };

  await sharp(SOURCE)
    .extract(extract)
    .extend({
      top: WEB_PADDING,
      bottom: WEB_PADDING,
      left: WEB_PADDING,
      right: WEB_PADDING,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  const outMeta = await sharp(OUT).metadata();
  console.log(`Written: ${path.basename(OUT)}  (${outMeta.width}x${outMeta.height})`);

  if (writeSource) {
    const tmp = SOURCE + '.trimmed.png';
    await sharp(SOURCE).extract(extract).png({ compressionLevel: 9 }).toFile(tmp);
    fs.renameSync(tmp, SOURCE);
    const sm = await sharp(SOURCE).metadata();
    console.log(`Updated source: ${path.basename(SOURCE)}  (${sm.width}x${sm.height})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
