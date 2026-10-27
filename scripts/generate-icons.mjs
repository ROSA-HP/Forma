/**
 * Renders the Forma logo into every icon the project needs.
 *
 *   node scripts/generate-icons.mjs
 *
 * Sources:  public/icon.svg (dark, full-bleed mark)
 *           public/logo-maskable.svg (padded for the 80% safe zone)
 *           docs/brand/logo-foreground.svg (transparent adaptive foreground)
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const MARK = await readFile(path.join(ROOT, 'public/icon.svg'));
const MASKABLE = await readFile(path.join(ROOT, 'public/logo-maskable.svg'));
const FOREGROUND = await readFile(path.join(ROOT, 'docs/brand/logo-foreground.svg'));

/** Builds a .ico containing PNG-compressed frames (supported by all modern browsers). */
function buildIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  const entries = [];
  const payloads = [];
  let offset = 6 + 16 * frames.length;

  for (const { size, buffer } of frames) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    entries.push(entry);
    payloads.push(buffer);
  }

  return Buffer.concat([header, ...entries, ...payloads]);
}

async function png(svg, size) {
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

async function writePng(svg, size, destination) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(path.join(ROOT, destination));
  console.log(`  ${destination}  ${size}×${size}`);
}

// ---------------------------------------------------------------- web icons

console.log('Web icons');
await writePng(MARK, 192, 'public/pwa-192x192.png');
await writePng(MARK, 512, 'public/pwa-512x512.png');
await writePng(MARK, 180, 'public/apple-touch-icon.png');
await writePng(MASKABLE, 512, 'public/pwa-maskable-512x512.png');

const faviconFrames = [];
for (const size of [16, 32, 48]) {
  faviconFrames.push({ size, buffer: await png(MARK, size) });
}
await writeFile(path.join(ROOT, 'public/favicon.ico'), buildIco(faviconFrames));
console.log('  public/favicon.ico  16/32/48');

// ------------------------------------------------------------ android icons

// [density, legacy launcher size, adaptive foreground size]
const DENSITIES = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

console.log('Android launcher icons');
for (const [density, iconSize, foregroundSize] of DENSITIES) {
  const dir = `android/app/src/main/res/mipmap-${density}`;

  await writePng(MARK, iconSize, `${dir}/ic_launcher.png`);
  await writePng(FOREGROUND, foregroundSize, `${dir}/ic_launcher_foreground.png`);

  // Round variant: same mark masked to a circle.
  const square = await png(MARK, iconSize);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}">` +
      `<circle cx="${iconSize / 2}" cy="${iconSize / 2}" r="${iconSize / 2}" fill="#fff"/></svg>`
  );
  await sharp(square)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(path.join(ROOT, `${dir}/ic_launcher_round.png`));
  console.log(`  ${dir}/ic_launcher_round.png  ${iconSize}×${iconSize}`);
}

// ---------------------------------------------------------- android splash

/** Finds every generated splash.png under res/drawable*. */
async function findSplashes() {
  const resDir = path.join(ROOT, 'android/app/src/main/res');
  const entries = await readdir(resDir);
  const found = [];
  for (const entry of entries) {
    if (!entry.startsWith('drawable')) continue;
    const file = path.join(resDir, entry, 'splash.png');
    try {
      const info = await stat(file);
      if (info.isFile()) found.push(file);
    } catch {
      // not every drawable folder has a splash
    }
  }
  return found;
}

console.log('Android splash screens');
for (const file of await findSplashes()) {
  const { width, height } = await sharp(file).metadata();
  const markSize = Math.round(Math.min(width, height) * 0.28);
  const mark = await sharp(MARK, { density: 384 }).resize(markSize, markSize).png().toBuffer();

  await sharp({ create: { width, height, channels: 4, background: '#0B0D10' } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toFile(file);
  console.log(`  ${path.relative(ROOT, file)}  ${width}×${height}`);
}

console.log('Done.');
