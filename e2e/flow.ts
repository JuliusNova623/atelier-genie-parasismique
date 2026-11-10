import type { Page } from '@playwright/test';

const SHORT = { timeout: 1000 };

/**
 * Les cartes à effet ouvrent des étapes (choisir un joueur, boire, répartir…) avant la fin du tour.
 * Les tests ne savent pas quelle carte sort : on répond à chaque étape jusqu'au retour à la roue.
 */
export async function finishFlow(page: Page): Promise<void> {
  const wheel = page.getByRole('button', { name: 'Lancer la roulette', exact: true });
  for (let i = 0; i < 40; i++) {
    if (await wheel.isVisible()) return;
    const step = page.locator('[data-step]').first();
    if ((await step.count()) === 0) {
      await page.waitForTimeout(100);
      continue;
    }
    const plus = step.locator('[aria-label^="Plus pour"]').first();
    const confirm = step.locator('[data-confirm]:not([disabled])').first();
    const choice = step.locator('[data-choice]').first();
    // Répartition : toutes les portions sur le premier joueur, puis « Distribuer ».
    for (let k = 0; k < 6 && (await plus.count()) && (await plus.isEnabled(SHORT)); k++) {
      await plus.click(SHORT).catch(() => undefined);
    }
    if (await confirm.count()) await confirm.click(SHORT).catch(() => undefined);
    else if (await choice.count()) await choice.click(SHORT).catch(() => undefined);
    await page.waitForTimeout(50);
  }
}
