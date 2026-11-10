import { finishFlow } from './flow';
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Version navigateur autonome : un seul fichier HTML ouvert directement depuis le disque (file://),
 * comme sur un ordinateur relié à la TV. Aucun serveur, aucun réseau.
 */
const FILE = resolve('dist-web/roulette-soiree.html');
const URL_FILE = pathToFileURL(FILE).href;

test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeAll(() => {
  expect(existsSync(FILE), `Lancez « npm run build:web » avant : ${FILE}`).toBe(true);
});

test('le fichier HTML autonome s’ouvre sans serveur, sans réseau et sans erreur', async ({
  page,
}) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) external.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(URL_FILE);
  await expect(page.getByRole('heading', { name: 'Roulette Soirée' })).toBeVisible();
  // Polices embarquées dans le fichier.
  await expect
    .poll(() =>
      page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').length),
    )
    .toBeGreaterThan(1);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('sur grand écran, le mode TV s’active seul et la partie se joue au clavier', async ({
  page,
}) => {
  await page.goto(URL_FILE);
  await expect(page.locator('html')).toHaveAttribute('data-display', 'tv');

  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  for (const name of ['Alice', 'Bob', 'Chloé']) {
    await page.getByLabel('Nom du joueur', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  }
  await page.getByRole('button', { name: 'Lancer la partie' }).click();

  // Scores en direct + raccourcis visibles en mode écran.
  const live = page.getByRole('region', { name: 'Scores en direct' });
  await expect(live).toBeVisible();
  await expect(live.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByText('Raccourcis clavier')).toBeVisible();

  // Espace : lance la roue, la carte se tire toute seule (mode Direct).
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: /^Carte n°\d+$/ })).toBeVisible({
    timeout: 20_000,
  });

  // Espace : « Je le fais » → +3 pour Alice, c'est au tour de Bob.
  await page.keyboard.press('Space');
  await finishFlow(page);
  await expect(page.getByRole('button', { name: 'Lancer la roulette', exact: true })).toBeVisible();
  const first = live.getByRole('listitem').first();
  await expect(first).toContainText('Alice');
  await expect(first).toContainText('3');
  await expect(page.getByLabel('Au tour de Bob')).toBeVisible();
});

test('B = « Je bois » : boire est obligatoire, +1 point, aucun refus possible', async ({
  page,
}) => {
  await page.goto(URL_FILE);
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  for (const name of ['Alice', 'Bob']) {
    await page.getByLabel('Nom du joueur', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  }
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  // Attendre l'écran de jeu avant d'utiliser le clavier.
  await expect(page.getByRole('region', { name: 'Scores en direct' })).toBeVisible();

  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: /^Carte n°\d+$/ })).toBeVisible({
    timeout: 20_000,
  });
  await page.keyboard.press('b');
  await expect(page.getByRole('heading', { name: 'Étape boisson' })).toBeVisible();
  await expect(page.getByRole('button', { name: /J’ai bu/ })).toBeVisible({ timeout: 20_000 });
  // Aucune façon de ne pas boire.
  await expect(page.getByRole('button', { name: /Je ne bois pas|refus/i })).toHaveCount(0);
  await page.keyboard.press('b');
  const first = page
    .getByRole('region', { name: 'Scores en direct' })
    .getByRole('listitem')
    .filter({ hasText: 'Alice' });
  await expect(first).toContainText('1');
});

test('la partie survit à un rechargement du fichier (stockage local du navigateur)', async ({
  page,
}) => {
  await page.goto(URL_FILE);
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  for (const name of ['Alice', 'Bob']) {
    await page.getByLabel('Nom du joueur', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  }
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await expect(page.getByRole('region', { name: 'Scores en direct' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Scores en direct' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Scores en direct' })).toContainText('Bob');
});
