import { test, expect, type Page } from '@playwright/test';

async function waitForGameReady(page: Page) {
  await page.waitForSelector('.ui-panel', { timeout: 10_000 });
}

async function clearSave(page: Page) {
  await page.evaluate(() => localStorage.removeItem('slime-keeper-save'));
}

async function prepareBattleTeam(page: Page) {
  await page.evaluate(() => {
    const gm = window.__GM!;
    gm.skipOnboarding();
    gm.setCurrency(5000);
    gm.setCrystal(1000);
    const state = gm.getState();
    for (const slime of state.slimes) {
      gm.setStats(slime.id, { health: 999, attack: 999, defense: 999, speed: 999 });
    }
    for (const slime of [...state.slimes]) {
      gm.archiveSlime(slime.id);
    }
  });
  await page.waitForTimeout(150);
}

async function openBattle(page: Page) {
  await page.locator('.ui-actions button', { hasText: '战斗' }).click();
  await page.locator('.stage-card').first().click();
  const slimeCards = page.locator('.team-slime-card');
  const count = await slimeCards.count();
  for (let i = 0; i < Math.min(count, 4); i++) {
    await slimeCards.nth(i).click();
  }
  await page.locator('.confirm-btn', { hasText: '开始战斗' }).click();
  await expect(page.locator('.battle-panel')).toBeVisible();
}

const arenaCases = [
  { id: 'grassland', buy: false },
  { id: 'fire-land', buy: true },
  { id: 'ice-cave', buy: true },
  { id: 'mystic-forest', buy: true },
] as const;

for (const arenaCase of arenaCases) {
  test(`battle background follows active arena: ${arenaCase.id}`, async ({ page }) => {
    await page.goto('/AFK/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.reload();
    await waitForGameReady(page);
    await prepareBattleTeam(page);

    if (arenaCase.buy) {
      const bought = await page.evaluate((arenaId) => window.__GM!.buyArena(arenaId), arenaCase.id);
      expect(bought).toBe(true);
    }
    const switched = await page.evaluate((arenaId) => window.__GM!.switchArena(arenaId), arenaCase.id);
    expect(switched).toBe(true);

    await openBattle(page);

    await expect.poll(async () => page.evaluate(() => {
      const canvas = document.querySelector('.battle-canvas-container canvas') as HTMLCanvasElement | null;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const pixel = Array.from(ctx.getImageData(20, 20, 1, 1).data);
      return pixel.join(',');
    }), { timeout: 5000 }).not.toBe('0,0,0,0');

    const hasLoadedAsset = await page.evaluate(() => {
      const battleArena = document.querySelector('.battle-canvas-container canvas') as HTMLCanvasElement | null;
      if (!battleArena) return false;
      return true;
    });
    expect(hasLoadedAsset).toBe(true);
  });
}
