// Génère les PNG sources de l'icône adaptative et du splash (puis : npx capacitor-assets generate --android).
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const colors = [
  '#ff2fb3',
  '#20e3ff',
  '#a855f7',
  '#ffb020',
  '#22d36b',
  '#ff5c5c',
  '#4f8cff',
  '#f472b6',
  '#c6f432',
  '#ff7a1a',
];

function wheel(cx, cy, r) {
  const n = colors.length;
  const pt = (deg, rad) => [
    cx + rad * Math.sin((deg * Math.PI) / 180),
    cy - rad * Math.cos((deg * Math.PI) / 180),
  ];
  const sectors = colors
    .map((c, i) => {
      const [x0, y0] = pt((i * 360) / n, r);
      const [x1, y1] = pt(((i + 1) * 360) / n, r);
      return `<path d="M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z" fill="${c}" stroke="#12001f" stroke-width="${r * 0.025}"/>`;
    })
    .join('');
  const [px, py] = pt(0, r);
  return `
    ${sectors}
    <circle cx="${cx}" cy="${cy}" r="${r * 0.16}" fill="#12001f" stroke="#fff" stroke-width="${r * 0.03}"/>
    <polygon points="${px - r * 0.11},${py - r * 0.1} ${px + r * 0.11},${py - r * 0.1} ${px},${py + r * 0.12}" fill="#fff" stroke="#12001f" stroke-width="${r * 0.02}"/>`;
}

const bg = (
  s,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#3a1070"/><stop offset="1" stop-color="#0b0614"/></radialGradient></defs>
  <rect width="${s}" height="${s}" fill="url(#g)"/></svg>`;

// Avant-plan adaptatif : la roue tient dans la zone sûre (≈ 66 % centrale de 1024 px).
const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${wheel(512, 540, 290)}</svg>`;
const only = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#3a1070"/><stop offset="1" stop-color="#0b0614"/></radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>${wheel(512, 540, 350)}</svg>`;
const splash = (
  dark,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${dark ? '#0b0614' : '#0b0614'}"/>${wheel(1366, 1400, 420)}</svg>`;

const out = [
  ['assets/icon-background.png', bg(1024), 1024],
  ['assets/icon-foreground.png', fg, 1024],
  ['assets/icon-only.png', only, 1024],
  ['assets/splash.png', splash(false), 2732],
  ['assets/splash-dark.png', splash(true), 2732],
];
for (const [file, svg] of out) {
  await sharp(Buffer.from(svg)).png().toFile(file);
}
writeFileSync(
  'assets/README.md',
  "Sources de l'icône et du splash, générées par `node tools/make-assets.mjs`.\n",
);
console.log('ok');
