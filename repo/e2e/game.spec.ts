/**
 * E2E Tests for Slime Keeper
 *
 * Covers:
 * 1. Page load & UI elements
 * 2. GM API (window.__GM)
 * 3. Full battle flow (select stage → select team → battle → result)
 * 4. Save / Load
 * 5. Split / Sell
 * 6. Archive System
 * 7. Facility System
 */
import { test, expect, type Page } from '@playwright/test';

// ---------- helpers ----------

/** Wait for the game to initialize (UI panel visible) */
async function waitForGameReady(page: Page) {
  await page.waitForSelector('.ui-panel', { timeout: 10_000 });
}

/** Clear localStorage so tests start fresh */
async function clearSave(page: Page) {
  await page.evaluate(() => localStorage.removeItem('slime-keeper-save'));
}

// =========================================================
// Test 1: Page Load & UI Elements
// =========================================================
test.describe('Page Load', () => {
  test('should display core UI elements after load', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Title
    await expect(page.locator('.ui-panel h1')).toHaveText('Slime Keeper');

    // Currency display
    await expect(page.locator('.ui-panel').locator('text=Currency:')).toBeVisible();

    // Slime count
    await expect(page.locator('.ui-panel').locator('text=Slimes:')).toBeVisible();

    // Buttons – 新游戏, 保存, 加载, 战斗, 封存库, 设施
    const buttons = page.locator('.ui-actions button');
    await expect(buttons).toHaveCount(6);

    // Slime list section
    await expect(page.locator('.slime-list')).toBeVisible();
  });
});

// =========================================================
// Test 2: GM API
// =========================================================
test.describe('GM API', () => {
  test('window.__GM should be available and functional', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // GM object exists
    const hasGM = await page.evaluate(() => typeof window.__GM !== 'undefined');
    expect(hasGM).toBe(true);

    // getState returns a valid GameState
    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state).toHaveProperty('slimes');
    expect(state).toHaveProperty('currency');
    expect(Array.isArray(state.slimes)).toBe(true);

    // Record initial count
    const initialCount = state.slimes.length as number;

    // addSlime
    await page.evaluate(() => window.__GM!.addSlime());
    const afterAdd = await page.evaluate(() => window.__GM!.getState());
    expect(afterAdd.slimes.length).toBe(initialCount + 1);

    // setCurrency
    await page.evaluate(() => window.__GM!.setCurrency(9999));
    const afterCurrency = await page.evaluate(() => window.__GM!.getState());
    expect(afterCurrency.currency).toBe(9999);

    // removeSlime
    const idToRemove = afterAdd.slimes[afterAdd.slimes.length - 1]!.id as string;
    await page.evaluate((id) => window.__GM!.removeSlime(id), idToRemove);
    const afterRemove = await page.evaluate(() => window.__GM!.getState());
    expect(afterRemove.slimes.length).toBe(initialCount);

    // setStats
    const firstId = afterRemove.slimes[0]!.id as string;
    await page.evaluate((id) => window.__GM!.setStats(id, { attack: 999 }), firstId);
    const afterStats = await page.evaluate(() => window.__GM!.getState());
    interface SlimeData { id: string; stats: { attack: number } }
    const modifiedSlime = (afterStats.slimes as SlimeData[]).find((s) => s.id === firstId);
    expect(modifiedSlime!.stats.attack).toBe(999);
  });

  test('startBattle should return a BattleResult', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const result = await page.evaluate(() => window.__GM!.startBattle('1-1'));
    expect(result).toHaveProperty('victory');
    expect(result).toHaveProperty('turnsUsed');
    expect(result).toHaveProperty('stars');
    expect(result).toHaveProperty('rewards');
    expect(typeof result.victory).toBe('boolean');
    expect(result.turnsUsed).toBeGreaterThan(0);
  });
});

// =========================================================
// Test 3: Full Battle Flow (Stage Select → Team Select → Battle → Result)
// =========================================================
test.describe('Full Battle Flow', () => {
  test('complete battle from stage select to result', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);

    // Click "新游戏" to ensure fresh state
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // Boost slime stats via GM to guarantee victory
    await page.evaluate(() => {
      const gm = window.__GM!;
      const state = gm.getState();
      for (const s of state.slimes) {
        gm.setStats(s.id, { health: 999, attack: 999, defense: 999, speed: 999 });
      }
    });

    // Archive all slimes so they appear in team select (which now reads from archivedSlimes)
    await page.evaluate(() => {
      const gm = window.__GM!;
      const state = gm.getState();
      for (const s of [...state.slimes]) {
        gm.archiveSlime(s.id);
      }
    });

    // Step 1: Click "⚔ 战斗" button to open stage select
    await page.locator('.ui-actions button', { hasText: '战斗' }).click();
    await expect(page.locator('.stage-select-panel')).toBeVisible();

    // Step 2: Select stage 1-1 (first stage card)
    const stageCards = page.locator('.stage-card');
    await expect(stageCards.first()).toBeVisible();
    await stageCards.first().click();

    // Step 3: Team select should be visible
    await expect(page.locator('.team-select-panel')).toBeVisible();
    await expect(page.locator('.stage-label')).toHaveText('关卡: 1-1');

    // Select all slimes (click each card)
    const slimeCards = page.locator('.team-slime-card');
    const slimeCount = await slimeCards.count();
    expect(slimeCount).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(slimeCount, 4); i++) {
      await slimeCards.nth(i).click();
    }

    // Step 4: Click "开始战斗" button
    await page.locator('.confirm-btn', { hasText: '开始战斗' }).click();

    // Step 5: Battle panel should appear
    await expect(page.locator('.battle-panel')).toBeVisible();

    // Step 6: Click "跳过动画"
    await page.locator('button', { hasText: '跳过动画' }).click();

    // Step 7: Result should show
    await expect(page.locator('.battle-result')).toBeVisible({ timeout: 10_000 });

    // Should have victory (we boosted stats)
    await expect(page.locator('.result-victory')).toBeVisible();

    // Stars should show
    const starsText = await page.locator('.result-stars').textContent();
    expect(starsText).toContain('★');

    // Step 8: Click "确定" to close battle
    await page.locator('.confirm-btn', { hasText: '确定' }).click();

    // Battle panel should be hidden, main UI visible
    await expect(page.locator('.ui-panel h1')).toBeVisible();
  });
});

