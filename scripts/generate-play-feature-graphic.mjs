#!/usr/bin/env node
/**
 * Google Play feature graphic (1024×500).
 * Output: docs/store-assets/google-play-feature-graphic-1024x500.png
 *
 * Usage: npm run generate:play-feature-graphic
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1024;
const H = 500;
const ICON_PATH = path.join(
  ROOT,
  'apps/mobile/ios/Mobile/Images.xcassets/AppIcon.appiconset/icon-1024.png',
);
const OUT_DIR = path.join(ROOT, 'docs/store-assets');
const OUT_FILE = path.join(OUT_DIR, 'google-play-feature-graphic-1024x500.png');

const TEAL = '#1FBBA6';
const SKY = '#5fa8ff';

function backgroundSvg() {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ecfdf5"/>
      <stop offset="40%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="920" cy="90" r="130" fill="${TEAL}" opacity="0.14"/>
  <circle cx="880" cy="420" r="80" fill="${SKY}" opacity="0.2"/>
  <circle cx="60" cy="460" r="100" fill="${TEAL}" opacity="0.1"/>
</svg>`);
}

function iconPlateSvg() {
  const x = 88;
  const y = 118;
  const s = 264;
  const r = 48;
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="${x + 8}" y="${y + 8}" width="${s - 16}" height="${s - 16}" rx="${r - 6}" fill="#ffffff"/>
</svg>`);
}

function copySvg() {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="390" y="210"
    font-family="Helvetica, Arial, sans-serif"
    font-size="72"
    font-weight="700"
    fill="#0f172a">Tutorix</text>
  <text x="390" y="268"
    font-family="Helvetica, Arial, sans-serif"
    font-size="30"
    font-weight="600"
    fill="${TEAL}">Connect · Learn · Grow</text>
  <text x="390" y="328"
    font-family="Helvetica, Arial, sans-serif"
    font-size="26"
    fill="#475569">Find tutors · Book classes · Learn online or offline</text>
</svg>`);
}

async function main() {
  const iconSize = 220;
  const iconLeft = 110;
  const iconTop = 140;

  const icon = await sharp(ICON_PATH)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  const layers = [
    { input: backgroundSvg() },
    { input: iconPlateSvg() },
    { input: icon, left: iconLeft, top: iconTop },
    { input: copySvg() },
  ];

  const png = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite(layers)
    .png()
    .toBuffer();

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, png);
  const meta = await sharp(png).metadata();
  console.log(`Wrote ${OUT_FILE} (${meta.width}x${meta.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});