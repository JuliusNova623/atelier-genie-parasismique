// Renomme le fichier autonome : dist-web/index.html -> dist-web/roulette-soiree.html (plus parlant à partager).
import { copyFileSync, existsSync, rmSync, statSync } from 'node:fs';

const from = 'dist-web/index.html';
const to = 'dist-web/roulette-soiree.html';
if (!existsSync(from)) throw new Error(`Build web introuvable : ${from}`);
copyFileSync(from, to);
rmSync(from);
const mb = (statSync(to).size / 1024 / 1024).toFixed(2);
console.log(`OK : ${to} (${mb} Mo) — à ouvrir d'un double-clic dans le navigateur.`);
