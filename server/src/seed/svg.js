import fs from 'fs';
import path from 'path';

const CLIENT_IMAGES_DIR = path.resolve(process.cwd(), '../client/public/images');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeSvg(subdir, filename, svg) {
  const dir = path.join(CLIENT_IMAGES_DIR, subdir);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, filename), svg, 'utf-8');
  return `/images/${subdir}/${filename}`;
}

// Deterministic soft "blob" background so every generated asset feels illustrated
// rather than a flat rectangle, without pulling in any external image library.
function blobs(seed, w, h) {
  const rand = mulberry32(seed);
  let out = '';
  for (let i = 0; i < 4; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const r = (0.25 + rand() * 0.35) * Math.max(w, h);
    out += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="url(#g${i % 2 === 0 ? 'A' : 'B'})" opacity="0.55" />`;
  }
  return out;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}

// Shared defs that give the hero icon a "plated / rendered" sense of depth: a
// blurred contact shadow beneath it and a soft glossy highlight behind it,
// instead of a flat emoji floating on a color block.
function depthDefs() {
  return `
    <filter id="softBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
    <radialGradient id="highlight" cx="38%" cy="32%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>`;
}

export function generateCoverSvg({ slug, title, emoji, colorFrom, colorTo }) {
  const w = 800;
  const h = 480;
  const seed = hashSeed(slug);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorFrom}" />
      <stop offset="100%" stop-color="${colorTo}" />
    </linearGradient>
    <radialGradient id="gA"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" /><stop offset="100%" stop-color="#ffffff" stop-opacity="0" /></radialGradient>
    <radialGradient id="gB"><stop offset="0%" stop-color="#000000" stop-opacity="0.12" /><stop offset="100%" stop-color="#000000" stop-opacity="0" /></radialGradient>
    ${depthDefs()}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" />
  ${blobs(seed, w, h)}
  <circle cx="${w / 2}" cy="${h / 2 - 10}" r="220" fill="url(#highlight)" />
  <ellipse cx="${w / 2}" cy="${h / 2 + 150}" rx="190" ry="34" fill="#000000" opacity="0.28" filter="url(#softBlur)" />
  <text x="50%" y="52%" font-size="260" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">${emoji}</text>
</svg>`;
  return writeSvg('restaurants', `${slug}.svg`, svg);
}

export function generateLogoSvg({ slug, initials, color }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="32" fill="${color}" />
  <text x="50%" y="54%" font-size="60" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" font-family="'Segoe UI', Arial, sans-serif">${initials}</text>
</svg>`;
  return writeSvg('logos', `${slug}.svg`, svg);
}

export function generateDishSvg({ slug, emoji, colorFrom, colorTo }) {
  const w = 600;
  const h = 600;
  const seed = hashSeed(slug + 'dish');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorFrom}" />
      <stop offset="100%" stop-color="${colorTo}" />
    </linearGradient>
    <radialGradient id="gA"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" /><stop offset="100%" stop-color="#ffffff" stop-opacity="0" /></radialGradient>
    <radialGradient id="gB"><stop offset="0%" stop-color="#000000" stop-opacity="0.1" /><stop offset="100%" stop-color="#000000" stop-opacity="0" /></radialGradient>
    ${depthDefs()}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" />
  ${blobs(seed, w, h)}
  <circle cx="${w / 2}" cy="${h / 2 - 15}" r="260" fill="url(#highlight)" />
  <ellipse cx="${w / 2}" cy="${h / 2 + 185}" rx="150" ry="28" fill="#000000" opacity="0.25" filter="url(#softBlur)" />
  <text x="50%" y="50%" font-size="340" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">${emoji}</text>
</svg>`;
  return writeSvg('dishes', `${slug}.svg`, svg);
}