// =========================================================
// Test 4: Save / Load
// =========================================================
test.describe('Save & Load', () => {
  test('save state and load it back', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);

    // Start fresh
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // Set a recognizable currency value
    await page.evaluate(() => window.__GM!.setCurrency(7777));
    await page.waitForTimeout(500);

    // Click "保存"
    await page.locator('.ui-actions button', { hasText: '保存' }).click();

    // Verify localStorage has the save
    const hasSave = await page.evaluate(() => localStorage.getItem('slime-keeper-save') !== null);
    expect(hasSave).toBe(true);

    // Change currency to something else
    await page.evaluate(() => window.__GM!.setCurrency(0));
    await page.waitForTimeout(300);

    // Click "加载"
    await page.locator('.ui-actions button', { hasText: '加载' }).click();
    await page.waitForTimeout(300);

    // Verify currency restored
    const restoredCurrency = await page.evaluate(() => window.__GM!.getState().currency);
    expect(restoredCurrency).toBe(7777);
  });

  test('new game resets state', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Modify state
    await page.evaluate(() => window.__GM!.setCurrency(5555));

    // Click "新游戏"
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // Currency should be reset to default (100)
    const currency = await page.evaluate(() => window.__GM!.getState().currency);
    expect(currency).toBe(100);
  });
});

// =========================================================
// Test 5: Split (triggerSplit) & Sell
// =========================================================
test.describe('Split & Sell', () => {
  test('triggerSplit adds a child slime', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Start fresh
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    const beforeCount = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;

    // Trigger split via GM
    await page.evaluate(() => window.__GM!.triggerSplit());
    await page.waitForTimeout(300);

    const afterCount = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    expect(afterCount).toBe(beforeCount + 1);

    // The new slime should have a parentId
    const slimes = await page.evaluate(() => window.__GM!.getState().slimes);
    interface SlimeInfo { parentId: string | null; generation: number }
    const child = (slimes as SlimeInfo[])[slimes.length - 1]!;
    expect(child.parentId).not.toBeNull();
    expect(child.generation).toBeGreaterThan(0);
  });

  test('selling a slime increases currency and removes it', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Start fresh
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(500);

    const initialState = await page.evaluate(() => window.__GM!.getState());
    const initialCurrency = initialState.currency as number;
    const initialCount = initialState.slimes.length as number;
    expect(initialCount).toBeGreaterThan(0);

    // The game loop continuously re-renders the slime list, which detaches
    // DOM nodes between frames. We use page.evaluate to click the sell button
    // directly within a single JS tick, avoiding the detachment race.
    await page.evaluate(() => {
      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(2)') as HTMLButtonElement | null;
      btn?.click();
    });

    // Wait for state update + UI re-render
    await page.waitForTimeout(500);

    // Verify slime count decreased
    const afterState = await page.evaluate(() => window.__GM!.getState());
    expect(afterState.slimes.length).toBe(initialCount - 1);

    // Currency should have increased
    expect(afterState.currency).toBeGreaterThan(initialCurrency);
  });
});

