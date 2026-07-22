// Self-contained data-URI illustrations for dummy food items — gradient
// backdrop + emoji, matching the SVG art style already used for restaurants
// and dishes elsewhere in the app, without any network dependency.
export function foodImage(emoji: string, colorFrom: string, colorTo: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorFrom}" />
      <stop offset="100%" stop-color="${colorTo}" />
    </linearGradient>
    <radialGradient id="hl" cx="38%" cy="32%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="480" height="480" fill="url(#bg)" />
  <circle cx="240" cy="215" r="175" fill="url(#hl)" />
  <ellipse cx="240" cy="380" rx="140" ry="24" fill="#000000" opacity="0.22" />
  <text x="50%" y="50%" font-size="200" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">${emoji}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// A wide, textured banner background (rich gradient + soft glows + a subtle
// scattered-food pattern) for section backdrops like "Today's Specials" —
// meant to read as a real photographic spread rather than a flat gradient,
// while staying a self-contained data URI like the rest of the app's art.
export function foodCollageBackground(emojis: string[]): string {
  const w = 1600;
  const h = 560;
  const positions = [
    { x: 110, y: 110, size: 150 },
    { x: 320, y: 400, size: 115 },
    { x: 540, y: 150, size: 170 },
    { x: 780, y: 420, size: 125 },
    { x: 1000, y: 120, size: 155 },
    { x: 1220, y: 400, size: 135 },
    { x: 1420, y: 150, size: 175 },
    { x: 1550, y: 440, size: 110 },
  ];
  const pattern = positions
    .map(
      (p, i) =>
        `<text x="${p.x}" y="${p.y}" font-size="${p.size}" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">${emojis[i % emojis.length]}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#151E4A" />
      <stop offset="50%" stop-color="#2A3F8F" />
      <stop offset="100%" stop-color="#3B5BDB" />
    </linearGradient>
    <radialGradient id="glowA" cx="15%" cy="22%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.24" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowB" cx="88%" cy="80%" r="55%">
      <stop offset="0%" stop-color="#ff7548" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#ff7548" stop-opacity="0" />
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="2" /></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" />
  <circle cx="${w * 0.15}" cy="${h * 0.25}" r="300" fill="url(#glowA)" />
  <circle cx="${w * 0.87}" cy="${h * 0.78}" r="340" fill="url(#glowB)" />
  <g filter="url(#soft)" opacity="0.24" fill="#ffffff">${pattern}</g>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
