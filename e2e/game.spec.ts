import { expect, test, type Page } from '@playwright/test';

async function createGame(page: Page, names: string[]) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  for (const name of names) {
    await page.getByLabel('Nom du joueur', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  }
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await expect(page.getByRole('button', { name: 'Lancer la roulette', exact: true })).toBeVisible();
}

/** Roue → carte (dé) : s'arrête sur la page de carte. */
async function drawCard(page: Page) {
  await page.getByRole('button', { name: 'Lancer la roulette', exact: true }).click();
  // Mode « Direct » (défaut) : le numéro de carte se tire tout seul après la roue.
  await expect(page.getByRole('heading', { name: /^Carte n°\d+$/ })).toBeVisible();
}

test('parcours complet : créer, jouer un tour, terminer, historique', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await createGame(page, ['Alice', 'Bob']);
  await expect(page.getByText('Alice').first()).toBeVisible();

  await drawCard(page);
  await page.getByRole('button', { name: /Je (réponds|le fais) \(\+3\)/ }).click();
  await expect(page.getByRole('button', { name: 'Lancer la roulette', exact: true })).toBeVisible();
  await expect(page.getByText('Bob').first()).toBeVisible();

  // Tour de Bob : il boit au lieu de faire la carte.
  await drawCard(page);
  await page.getByRole('button', { name: /^Je bois/ }).click();
  await expect(page.getByRole('heading', { name: 'Étape boisson' })).toBeVisible();
  // La boisson se tire aussi toute seule ; on valide quand le résultat s'affiche.
  await page.getByRole('button', { name: /J’ai bu/ }).click();

  await page.getByRole('button', { name: 'Scores' }).click();
  const sheet = page.getByRole('dialog', { name: 'Tableau des scores' });
  await expect(sheet.getByRole('listitem').first()).toContainText('Alice');
  await expect(sheet.getByRole('listitem').first()).toContainText('3');
  await sheet.getByRole('button', { name: 'Terminer la partie' }).click();

  await expect(page.getByRole('heading', { name: 'Fin de la partie' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Gagnants : 🏆 Alice/ })).toBeVisible();

  await page.getByRole('button', { name: 'Accueil' }).click();
  await page.getByRole('button', { name: 'Historique' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem').first()).toContainText('Alice');
});

test('la partie reprend exactement où on l’a laissée après un rechargement', async ({ page }) => {
  await createGame(page, ['Alice', 'Bob']);
  await drawCard(page);
  await page.reload();
  // La carte tirée est conservée : on reste sur la page de carte, pas de nouveau tirage.
  await expect(page.getByRole('heading', { name: /^Carte n°\d+$/ })).toBeVisible();
  const title = await page.getByRole('heading', { name: /^Carte n°\d+$/ }).textContent();

  await page.goto('/#/');
  await page.getByRole('button', { name: /Reprendre la partie en cours/ }).click();
  await expect(page.getByRole('heading', { name: title ?? '' })).toBeVisible();
});

test('aucune requête réseau externe, aucune erreur console', async ({ page }) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (
      !url.startsWith('http://localhost:4173') &&
      !url.startsWith('data:') &&
      !url.startsWith('blob:')
    ) {
      external.push(url);
    }
  });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  await createGame(page, ['Alice', 'Bob']);
  await drawCard(page);
  await page.getByRole('button', { name: /Je (réponds|le fais)/ }).click();
  await page.goto('/#/settings');
  await page.goto('/#/history');
  await page.goto('/#/import');

  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('fonctionne hors-ligne', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Roulette Soirée' })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  for (const name of ['Alice', 'Bob']) {
    await page.getByLabel('Nom du joueur', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  }
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await drawCard(page);
  await expect(page.getByRole('button', { name: /Je (réponds|le fais)/ })).toBeVisible();
});
