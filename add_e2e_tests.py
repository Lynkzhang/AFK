"""Append M38 BackpackUI E2E tests."""

new_tests = """
// =========================================================
// M38: BackpackUI E2E Tests (#194)
// =========================================================
test.describe('M38 BackpackUI', () => {

  test('backpack button opens backpack panel', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    // Backpack panel should be hidden initially
    await expect(page.locator('.backpack-panel')).not.toBeVisible();

    // Open via GM command
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-panel', { timeout: 3000 });
    await expect(page.locator('.backpack-panel')).toBeVisible();
  });

  test('backpack close button hides panel', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-panel', { timeout: 3000 });

    await page.locator('.backpack-close-btn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.backpack-panel')).not.toBeVisible();
  });

  test('backpack shows slime cards', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    const cardCount = await page.locator('.backpack-card').count();
    expect(cardCount).toBeGreaterThan(0);

    // Cards should show stats
    await expect(page.locator('.backpack-card-stats').first()).toBeVisible();

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('clicking backpack card shows detail pane', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(200);

    // Detail pane should show action buttons
    await expect(page.locator('.backpack-detail-sell-btn')).toBeVisible();
    await expect(page.locator('.backpack-detail-cull-btn')).toBeVisible();

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('backpack tab switching works', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-panel', { timeout: 3000 });

    // Active tab is default
    await expect(page.locator('.backpack-tab-btn[data-tab="active"]')).toHaveClass(/active/);

    // Switch to archived tab
    await page.locator('.backpack-tab-btn[data-tab="archived"]').click();
    await page.waitForTimeout(100);
    await expect(page.locator('.backpack-tab-btn[data-tab="archived"]')).toHaveClass(/active/);

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('backpack detail sell decreases slime count and increases currency', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);

    const initialCount = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    const initialCurrency = await page.evaluate(() => window.__GM!.getState().currency) as number;

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__GM!.closeBackpack());

    const afterCount = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    const afterCurrency = await page.evaluate(() => window.__GM!.getState().currency) as number;
    expect(afterCount).toBe(initialCount - 1);
    expect(afterCurrency).toBeGreaterThan(initialCurrency);
  });

  test('backpack sort by stats changes order', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-panel', { timeout: 3000 });

    // Default sort is rarity
    const rarityActive = await page.evaluate(() => {
      const btn = document.querySelector('.backpack-sort-btn[data-sort="rarity"]');
      return btn?.classList.contains('backpack-sort-active') ?? false;
    });
    expect(rarityActive).toBe(true);

    // Switch to stats sort
    await page.locator('.backpack-sort-btn[data-sort="stats"]').click();
    await page.waitForTimeout(100);

    const statsActive = await page.evaluate(() => {
      return document.querySelector('.backpack-sort-btn[data-sort="stats"]')?.classList.contains('backpack-sort-active') ?? false;
    });
    expect(statsActive).toBe(true);

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('backpack rarity filter works', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    const totalCount = await page.locator('.backpack-card').count();
    expect(totalCount).toBeGreaterThan(0);

    // Filter by Legendary (none should match in classic state)
    await page.locator('.backpack-filter-btn[data-filter="Legendary"]').click();
    await page.waitForTimeout(100);
    const legendaryCount = await page.locator('.backpack-card').count();
    expect(legendaryCount).toBe(0);

    // Reset filter
    await page.locator('.backpack-filter-btn[data-filter="all"]').click();
    await page.waitForTimeout(100);
    const resetCount = await page.locator('.backpack-card').count();
    expect(resetCount).toBe(totalCount);

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('backpack batch operations work', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);

    const initialCount = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    // Check a checkbox to trigger batch bar
    await page.evaluate(() => {
      const cb = document.querySelector('.backpack-card-checkbox') as HTMLInputElement | null;
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);

    // Batch bar should appear
    await expect(page.locator('.backpack-batch-bar')).toBeVisible();
    await expect(page.locator('.backpack-batch-cull-btn')).toBeVisible();

    // Click batch cull
    const toastP = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.locator('.backpack-batch-cull-btn').click();
    await toastP;
    await page.evaluate(() => window.__GM!.closeBackpack());

    const afterCount = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    expect(afterCount).toBeLessThan(initialCount);
  });

  test('backpack archive and unarchive flow', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);

    const initialActiveCount = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    expect(initialActiveCount).toBeGreaterThan(0);

    // Open backpack and archive a slime
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-archive-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.waitForTimeout(300);

    // Switch to archived tab and verify
    await page.locator('.backpack-tab-btn[data-tab="archived"]').click();
    await page.waitForTimeout(100);

    const archivedCount = await page.locator('.backpack-card').count();
    expect(archivedCount).toBeGreaterThan(0);

    // Unarchive
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-unarchive-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.waitForTimeout(300);

    await page.evaluate(() => window.__GM!.closeBackpack());

    const finalActiveCount = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    expect(finalActiveCount).toBe(initialActiveCount);
  });

  test('backpack Esc key closes panel', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-panel', { timeout: 3000 });
    await expect(page.locator('.backpack-panel')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(page.locator('.backpack-panel')).not.toBeVisible();
  });

});
"""

with open('repo/e2e/game.spec.ts', encoding='utf-8') as f:
    c = f.read()

c = c + new_tests

with open('repo/e2e/game.spec.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print('Added M38 BackpackUI tests')
print('Total tests now:', c.count('  test('))