// =========================================================
// Test 6: Archive System
// =========================================================
test.describe('Archive System', () => {
  test('archive a slime from breeding grounds to archive', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    const initialState = await page.evaluate(() => window.__GM!.getState());
    const initialSlimeCount = initialState.slimes.length as number;
    const initialArchiveCount = initialState.archivedSlimes.length as number;
    expect(initialSlimeCount).toBeGreaterThan(0);

    // Archive the first slime via GM
    const firstId = initialState.slimes[0]!.id as string;
    const result = await page.evaluate((id) => window.__GM!.archiveSlime(id), firstId);
    expect(result.success).toBe(true);

    const afterState = await page.evaluate(() => window.__GM!.getState());
    expect(afterState.slimes.length).toBe(initialSlimeCount - 1);
    expect(afterState.archivedSlimes.length).toBe(initialArchiveCount + 1);
  });

  test('unarchive a slime from archive back to breeding grounds', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // Archive first
    const firstId = await page.evaluate(() => {
      const id = window.__GM!.getState().slimes[0]!.id;
      window.__GM!.archiveSlime(id);
      return id;
    }) as string;

    const afterArchive = await page.evaluate(() => window.__GM!.getState());
    const archivedCount = afterArchive.archivedSlimes.length as number;
    const slimeCount = afterArchive.slimes.length as number;

    // Unarchive
    const result = await page.evaluate((id) => window.__GM!.unarchiveSlime(id), firstId);
    expect(result.success).toBe(true);

    const afterUnarchive = await page.evaluate(() => window.__GM!.getState());
    expect(afterUnarchive.archivedSlimes.length).toBe(archivedCount - 1);
    expect(afterUnarchive.slimes.length).toBe(slimeCount + 1);
  });

  test('evaluatePrice returns a positive price based on stats and rarity', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    const firstId = await page.evaluate(() => window.__GM!.getState().slimes[0]!.id) as string;
    const price = await page.evaluate((id) => window.__GM!.evaluatePrice(id), firstId);
    expect(price).toBeGreaterThan(0);

    // Boost stats and check price increases
    await page.evaluate((id) => window.__GM!.setStats(id, { health: 999, attack: 999 }), firstId);
    const boostedPrice = await page.evaluate((id) => window.__GM!.evaluatePrice(id), firstId);
    expect(boostedPrice).toBeGreaterThan(price);
  });
});

// =========================================================
// Test 7: Facility System
// =========================================================
test.describe('Facility System', () => {
  test('upgrade deducts gold, increases level, and max level blocks further upgrades', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // Give enough gold
    await page.evaluate(() => window.__GM!.setCurrency(999999));

    // Get initial facility state
    const facilities = await page.evaluate(() => window.__GM!.getFacilities());
    expect(facilities.length).toBe(4);

    const facilityId = 'breeding-accelerator';
    const initialLevel = facilities.find((f: { id: string }) => f.id === facilityId)!.level as number;
    expect(initialLevel).toBe(1);

    // Upgrade once
    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency) as number;
    const upgraded = await page.evaluate((id) => window.__GM!.upgradeFacility(id), facilityId);
    expect(upgraded).toBe(true);

    const afterUpgrade = await page.evaluate(() => window.__GM!.getState());
    const facilityAfter = afterUpgrade.facilities.find((f: { id: string }) => f.id === facilityId)!;
    expect(facilityAfter.level).toBe(initialLevel + 1);
    expect(afterUpgrade.currency).toBeLessThan(currencyBefore);

    // Upgrade to max level
    for (let i = facilityAfter.level; i < 10; i++) {
      await page.evaluate((id) => window.__GM!.upgradeFacility(id), facilityId);
    }

    const maxState = await page.evaluate(() => window.__GM!.getState());
    const maxFacility = maxState.facilities.find((f: { id: string }) => f.id === facilityId)!;
    expect(maxFacility.level).toBe(10);

    // Try to upgrade beyond max — should fail
    const overUpgrade = await page.evaluate((id) => window.__GM!.upgradeFacility(id), facilityId);
    expect(overUpgrade).toBe(false);
  });

  test('save and load preserves facility levels', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // Give gold and upgrade
    await page.evaluate(() => window.__GM!.setCurrency(999999));
    await page.evaluate(() => window.__GM!.upgradeFacility('field-expansion'));
    await page.evaluate(() => window.__GM!.upgradeFacility('field-expansion'));

    const beforeSave = await page.evaluate(() =>
      window.__GM!.getFacilities().find((f: { id: string }) => f.id === 'field-expansion')
    );
    expect(beforeSave.level).toBe(3);

    // Save
    await page.locator('.ui-actions button', { hasText: '保存' }).click();
    await page.waitForTimeout(300);

    // Reset state
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // After new game, level should be 1
    const afterReset = await page.evaluate(() =>
      window.__GM!.getFacilities().find((f: { id: string }) => f.id === 'field-expansion')
    );
    expect(afterReset.level).toBe(1);

    // Load
    await page.locator('.ui-actions button', { hasText: '加载' }).click();
    await page.waitForTimeout(300);

    // Level should be restored to 3
    const afterLoad = await page.evaluate(() =>
      window.__GM!.getFacilities().find((f: { id: string }) => f.id === 'field-expansion')
    );
    expect(afterLoad.level).toBe(3);
  });

  test('insufficient gold prevents upgrade', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // Set currency to 0
    await page.evaluate(() => window.__GM!.setCurrency(0));

    const facilityId = 'breeding-accelerator';
    const result = await page.evaluate((id) => window.__GM!.upgradeFacility(id), facilityId);
    expect(result).toBe(false);

    // Level should remain 1
    const facility = await page.evaluate(() =>
      window.__GM!.getFacilities().find((f: { id: string }) => f.id === 'breeding-accelerator')
    );
    expect(facility.level).toBe(1);

    // Currency should still be 0
    const currency = await page.evaluate(() => window.__GM!.getState().currency);
    expect(currency).toBe(0);
  });
});
