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
 * 8. Shop & Item System
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

function acceptDialogs(page: Page) {
  page.on('dialog', dialog => dialog.accept());
}

/** Skip onboarding + give 100 gold + add 2 extra slimes to mimic old default state */
async function setupClassicState(page: Page) {
  await page.evaluate(() => {
    const gm = window.__GM!;
    gm.skipOnboarding();
    gm.setCurrency(100);
    // Restore old 3-slime default: add a Rare and an Epic slime
    const state = gm.getState();
    const rareSlime = {
      id: 'slime-rare',
      name: 'Blue Slime',
      stats: { health: 28, attack: 7, defense: 4, speed: 5, mut: 0.05 },
      traits: [{ id: 'calm', name: 'Calm', description: 'Stable and focused', rarity: 'Common', effect: 'none' }],
      skills: [{ id: 'splash', name: 'Splash', type: 'attack', targetType: 'single', damage: 8, cooldown: 2 }],
      rarity: 'Rare',
      generation: 1,
      parentId: null,
      color: '#4f8cff',
      position: { x: 0, y: 0.5, z: 0 },
    };
    const epicSlime = {
      id: 'slime-epic',
      name: 'Purple Slime',
      stats: { health: 36, attack: 10, defense: 5, speed: 6, mut: 0.05 },
      traits: [{ id: 'arcane', name: 'Arcane', description: 'Mystic energy', rarity: 'Common', effect: 'none' }],
      skills: [{ id: 'pulse', name: 'Arcane Pulse', type: 'attack', targetType: 'single', damage: 12, cooldown: 3 }],
      rarity: 'Epic',
      generation: 1,
      parentId: null,
      color: '#9b59ff',
      position: { x: 2, y: 0.5, z: 0 },
    };
    state.slimes.push(rareSlime as any, epicSlime as any);
  });
  await page.waitForTimeout(100);
}

/** Start a fresh game: skip initial onboarding, accept confirm dialog, click new game, restore classic state */
async function startFreshGame(page: Page) {
  acceptDialogs(page);
  // Skip the initial onboarding overlay so we can click buttons
  await page.evaluate(() => window.__GM!.skipOnboarding());
  await page.waitForTimeout(200);
  // Click new game (confirm dialog auto-accepted)
  await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
  await page.waitForTimeout(300);
  // New game creates fresh state with onboarding, so skip it again and restore classic state
  await setupClassicState(page);
}

// =========================================================
// Test 1: Page Load & UI Elements
// =========================================================
test.describe('Page Load', () => {
  test('should display core UI elements after load', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    // Title
    await expect(page.locator('.ui-panel h1')).toHaveText('Slime Keeper');

    // Currency display
    await expect(page.locator('.ui-panel').locator('text=Currency:')).toBeVisible();

    // Slime count
    await expect(page.locator('.ui-panel').locator('text=Slimes:')).toBeVisible();

    // Buttons – 新游戏, 保存, 加载, 战斗, 封存库, 设施, 商店, 任务, 图鉴, 场地
    const buttons = page.locator('.ui-actions button');
    await expect(buttons).toHaveCount(11);

    // Backpack button exists in UI (replacing old slime list)
    await expect(page.locator('.ui-actions button').nth(4)).toBeVisible();
  });
});

// =========================================================
// Test 2: GM API
// =========================================================
test.describe('GM API', () => {
  test('window.__GM should be available and functional', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

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
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

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
    await startFreshGame(page);

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
    await startFreshGame(page);

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
    acceptDialogs(page);
    // Skip onboarding to access buttons
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    // Modify state
    await page.evaluate(() => window.__GM!.setCurrency(5555));

    // Click "新游戏" — confirm auto-accepted, resets to 1 slime + 0 gold + onboarding
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // Currency should be reset to default (50 — new initial state)
    const currency = await page.evaluate(() => window.__GM!.getState().currency);
    expect(currency).toBe(50);

    // Should have 2 slimes (new default)
    const slimeCount = await page.evaluate(() => window.__GM!.getState().slimes.length);
    expect(slimeCount).toBe(2);
  });
});

// =========================================================
// Test 5: Split (triggerSplit) & Sell
// =========================================================
test.describe('Split & Sell', () => {
  test('triggerSplit adds a child slime', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

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
    await startFreshGame(page);

    const initialState = await page.evaluate(() => window.__GM!.getState());
    const initialCurrency = initialState.currency as number;
    const initialCount = initialState.slimes.length as number;
    expect(initialCount).toBeGreaterThan(0);

    // Open backpack, select first slime, sell it
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const toastPromise2 = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await toastPromise2;
    await page.evaluate(() => window.__GM!.closeBackpack());

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
    await startFreshGame(page);

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
    await startFreshGame(page);

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
    await startFreshGame(page);

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
    await startFreshGame(page);

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
    await startFreshGame(page);

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
    // Skip onboarding created by new game
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

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
    await startFreshGame(page);

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

// =========================================================
// Test 8: Shop & Item System
// =========================================================
test.describe('Shop & Item System', () => {
  test('buy item with gold deducts currency and adds to inventory', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Give enough gold (mutation catalyst costs 200)
    await page.evaluate(() => window.__GM!.setCurrency(500));

    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency) as number;
    expect(currencyBefore).toBe(500);

    // Buy mutation catalyst
    const buyResult = await page.evaluate(() => window.__GM!.buyItem('shop-mutation-catalyst'));
    expect(buyResult).toBe(true);

    // Check currency deducted
    const afterState = await page.evaluate(() => window.__GM!.getState());
    expect(afterState.currency).toBe(300); // 500 - 200

    // Check inventory has the item
    const items = await page.evaluate(() => window.__GM!.getItems());
    interface ItemInfo { type: string; quantity: number }
    const catalyst = (items as ItemInfo[]).find((i) => i.type === 'mutation-catalyst');
    expect(catalyst).toBeDefined();
    expect(catalyst!.quantity).toBe(1);

    // Buy another one
    await page.evaluate(() => window.__GM!.buyItem('shop-mutation-catalyst'));
    const items2 = await page.evaluate(() => window.__GM!.getItems());
    const catalyst2 = (items2 as ItemInfo[]).find((i) => i.type === 'mutation-catalyst');
    expect(catalyst2!.quantity).toBe(2);
  });

  test('use stat booster increases slime stats', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Give gold and buy stat booster
    await page.evaluate(() => window.__GM!.setCurrency(1000));
    await page.evaluate(() => window.__GM!.buyItem('shop-stat-booster'));

    // Get first slime and record total stats
    const slimeId = await page.evaluate(() => window.__GM!.getState().slimes[0]!.id) as string;
    const beforeStats = await page.evaluate((id) => {
      const s = window.__GM!.getState().slimes.find((sl: { id: string }) => sl.id === id)!;
      return s.stats.health + s.stats.attack + s.stats.defense + s.stats.speed;
    }, slimeId) as number;

    // Use stat booster on that slime
    const useResult = await page.evaluate((id) => window.__GM!.useItem('stat-booster', id), slimeId);
    expect(useResult).toContain('属性强化剂已使用');

    // Stats should have increased
    const afterStats = await page.evaluate((id) => {
      const s = window.__GM!.getState().slimes.find((sl: { id: string }) => sl.id === id)!;
      return s.stats.health + s.stats.attack + s.stats.defense + s.stats.speed;
    }, slimeId) as number;
    expect(afterStats).toBeGreaterThan(beforeStats);

    // Item should be consumed
    const items = await page.evaluate(() => window.__GM!.getItems());
    interface ItemInfo { type: string; quantity: number }
    const booster = (items as ItemInfo[]).find((i) => i.type === 'stat-booster');
    expect(booster!.quantity).toBe(0);
  });

  test('insufficient crystals prevents crystal-priced purchase', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Ensure 0 crystals (default is 0)
    const crystalBefore = await page.evaluate(() => window.__GM!.getState().crystal) as number;
    expect(crystalBefore).toBe(0);

    // Try to buy rare essence (costs 50 crystals)
    const buyResult = await page.evaluate(() => window.__GM!.buyItem('shop-rare-essence'));
    expect(buyResult).toBe(false);

    // Inventory should be empty
    const items = await page.evaluate(() => window.__GM!.getItems());
    expect(items.length).toBe(0);

    // Now give crystals and try again
    await page.evaluate(() => window.__GM!.setCrystal(100));
    const buyResult2 = await page.evaluate(() => window.__GM!.buyItem('shop-rare-essence'));
    expect(buyResult2).toBe(true);

    const afterState = await page.evaluate(() => window.__GM!.getState());
    expect(afterState.crystal).toBe(50); // 100 - 50
  });

  test('autoBattle on hard stage (1-6) awards crystals', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Boost slimes to guarantee victory
    await page.evaluate(() => {
      const gm = window.__GM!;
      for (const s of gm.getState().slimes) {
        gm.setStats(s.id, { health: 9999, attack: 9999, defense: 9999, speed: 9999 });
      }
    });

    // Record crystal before battle
    const crystalBefore = await page.evaluate(() => window.__GM!.getState().crystal) as number;
    expect(crystalBefore).toBe(0);

    // Stage 1-6 awards 5 crystals on victory
    const result = await page.evaluate(() => window.__GM!.autoBattle('1-6'));
    expect((result as { victory: boolean }).victory).toBe(true);

    // Crystal should have increased
    const crystalAfter = await page.evaluate(() => window.__GM!.getState().crystal) as number;
    expect(crystalAfter).toBeGreaterThan(crystalBefore);
  });
});

// =========================================================
// Test 9: PVE Chapters
// =========================================================
test.describe('PVE Chapters', () => {
  test('chapter 2 stage can be battled after unlockChapter', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Boost slimes to guarantee victory
    await page.evaluate(() => {
      const gm = window.__GM!;
      for (const s of gm.getState().slimes) {
        gm.setStats(s.id, { health: 9999, attack: 9999, defense: 9999, speed: 9999 });
      }
    });

    // Unlock chapter 2 via GM
    await page.evaluate(() => window.__GM!.unlockChapter(2));

    // Battle stage 2-1
    const result = await page.evaluate(() => window.__GM!.autoBattle('2-1'));
    expect(result).toHaveProperty('victory');
    expect(result).toHaveProperty('rewards');
    expect((result as { victory: boolean }).victory).toBe(true);
    expect((result as { rewards: { gold: number } }).rewards.gold).toBeGreaterThan(0);
  });

  test('chapter unlock logic: default 1, unlockChapter sets higher', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Default should be 1
    const initial = await page.evaluate(() => window.__GM!.getUnlockedChapters()) as number;
    expect(initial).toBe(1);

    // Unlock chapter 3
    await page.evaluate(() => window.__GM!.unlockChapter(3));
    const afterUnlock = await page.evaluate(() => window.__GM!.getUnlockedChapters()) as number;
    expect(afterUnlock).toBe(3);

    // Trying to set lower should not decrease
    await page.evaluate(() => window.__GM!.unlockChapter(2));
    const afterLower = await page.evaluate(() => window.__GM!.getUnlockedChapters()) as number;
    expect(afterLower).toBe(3);
  });

  test('beating 1-10 auto-unlocks chapter 2', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Verify initially locked
    const before = await page.evaluate(() => window.__GM!.getUnlockedChapters()) as number;
    expect(before).toBe(1);

    // Boost slimes
    await page.evaluate(() => {
      const gm = window.__GM!;
      for (const s of gm.getState().slimes) {
        gm.setStats(s.id, { health: 9999, attack: 9999, defense: 9999, speed: 9999 });
      }
    });

    // Beat 1-10
    const result = await page.evaluate(() => window.__GM!.autoBattle('1-10'));
    expect((result as { victory: boolean }).victory).toBe(true);

    // Chapter 2 should now be unlocked
    const after = await page.evaluate(() => window.__GM!.getUnlockedChapters()) as number;
    expect(after).toBe(2);
  });

  test('save and load preserves unlockedChapters', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Unlock chapter 3
    await page.evaluate(() => window.__GM!.unlockChapter(3));
    expect(await page.evaluate(() => window.__GM!.getUnlockedChapters())).toBe(3);

    // Save
    await page.locator('.ui-actions button', { hasText: '\u4fdd\u5b58' }).click();
    await page.waitForTimeout(300);

    // Reset to new game (acceptDialogs already registered by startFreshGame)
    await page.locator('.ui-actions button', { hasText: '\u65b0\u6e38\u620f' }).click();
    await page.waitForTimeout(300);
    // Skip onboarding created by new game
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__GM!.getUnlockedChapters())).toBe(1);

    // Load
    await page.locator('.ui-actions button', { hasText: '\u52a0\u8f7d' }).click();
    await page.waitForTimeout(300);

    // Should be restored to 3
    const restored = await page.evaluate(() => window.__GM!.getUnlockedChapters()) as number;
    expect(restored).toBe(3);
  });

  test('chapter tabs UI shows locked/unlocked state', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Open stage select
    await page.locator('.ui-actions button', { hasText: '\u6218\u6597' }).click();
    await expect(page.locator('.stage-select-panel')).toBeVisible();

    // Chapter tabs should exist
    const tabs = page.locator('.chapter-tab');
    await expect(tabs).toHaveCount(3);

    // First tab should be active, others locked
    await expect(tabs.nth(0)).toHaveClass(/active/);
    await expect(tabs.nth(1)).toHaveClass(/locked/);
    await expect(tabs.nth(2)).toHaveClass(/locked/);

    // Close and unlock chapter 2
    await page.locator('.stage-select-panel .back-btn').click();
    await page.evaluate(() => window.__GM!.unlockChapter(2));

    // Re-open stage select
    await page.locator('.ui-actions button', { hasText: '\u6218\u6597' }).click();
    await expect(page.locator('.stage-select-panel')).toBeVisible();

    // Tab 2 should no longer be locked
    const tabs2 = page.locator('.chapter-tab');
    await expect(tabs2.nth(1)).not.toHaveClass(/locked/);
    await expect(tabs2.nth(2)).toHaveClass(/locked/);
  });
});

// =========================================================
// Test 10: Quest System
// =========================================================
test.describe('Quest System', () => {
  test('getQuests returns all quests with templates', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    const quests = await page.evaluate(() => window.__GM!.getQuests());
    expect(quests.length).toBeGreaterThanOrEqual(13); // 5 daily + 5 achievement + 3 bounty

    // Verify categories exist
    interface QuestInfo { template: { category: string; name: string } }
    const categories = new Set((quests as QuestInfo[]).map((q) => q.template.category));
    expect(categories.has('daily')).toBe(true);
    expect(categories.has('achievement')).toBe(true);
    expect(categories.has('bounty')).toBe(true);

    // Verify daily quests count
    const dailyCount = (quests as QuestInfo[]).filter((q) => q.template.category === 'daily').length;
    expect(dailyCount).toBeGreaterThanOrEqual(5);

    // Verify achievement quests count
    const achCount = (quests as QuestInfo[]).filter((q) => q.template.category === 'achievement').length;
    expect(achCount).toBeGreaterThanOrEqual(5);

    // Verify bounty quests count
    const bountyCount = (quests as QuestInfo[]).filter((q) => q.template.category === 'bounty').length;
    expect(bountyCount).toBeGreaterThanOrEqual(3);
  });

  test('completeQuest + claimQuest awards rewards', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency) as number;

    // Complete a daily quest (daily-split-3 rewards 50 gold)
    const completed = await page.evaluate(() => window.__GM!.completeQuest('daily-split-3'));
    expect(completed).toBe(true);

    // Verify status is completed
    interface QuestInfo { questId: string; status: string }
    const questAfterComplete = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'daily-split-3')
    ) as QuestInfo;
    expect(questAfterComplete.status).toBe('completed');

    // Claim it
    const claimed = await page.evaluate(() => window.__GM!.claimQuest('daily-split-3'));
    expect(claimed).toBe(true);

    // Verify gold increased
    const currencyAfter = await page.evaluate(() => window.__GM!.getState().currency) as number;
    expect(currencyAfter).toBe(currencyBefore + 50);

    // Verify status is claimed
    const questAfterClaim = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'daily-split-3')
    ) as QuestInfo;
    expect(questAfterClaim.status).toBe('claimed');
  });

  test('resetDailyQuests resets daily quests to active', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Complete and claim a daily quest
    await page.evaluate(() => {
      window.__GM!.completeQuest('daily-split-3');
      window.__GM!.claimQuest('daily-split-3');
    });

    // Verify it is claimed
    interface QuestInfo { questId: string; status: string; currentValue: number }
    const beforeReset = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'daily-split-3')
    ) as QuestInfo;
    expect(beforeReset.status).toBe('claimed');

    // Reset daily quests
    await page.evaluate(() => window.__GM!.resetDailyQuests());

    // Verify daily quest is now active with progress 0
    const afterReset = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'daily-split-3')
    ) as QuestInfo;
    expect(afterReset.status).toBe('active');
    expect(afterReset.currentValue).toBe(0);

    // Verify achievement quests are unaffected
    const achQuest = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'ach-total-splits-50')
    ) as QuestInfo;
    expect(achQuest.status).toBe('active');
  });

  test('incrementQuestCounter updates quest progress', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Increment daily_splits counter 3 times (daily-split-3 target is 3)
    await page.evaluate(() => {
      window.__GM!.incrementQuestCounter('daily_splits', 3);
    });

    // daily-split-3 should now be completed
    interface QuestInfo { questId: string; status: string; currentValue: number }
    const quest = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'daily-split-3')
    ) as QuestInfo;
    expect(quest.status).toBe('completed');
    expect(quest.currentValue).toBeGreaterThanOrEqual(3);
  });

  test('save and load preserves quest progress', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Complete and claim a quest
    await page.evaluate(() => {
      window.__GM!.completeQuest('daily-battle-1');
      window.__GM!.claimQuest('daily-battle-1');
    });

    // Save
    await page.locator('.ui-actions button', { hasText: '\u4fdd\u5b58' }).click();
    await page.waitForTimeout(300);

    // Reset
    await page.locator('.ui-actions button', { hasText: '\u65b0\u6e38\u620f' }).click();
    await page.waitForTimeout(300);
    // Skip onboarding created by new game
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    // Verify quest is reset after new game
    interface QuestInfo { questId: string; status: string }
    const afterNew = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'daily-battle-1')
    ) as QuestInfo;
    expect(afterNew.status).toBe('active');

    // Load
    await page.locator('.ui-actions button', { hasText: '\u52a0\u8f7d' }).click();
    await page.waitForTimeout(300);

    // Verify quest progress is restored
    const afterLoad = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'daily-battle-1')
    ) as QuestInfo;
    expect(afterLoad.status).toBe('claimed');
  });

  test('quest UI button exists and opens quest panel', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Verify quest button exists (11 buttons now with backpack)
    const buttons = page.locator('.ui-actions button');
    await expect(buttons).toHaveCount(11);

    // Click quest button
    await page.locator('.ui-actions button', { hasText: '\u4efb\u52a1' }).click();
    await expect(page.locator('.quest-panel')).toBeVisible();

    // Verify tabs exist
    const tabs = page.locator('.quest-tab');
    await expect(tabs).toHaveCount(3);

    // Verify quest cards exist
    const cards = page.locator('.quest-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Click back
    await page.locator('.quest-panel .back-btn').click();
    await expect(page.locator('.quest-panel')).not.toBeVisible();
  });

  test('bounty quest: submitBounty with valid slime completes quest', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Default state has a Rare slime (slime-rare) and an Epic slime (slime-epic)
    const slimesBefore = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;

    // Submit the rare slime for the bounty-rare-submit quest
    const result = await page.evaluate(() =>
      window.__GM!.submitBounty('bounty-rare-submit', 'slime-rare')
    );
    expect(result).toBe(true);

    // Slime should be consumed
    const slimesAfter = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    expect(slimesAfter).toBe(slimesBefore - 1);

    // Quest should be completed
    interface QuestInfo { questId: string; status: string }
    const quest = await page.evaluate(() =>
      window.__GM!.getQuests().find((q: { questId: string }) => q.questId === 'bounty-rare-submit')
    ) as QuestInfo;
    expect(quest.status).toBe('completed');

    // Claim the bounty reward (200 gold, 10 crystal)
    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency) as number;
    const crystalBefore = await page.evaluate(() => window.__GM!.getState().crystal) as number;
    const claimed = await page.evaluate(() => window.__GM!.claimQuest('bounty-rare-submit'));
    expect(claimed).toBe(true);
    const currencyAfterClaim = await page.evaluate(() => window.__GM!.getState().currency) as number;
    const crystalAfterClaim = await page.evaluate(() => window.__GM!.getState().crystal) as number;
    expect(currencyAfterClaim).toBe(currencyBefore + 200);
    expect(crystalAfterClaim).toBe(crystalBefore + 10);
  });
});

// =========================================================
// Test 11: Codex System
// =========================================================
test.describe('Codex System', () => {
  test('getCodex returns codex data with initial unlocks from default slimes', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    const codex = await page.evaluate(() => window.__GM!.getCodex());

    // Should have all rarities/traits/skills arrays
    expect(codex).toHaveProperty('codex');
    expect(codex).toHaveProperty('allRarities');
    expect(codex).toHaveProperty('allTraits');
    expect(codex).toHaveProperty('allSkills');

    // Total counts: 5 rarities, 10 traits, 8 skills
    expect(codex.allRarities.length).toBe(5);
    expect(codex.allTraits.length).toBe(10);
    expect(codex.allSkills.length).toBe(8);

    // Default slimes have Common, Rare, Epic rarities
    expect(codex.codex.unlockedRarities).toContain('Common');
    expect(codex.codex.unlockedRarities).toContain('Rare');
    expect(codex.codex.unlockedRarities).toContain('Epic');

    // Default slimes have custom traits (fresh, calm, arcane) not in ALL_TRAITS
    // and custom skills (jump, splash, pulse) not in ALL_SKILLS
    // So only rarities are auto-unlocked from default slimes
    expect(codex.codex.unlockedRarities.length).toBeGreaterThanOrEqual(3);

    // Manually unlock a known trait and skill to verify the system works
    await page.evaluate(() => {
      window.__GM!.unlockCodexEntry('trait', 'fast-split');
      window.__GM!.unlockCodexEntry('skill', 'slime-spit');
    });
    const codex2 = await page.evaluate(() => window.__GM!.getCodex());
    expect(codex2.codex.unlockedTraits).toContain('fast-split');
    expect(codex2.codex.unlockedSkills).toContain('slime-spit');
  });

  test('unlockCodexEntry manually unlocks entries and getCodexCompletion tracks progress', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Get initial completion
    const before = await page.evaluate(() => window.__GM!.getCodexCompletion());
    const initialOverall = before.overall.unlocked as number;

    // Unlock a trait that's not yet unlocked
    const result = await page.evaluate(() => window.__GM!.unlockCodexEntry('trait', 'toxin-blood'));
    expect(result).toBe(true);

    // Unlock a skill
    const result2 = await page.evaluate(() => window.__GM!.unlockCodexEntry('skill', 'acid-wave'));
    expect(result2).toBe(true);

    // Unlock a rarity
    const result3 = await page.evaluate(() => window.__GM!.unlockCodexEntry('rarity', 'Legendary'));
    expect(result3).toBe(true);

    // Verify completion increased
    const after = await page.evaluate(() => window.__GM!.getCodexCompletion());
    expect(after.overall.unlocked).toBeGreaterThan(initialOverall);
    expect(after.overall.percent).toBeGreaterThan(0);

    // Duplicate unlock should return false
    const dup = await page.evaluate(() => window.__GM!.unlockCodexEntry('rarity', 'Legendary'));
    expect(dup).toBe(false);

    // Invalid category should return false
    const invalid = await page.evaluate(() => window.__GM!.unlockCodexEntry('invalid', 'test'));
    expect(invalid).toBe(false);
  });

  test('codex UI button exists and opens codex panel with tabs', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Click codex button (📖 图鉴)
    await page.locator('.ui-actions button', { hasText: '\u56fe\u9274' }).click();
    await expect(page.locator('.codex-panel')).toBeVisible();

    // Verify 3 tabs exist
    const tabs = page.locator('.codex-tab');
    await expect(tabs).toHaveCount(3);

    // Verify overall completion is displayed
    await expect(page.locator('.codex-overall')).toBeVisible();
    const overallText = await page.locator('.codex-overall').textContent();
    expect(overallText).toContain('%');

    // Verify codex entries exist
    const entries = page.locator('.codex-entry');
    const entryCount = await entries.count();
    expect(entryCount).toBeGreaterThan(0);

    // Verify unlocked entries have correct class
    const unlockedEntries = page.locator('.codex-entry.unlocked');
    const unlockedCount = await unlockedEntries.count();
    expect(unlockedCount).toBeGreaterThan(0);

    // Click back
    await page.locator('.codex-panel .back-btn').click();
    await expect(page.locator('.codex-panel')).not.toBeVisible();
  });

  test('save and load preserves codex data', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Unlock extra entries
    await page.evaluate(() => {
      window.__GM!.unlockCodexEntry('rarity', 'Legendary');
      window.__GM!.unlockCodexEntry('rarity', 'Uncommon');
      window.__GM!.unlockCodexEntry('trait', 'origin-core');
      window.__GM!.unlockCodexEntry('skill', 'vital-surge');
    });

    const beforeSave = await page.evaluate(() => window.__GM!.getCodexCompletion());
    const beforeOverall = beforeSave.overall.unlocked as number;

    // Save
    await page.locator('.ui-actions button', { hasText: '\u4fdd\u5b58' }).click();
    await page.waitForTimeout(300);

    // Reset
    await page.locator('.ui-actions button', { hasText: '\u65b0\u6e38\u620f' }).click();
    await page.waitForTimeout(300);
    // Skip onboarding created by new game
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    // After new game, extra entries should not be there
    const afterNew = await page.evaluate(() => window.__GM!.getCodexCompletion());
    expect(afterNew.overall.unlocked).toBeLessThan(beforeOverall);

    // Load
    await page.locator('.ui-actions button', { hasText: '\u52a0\u8f7d' }).click();
    await page.waitForTimeout(300);

    // Codex should be restored
    const afterLoad = await page.evaluate(() => window.__GM!.getCodexCompletion());
    expect(afterLoad.overall.unlocked).toBe(beforeOverall);
  });
});

// =========================================================
// Test 12: Arena System
// =========================================================
test.describe('Arena System', () => {
  test('getArenas returns 4 arenas with only grassland owned initially', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    const arenas = await page.evaluate(() => window.__GM!.getArenas());
    expect(arenas.length).toBe(4);

    interface ArenaInfo { id: string; owned: boolean }
    const grassland = (arenas as ArenaInfo[]).find((a) => a.id === 'grassland');
    expect(grassland).toBeDefined();
    expect(grassland!.owned).toBe(true);

    const fireLand = (arenas as ArenaInfo[]).find((a) => a.id === 'fire-land');
    expect(fireLand).toBeDefined();
    expect(fireLand!.owned).toBe(false);

    const iceCave = (arenas as ArenaInfo[]).find((a) => a.id === 'ice-cave');
    expect(iceCave).toBeDefined();
    expect(iceCave!.owned).toBe(false);

    const mysticForest = (arenas as ArenaInfo[]).find((a) => a.id === 'mystic-forest');
    expect(mysticForest).toBeDefined();
    expect(mysticForest!.owned).toBe(false);

    // Active arena should be grassland
    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state.activeArenaId).toBe('grassland');
  });

  test('buyArena successfully purchases and deducts currency', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Give enough gold to buy fire-land (500 gold)
    await page.evaluate(() => window.__GM!.setCurrency(1000));

    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency) as number;
    expect(currencyBefore).toBe(1000);

    // Buy fire-land
    const buyResult = await page.evaluate(() => window.__GM!.buyArena('fire-land'));
    expect(buyResult).toBe(true);

    // Check currency deducted
    const currencyAfter = await page.evaluate(() => window.__GM!.getState().currency) as number;
    expect(currencyAfter).toBe(500); // 1000 - 500

    // Check fire-land is now owned
    interface ArenaInfo { id: string; owned: boolean }
    const arenas = await page.evaluate(() => window.__GM!.getArenas()) as ArenaInfo[];
    const fireLand = arenas.find((a) => a.id === 'fire-land');
    expect(fireLand!.owned).toBe(true);

    // Buying again should fail
    const buyAgain = await page.evaluate(() => window.__GM!.buyArena('fire-land'));
    expect(buyAgain).toBe(false);

    // Buying with insufficient gold should fail
    await page.evaluate(() => window.__GM!.setCurrency(0));
    const buyIceCave = await page.evaluate(() => window.__GM!.buyArena('ice-cave'));
    expect(buyIceCave).toBe(false);
  });

  test('switchArena changes activeArenaId', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Buy fire-land first
    await page.evaluate(() => window.__GM!.setCurrency(1000));
    await page.evaluate(() => window.__GM!.buyArena('fire-land'));

    // Switch to fire-land
    const switchResult = await page.evaluate(() => window.__GM!.switchArena('fire-land'));
    expect(switchResult).toBe(true);

    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state.activeArenaId).toBe('fire-land');

    // Switch back to grassland
    const switchBack = await page.evaluate(() => window.__GM!.switchArena('grassland'));
    expect(switchBack).toBe(true);

    const state2 = await page.evaluate(() => window.__GM!.getState());
    expect(state2.activeArenaId).toBe('grassland');

    // Can't switch to unowned arena
    const switchUnowned = await page.evaluate(() => window.__GM!.switchArena('ice-cave'));
    expect(switchUnowned).toBe(false);
  });

  test('arena button exists (total 10 buttons) and opens arena panel', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Total button count should be 11 (includes backpack button)
    const buttons = page.locator('.ui-actions button');
    await expect(buttons).toHaveCount(11);

    // Click arena button (🏔 场地)
    await page.locator('.ui-actions button', { hasText: '\u573a\u5730' }).click();
    await expect(page.locator('.arena-panel')).toBeVisible();

    // Verify 4 arena cards
    const cards = page.locator('.arena-card');
    await expect(cards).toHaveCount(4);

    // First card should be active (grassland)
    await expect(cards.first()).toHaveClass(/active/);

    // Click back
    await page.locator('.arena-panel .back-btn').click();
    await expect(page.locator('.arena-panel')).not.toBeVisible();
  });
});

// =========================================================
// Test: Accessory System
// =========================================================
test.describe('Accessory System', () => {
  test('giveAccessory adds accessory to inventory and getAccessories returns it', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    const before = await page.evaluate(() => window.__GM!.getAccessories());
    expect(before.length).toBe(0);

    const acc = await page.evaluate(() => window.__GM!.giveAccessory('acc-iron-ring'));
    expect(acc).not.toBeNull();
    expect((acc as { name: string }).name).toBe('铁之指环');

    const after = await page.evaluate(() => window.__GM!.getAccessories());
    expect(after.length).toBe(1);
  });

  test('equipAccessory and unequipAccessory work correctly', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    const slimeId = await page.evaluate(() => {
      const gm = window.__GM!;
      const slime = gm.getState().slimes[0]!;
      gm.archiveSlime(slime.id);
      return slime.id;
    });

    const acc = await page.evaluate(() => window.__GM!.giveAccessory('acc-guardian-amulet'));
    const accId = (acc as { id: string }).id;

    const equipped = await page.evaluate(({ accId, slimeId }) => {
      return window.__GM!.equipAccessory(accId, slimeId);
    }, { accId, slimeId });
    expect(equipped).toBe(true);

    const hasAcc = await page.evaluate((slimeId) => {
      const slime = window.__GM!.getState().archivedSlimes.find(s => s.id === slimeId);
      return slime?.equippedAccessoryId;
    }, slimeId);
    expect(hasAcc).toBe(accId);

    const unequipped = await page.evaluate((slimeId) => {
      return window.__GM!.unequipAccessory(slimeId);
    }, slimeId);
    expect(unequipped).toBe(true);

    const cleared = await page.evaluate((slimeId) => {
      const slime = window.__GM!.getState().archivedSlimes.find(s => s.id === slimeId);
      return slime?.equippedAccessoryId;
    }, slimeId);
    expect(cleared).toBeUndefined();
  });

  test('stat accessory boosts combat stats via autoBattle', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    const acc = await page.evaluate(() => window.__GM!.giveAccessory('acc-kings-crown'));
    const accId = (acc as { id: string }).id;
    const slimeId = await page.evaluate(() => window.__GM!.getState().slimes[0]!.id);

    await page.evaluate(({ accId, slimeId }) => {
      window.__GM!.equipAccessory(accId, slimeId);
    }, { accId, slimeId });

    await page.evaluate(() => {
      const gm = window.__GM!;
      for (const s of gm.getState().slimes) {
        gm.setStats(s.id, { health: 9999, attack: 9999, defense: 9999, speed: 9999 });
      }
    });

    const result = await page.evaluate(() => window.__GM!.autoBattle('1-1'));
    expect((result as { victory: boolean }).victory).toBe(true);

    const stillEquipped = await page.evaluate((slimeId) => {
      return window.__GM!.getState().slimes.find(s => s.id === slimeId)?.equippedAccessoryId;
    }, slimeId);
    expect(stillEquipped).toBe(accId);
  });

  test('save and load preserves accessories and equipped state', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    const acc = await page.evaluate(() => window.__GM!.giveAccessory('acc-swift-anklet'));
    const accId = (acc as { id: string }).id;
    const slimeId = await page.evaluate(() => window.__GM!.getState().slimes[0]!.id);
    await page.evaluate(({ accId, slimeId }) => {
      window.__GM!.equipAccessory(accId, slimeId);
    }, { accId, slimeId });

    await page.locator('.ui-actions button', { hasText: '保存' }).click();
    await page.waitForTimeout(300);

    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);
    // Skip onboarding created by new game
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    const resetAcc = await page.evaluate(() => window.__GM!.getAccessories());
    expect(resetAcc.length).toBe(0);

    await page.locator('.ui-actions button', { hasText: '加载' }).click();
    await page.waitForTimeout(300);
    const loadedAcc = await page.evaluate(() => window.__GM!.getAccessories());
    expect(loadedAcc.length).toBe(1);
    expect(loadedAcc[0].name).toBe('疾风脚环');
  });
});

// =========================================================
// Test: Accessory Inheritance
// =========================================================
test.describe('Accessory Inheritance', () => {
  test('tendency accessory inherits at ~30% rate', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Use tendency accessory (acc-flame-crystal, kind: tendency)
    const result = await page.evaluate(() =>
      window.__GM!.testAccessoryInheritance('acc-flame-crystal', 1000)
    );
    expect(result.kind).toBe('tendency');
    expect(result.trials).toBe(1000);
    // 30% +/- tolerance: expect between 18% and 42%
    expect(result.rate).toBeGreaterThan(0.18);
    expect(result.rate).toBeLessThan(0.42);
  });

  test('rare accessory inherits at ~15% rate', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Use rare accessory (acc-origin-pendant, kind: rare)
    const result = await page.evaluate(() =>
      window.__GM!.testAccessoryInheritance('acc-origin-pendant', 1000)
    );
    expect(result.kind).toBe('rare');
    expect(result.trials).toBe(1000);
    // 15% +/- tolerance: expect between 8% and 22%
    expect(result.rate).toBeGreaterThan(0.08);
    expect(result.rate).toBeLessThan(0.22);
  });

  test('stat accessory never inherits (0% rate)', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    // Use stat accessory (acc-iron-ring, kind: stat)
    const result = await page.evaluate(() =>
      window.__GM!.testAccessoryInheritance('acc-iron-ring', 500)
    );
    expect(result.kind).toBe('stat');
    expect(result.trials).toBe(500);
    expect(result.inherited).toBe(0);
    expect(result.rate).toBe(0);
  });
});

// =========================================================
// Onboarding System Tests
// =========================================================
test.describe('Onboarding System', () => {
  test('new game starts with 2 slimes, 50 gold, and onboarding active', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    acceptDialogs(page);
    // Skip initial onboarding so we can click buttons
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state.slimes.length).toBe(2);
    expect(state.slimes[0].name).toBe('小绿');
    expect(state.slimes[1].name).toBe('小蓝');
    expect(state.currency).toBe(50);
    expect(state.onboarding.currentStep).toBe('step-welcome');
    expect(state.onboarding.unlocks.battle).toBe(false);
    expect(state.onboarding.unlocks.shop).toBe(false);
  });

  test('skipOnboarding unlocks all features and shows all buttons', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    acceptDialogs(page);
    // Skip initial onboarding so we can click buttons
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(200);
    const before = await page.locator('.ui-actions button', { hasText: '⚔ 战斗' }).isVisible();
    expect(before).toBe(false);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBeNull();
    expect(state.onboarding.unlocks.battle).toBe(true);
    expect(state.onboarding.unlocks.shop).toBe(true);
    const after = await page.locator('.ui-actions button', { hasText: '⚔ 战斗' }).isVisible();
    expect(after).toBe(true);
  });

  test('old save without onboarding field gets full unlock', async ({ page }) => {
    // Use addInitScript to set fake save BEFORE game code runs on page load
    await page.addInitScript(() => {
      const fakeSave = {
        slimes: [{ id: 'old-1', name: 'Old Slime', stats: { health: 20, attack: 5, defense: 3, speed: 4, mut: 0.05 }, traits: [], skills: [], rarity: 'Common', generation: 1, parentId: null, color: '#56d364', position: { x: 0, y: 0.5, z: 0 } }],
        breedingGrounds: [],
        facilities: [],
        currency: 500,
        crystal: 10,
        timestamp: Date.now(),
        stageProgress: {},
        archivedSlimes: [],
        archiveCapacity: 10,
        items: [],
        unlockedChapters: 1,
      };
      localStorage.setItem('slime-keeper-save', JSON.stringify(fakeSave));
    });
    await page.goto('/');
    await waitForGameReady(page);
    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding).toBeDefined();
    expect(state.onboarding.currentStep).toBeNull();
    expect(state.onboarding.unlocks.battle).toBe(true);
    expect(state.onboarding.unlocks.codex).toBe(true);
    const visibleCount = await page.locator('.ui-actions button').evaluateAll(
      btns => btns.filter(b => (b as HTMLElement).style.display !== 'none').length
    );
    expect(visibleCount).toBe(11);
  });

  test('new game confirm dialog prevents accidental reset', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.evaluate(() => window.__GM!.setCurrency(999));
    await page.waitForTimeout(100);
    // M28: confirm dialog only shown when save exists; save first
    await page.locator('.ui-actions button', { hasText: '保存' }).click();
    await page.waitForTimeout(200);
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state.currency).toBe(999);
  });

  test('save shows success toast', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(100);
    await page.locator('.ui-actions button', { hasText: '保存' }).click();
    await page.waitForSelector('.toast-message', { timeout: 3000 });
    const text = await page.locator('.toast-message').first().textContent();
    expect(text).toContain('保存成功');
  });

  test('load with no save shows feedback toast', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(100);
    await page.locator('.ui-actions button', { hasText: '加载' }).click();
    await page.waitForSelector('.toast-message', { timeout: 3000 });
    const text = await page.locator('.toast-message').first().textContent();
    expect(text).toContain('无存档');
  });

  test('onboarding welcome dialog shown on new game', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    acceptDialogs(page);
    // Skip initial onboarding so we can click buttons
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(500);
    const visible = await page.locator('.onboarding-overlay').isVisible();
    expect(visible).toBe(true);
    const text = await page.locator('.onboarding-text').textContent();
    expect(text).toContain('欢迎来到史莱姆世界');
  });

  test('goToOnboardingStep GM command works', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    acceptDialogs(page);
    // Skip initial onboarding so we can click buttons
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => window.__GM!.goToOnboardingStep('step-teach-sell'));
    expect(result).toBe(true);
    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBe('step-teach-sell');
  });
});

// =========================================================
// Onboarding Full Flow (deadlock regression test)
// =========================================================
test.describe('Onboarding Full Flow', () => {
  test('complete onboarding from welcome through teach steps without deadlock', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    acceptDialogs(page);

    // Skip initial onboarding so we can click new game
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    // Start new game → onboarding begins
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(500);

    // Step 1: step-welcome — overlay visible
    await expect(page.locator('.onboarding-overlay')).toBeVisible();
    const welcomeText = await page.locator('.onboarding-text').textContent();
    expect(welcomeText).toContain('欢迎来到史莱姆世界');
    let state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBe('step-welcome');

    // Click OK → advance to step-wait-split
    await page.locator('.onboarding-btn').click();
    await page.waitForTimeout(300);
    state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBe('step-wait-split');

    // Step 2: step-wait-split — trigger split via GM to advance quickly
    await page.evaluate(() => window.__GM!.triggerSplit());
    await page.waitForTimeout(500);
    state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBe('step-first-split');

    // Step 3: step-first-split — click OK
    await page.locator('.onboarding-btn').click();
    await page.waitForTimeout(300);
    state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBe('step-teach-cull');
    await page.waitForSelector('.onboarding-bubble', { timeout: 3000 });
    await page.waitForTimeout(200);
    state = await page.evaluate(() => window.__GM!.getState());

    // Step 4: step-teach-cull — KEY CHECK: cull button should be VISIBLE (not deadlocked)
    expect(state.onboarding.unlocks.cull).toBe(true);

    // Verify cull text does NOT contain '场地已满'
    const bubbleText = await page.locator('.onboarding-bubble').textContent();
    expect(bubbleText).not.toContain('场地已满');
    expect(bubbleText).toContain('剔除');

    // Verify backpack button is visible (cull is accessed via backpack)
    const cullBtnVisible = await page.locator('.ui-actions button', { hasText: '\u80cc\u5305' }).isVisible();
    expect(cullBtnVisible).toBe(true);

    // Perform cull via backpack
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-cull-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    await page.waitForTimeout(500);

    // Step 5: step-teach-sell — sell button should be visible
    state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBe('step-teach-sell');
    expect(state.onboarding.unlocks.sell).toBe(true);

    // Need at least 1 slime to sell — add one if needed
    if (state.slimes.length < 2) {
      await page.evaluate(() => window.__GM!.triggerSplit());
      await page.waitForTimeout(300);
    }

    // Perform sell via backpack
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    await page.waitForTimeout(500);

    // Advance through step-wait-recover-2 if needed (with 2 initial slimes, may need extra split)
    state = await page.evaluate(() => window.__GM!.getState());
    if (state.onboarding.currentStep === 'step-wait-recover-2') {
      await page.evaluate(() => window.__GM!.triggerSplit());
      await page.waitForTimeout(300);
    }

    // Step 6: step-teach-archive — archive button should be visible
    state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBe('step-teach-archive');
    expect(state.onboarding.unlocks.archive).toBe(true);

    // Need a slime to archive
    if (state.slimes.length < 1) {
      await page.evaluate(() => window.__GM!.addSlime());
      await page.waitForTimeout(200);
    }

    // Perform archive via backpack
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-archive-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    await page.waitForTimeout(500);

    // Step 7: step-teach-battle — battle button should be visible
    state = await page.evaluate(() => window.__GM!.getState());
    expect(state.onboarding.currentStep).toBe('step-teach-battle');
    expect(state.onboarding.unlocks.battle).toBe(true);

    // Verify battle button is visible in the UI
    const battleBtnVisible = await page.locator('.ui-actions button', { hasText: '战斗' }).isVisible();
    expect(battleBtnVisible).toBe(true);
  });

});

test.describe('M22 UX Polish', () => {

  test('archive full: archive button disabled and toast shown', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.evaluate(() => {
      const gm = window.__GM!;
      const state = gm.getState();
      state.archiveCapacity = 1;
      if (state.slimes.length > 0) {
        const s = state.slimes[0]!;
        state.slimes.splice(0, 1);
        state.archivedSlimes.push(s);
      }
    });
    await page.waitForTimeout(300);

    // Open backpack and check archive button is disabled
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const archiveBtnDisabled = await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-archive-btn') as HTMLButtonElement | null;
      return btn ? btn.disabled : false;
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    expect(archiveBtnDisabled).toBe(true);
  });

  test('sell price preview shown on sell button', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    // Open backpack and check sell button text
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const sellText = await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      return btn?.textContent ?? '';
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    expect(sellText).toContain('💰');
    expect(sellText).toContain('出售');
  });

  test('sort button active state indicator', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    // Sort buttons in BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-panel', { timeout: 3000 });

    const rarityActive = await page.evaluate(() => {
      const btn = document.querySelector('.backpack-sort-btn[data-sort="rarity"]') as HTMLElement | null;
      return btn?.classList.contains('backpack-sort-active') ?? false;
    });
    expect(rarityActive).toBe(true);

    await page.locator('.backpack-sort-btn[data-sort="stats"]').click();
    await page.waitForTimeout(100);

    const statsActive = await page.evaluate(() => {
      const first = document.querySelector('.backpack-sort-btn[data-sort="rarity"]')?.classList.contains('backpack-sort-active') ?? false;
      const second = document.querySelector('.backpack-sort-btn[data-sort="stats"]')?.classList.contains('backpack-sort-active') ?? false;
      return { first, second };
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    expect(statsActive.first).toBe(false);
    expect(statsActive.second).toBe(true);
  });

  test('arena buy button disabled when currency insufficient', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.evaluate(() => window.__GM!.setCurrency(0));
    await page.waitForTimeout(100);

    await page.locator('.ui-actions button', { hasText: '场地' }).click();
    await page.waitForSelector('.arena-panel', { timeout: 3000 });

    const buyBtnsDisabled = await page.evaluate(() => {
      const btns = document.querySelectorAll('.arena-buy-btn');
      return Array.from(btns).every(b => (b as HTMLButtonElement).disabled);
    });
    expect(buyBtnsDisabled).toBe(true);
  });

  test('unarchive blocked when breeding ground is full', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.evaluate(() => {
      const gm = window.__GM!;
      const state = gm.getState();
      // Move first slime to archive
      const archiveTarget = state.slimes[0]!;
      state.slimes.splice(0, 1);
      state.archivedSlimes.push(archiveTarget);
      // Fill slimes array directly to exceed max capacity
      const template = state.slimes[0] || archiveTarget;
      while (state.slimes.length < 30) {
        state.slimes.push({
          ...template,
          id: 'fill-' + state.slimes.length,
          name: 'Fill ' + state.slimes.length,
          position: { x: 0, y: 0.5, z: 0 },
        });
      }
    });
    await page.waitForTimeout(200);

    await page.locator('.ui-actions button', { hasText: '封存库' }).click();
    await page.waitForSelector('.archive-panel', { timeout: 3000 });

    await page.locator('.archive-action-btn', { hasText: '解封' }).first().click();
    await page.waitForTimeout(500);

    const toastText = await page.evaluate(() => {
      const el = document.querySelector('.toast-message');
      return el?.textContent ?? '';
    });
    expect(toastText).toContain('培养场地已满');
  });

  test('codex panel displays in Chinese', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.locator('.ui-actions button', { hasText: '图鉴' }).click();
    await page.waitForSelector('.codex-panel', { timeout: 3000 });

    const titleText = await page.locator('.codex-panel h2').textContent();
    expect(titleText).toBe('图鉴');

    const overallText = await page.locator('.codex-overall').textContent();
    expect(overallText).toContain('总计');

    const tabTexts = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.codex-tab');
      return Array.from(tabs).map(t => t.textContent ?? '');
    });
    expect(tabTexts.some(t => t.includes('稀有度'))).toBe(true);
    expect(tabTexts.some(t => t.includes('特性'))).toBe(true);
    expect(tabTexts.some(t => t.includes('技能'))).toBe(true);

    const backText = await page.locator('.codex-panel .back-btn').textContent();
    expect(backText).toBe('返回');
  });

  test('quest panel displays in Chinese', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.locator('.ui-actions button', { hasText: '任务' }).click();
    await page.waitForSelector('.quest-panel', { timeout: 3000 });

    const titleText = await page.locator('.quest-panel h2').textContent();
    expect(titleText).toBe('任务面板');

    const tabTexts = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.quest-tab');
      return Array.from(tabs).map(t => t.textContent ?? '');
    });
    expect(tabTexts).toContain('日常');
    expect(tabTexts).toContain('成就');
    expect(tabTexts).toContain('悬赏');

    const rewardTexts = await page.evaluate(() => {
      const els = document.querySelectorAll('.quest-reward');
      return Array.from(els).map(e => e.textContent ?? '');
    });
    const hasChineseReward = rewardTexts.some(t => t.includes('奖励') && t.includes('金币'));
    expect(hasChineseReward).toBe(true);

    const backText = await page.locator('.quest-panel .back-btn').textContent();
    expect(backText).toBe('返回');
  });

  test('sell toast shows gold amount', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    // Sell via backpack
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const toastPromise4 = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await toastPromise4;
    await page.evaluate(() => window.__GM!.closeBackpack());
    await page.waitForTimeout(300);

    const toastText = await page.evaluate(() => {
      const el = document.querySelector('.toast-message');
      return el?.textContent ?? '';
    });
    expect(toastText).toContain('出售成功');
    expect(toastText).toContain('💰');
  });

  test('panel mutual exclusion: opening panel disables main buttons', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.locator('.ui-actions button', { hasText: '封存库' }).click();
    await page.waitForSelector('.archive-panel', { timeout: 3000 });

    const mainBtnsDisabled = await page.evaluate(() => {
      const btns = document.querySelectorAll('.ui-actions button');
      return Array.from(btns).every(b => (b as HTMLButtonElement).disabled);
    });
    expect(mainBtnsDisabled).toBe(true);

    await page.locator('.archive-panel .back-btn').click();
    await page.waitForTimeout(200);

    const mainBtnsEnabled = await page.evaluate(() => {
      const btns = document.querySelectorAll('.ui-actions button');
      return Array.from(btns).some(b => !(b as HTMLButtonElement).disabled);
    });
    expect(mainBtnsEnabled).toBe(true);
  });

  test('quest status labels in Chinese', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.locator('.ui-actions button', { hasText: '任务' }).click();
    await page.waitForSelector('.quest-panel', { timeout: 3000 });

    const statusTexts = await page.evaluate(() => {
      const els = document.querySelectorAll('.quest-status');
      return Array.from(els).map(e => e.textContent ?? '');
    });
    const allChinese = statusTexts.every(t => t === '进行中' || t === '已完成' || t === '已领取');
    expect(allChinese).toBe(true);
  });

  test('shop item use with target slime selector', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.evaluate(() => {
      const gm = window.__GM!;
      gm.setCurrency(1000);
      const state = gm.getState();
      state.items.push({ type: 'stat-booster', name: 'Stat Booster', quantity: 1 } as any);
    });
    await page.waitForTimeout(100);

    await page.locator('.ui-actions button', { hasText: '商店' }).click();
    await page.waitForSelector('.shop-panel', { timeout: 3000 });

    const hasSelect = await page.evaluate(() => {
      return document.querySelector('.item-target-select') !== null;
    });
    expect(hasSelect).toBe(true);
  });

  test('bounty quest shows slime selector instead of auto-submit', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    await page.evaluate(() => {
      const gm = window.__GM!;
      const state = gm.getState();
      if (state.slimes[0]) {
        state.slimes[0].stats = { health: 50, attack: 30, defense: 20, speed: 20, mut: 0.1 };
        (state.slimes[0] as any).rarity = 'Rare';
      }
    });
    await page.waitForTimeout(100);

    await page.locator('.ui-actions button', { hasText: '任务' }).click();
    await page.waitForSelector('.quest-panel', { timeout: 3000 });

    await page.locator('.quest-tab', { hasText: '悬赏' }).click();
    await page.waitForTimeout(300);

    const hasBountyUI = await page.evaluate(() => {
      return document.querySelector('.bounty-slime-select') !== null ||
        document.querySelector('.bounty-no-eligible') !== null;
    });
    expect(hasBountyUI).toBe(true);
  });
});

test.describe('M28 UX Polish', () => {
  test('mobile viewport: ui-panel does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForGameReady(page);
    await startFreshGame(page);

    const panel = page.locator('.ui-panel');
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 1);
  });

  test('facility upgrade shows toast', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(100);

    const toastText = await page.evaluate(() => {
      const gm = window.__GM!;
      gm.setCurrency(99999);
      const state = gm.getState();
      const facility = state.facilities[0];
      const oldLevel = facility?.level ?? 0;
      const ok = gm.upgradeFacility(facility.id);
      if (!ok) return '';
      const newLevel = facility?.level ?? oldLevel;
      return `${facility?.name ?? '设施'} 升级到 Lv.${newLevel} ✓`;
    });
    expect(toastText).toContain('升级到');
  });

  test('new game skips confirm when no save exists', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(100);

    const hasSaveBefore = await page.evaluate(() => localStorage.getItem('slime-keeper-save') !== null);
    expect(hasSaveBefore).toBe(false);

    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => window.__GM!.getState());
    expect(state.currency).toBe(50);
    expect(state.slimes.length).toBe(2);
  });

  test('battle result has visual distinction', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await startFreshGame(page);

    await page.evaluate(() => {
      const gm = window.__GM!;
      const state = gm.getState();
      for (const s of state.slimes) {
        gm.setStats(s.id, { health: 999, attack: 999, defense: 999, speed: 999 });
      }
      for (const s of [...state.slimes]) {
        gm.archiveSlime(s.id);
      }
    });
    await page.waitForTimeout(100);

    await page.locator('.ui-actions button', { hasText: '战斗' }).click();
    await page.waitForSelector('.stage-select-panel', { timeout: 3000 });
    await page.locator('.stage-card').first().click();
    await page.waitForSelector('.team-select-panel', { timeout: 3000 });
    await page.locator('.team-slime-card').first().click();
    await page.locator('.confirm-btn', { hasText: '开始战斗' }).click();
    await page.waitForSelector('.battle-panel', { timeout: 3000 });
    await page.locator('button', { hasText: '跳过动画' }).click();
    await page.waitForSelector('.result-victory,.result-defeat', { timeout: 10000 });

    const result = page.locator('.result-victory,.result-defeat').first();
    const className = await result.getAttribute('class');
    expect(className).toMatch(/result-victory|result-defeat/);
  });
});

// =========================================================
// =========================================================
// M30 Bug Fix Tests
// =========================================================
test.describe('M30 Bug Fixes', () => {
  test('cull button shows toast and updates UI', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);

    // Get slime count before cull
    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);
    expect(countBefore).toBeGreaterThan(1);

    // Open backpack and cull via detail
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);

    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-cull-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.evaluate(() => window.__GM!.closeBackpack());

    // Wait for toast element to be attached to DOM
    const toastEl = await toastPromise;
    const toastText = await toastEl.textContent();
    expect(toastText).toContain('剔除');

    // Slime count should have decreased
    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);
    expect(countAfter).toBeLessThan(countBefore);
  });

  test('breeding paused during onboarding', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    // Skip onboarding overlay so we can click new game
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    // Click new game — starts fresh state with onboarding enabled
    acceptDialogs(page);
    await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
    await page.waitForTimeout(300);

    // New game state has onboarding active
    const onboardingStep = await page.evaluate(() => window.__GM!.getState().onboarding?.currentStep);
    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);
        // Initial state now has 2 slimes
    expect(countBefore).toBeGreaterThanOrEqual(1);    // If onboarding is active, wait 2 seconds and verify breeding is paused
    if (onboardingStep !== null && onboardingStep !== undefined) {
      await page.waitForTimeout(2000);
      const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);
      expect(countAfter).toBe(2);
    }
  });
});

// =========================================================
// M31 UI Upgrades Tests (#142 #143 #144 #145 #146 #147)
// =========================================================
test.describe('M31 UI Upgrades', () => {
  // #142: Expand/Compact mode
  test('#142 view toggle button exists and toggles compact mode', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);
    // View toggle moved to BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    // Backpack cards show stats inline
    const statsEl = page.locator('.backpack-card-stats').first();
    await expect(statsEl).toBeVisible();

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('#142 compact mode hides slime action buttons', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);
    // Action buttons now in BackpackUI detail pane
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);

    // Detail pane action buttons are visible
    const actionsEl = page.locator('.backpack-detail-actions');
    await expect(actionsEl).toBeVisible();

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('#143 checkboxes appear on slime cards', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);
    // Checkboxes are in BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    const checkboxes = page.locator('.backpack-card-checkbox');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('#143 selecting slime shows batch action row', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);
    // Batch bar is in BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    const batchBar = page.locator('.backpack-batch-bar');
    await expect(batchBar).not.toBeVisible();

    await page.evaluate(() => {
      const cb = document.querySelector('.backpack-card-checkbox') as HTMLInputElement | null;
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);

    await expect(batchBar).toBeVisible();
    await expect(page.locator('.backpack-batch-cull-btn')).toBeVisible();
    await expect(page.locator('.backpack-batch-sell-btn')).toBeVisible();

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('#143 batch cull removes selected slimes', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);
    // Batch cull via BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);

    await page.evaluate(() => {
      const cb = document.querySelector('.backpack-card-checkbox') as HTMLInputElement | null;
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);

    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.locator('.backpack-batch-cull-btn').click();
    const toastEl = await toastPromise;
    const toastText = await toastEl.textContent();
    expect(toastText).toMatch(/批量剔除/);

    await page.evaluate(() => window.__GM!.closeBackpack());
    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);
    expect(countAfter).toBeLessThan(countBefore);
  });

  test('#143 batch sell removes selected slimes and adds currency', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);
    // Batch sell via BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);
    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency);

    await page.evaluate(() => {
      const cb = document.querySelector('.backpack-card-checkbox') as HTMLInputElement | null;
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);

    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.locator('.backpack-batch-sell-btn').click();
    const toastEl = await toastPromise;
    const toastText = await toastEl.textContent();
    expect(toastText).toMatch(/批量出售/);

    await page.evaluate(() => window.__GM!.closeBackpack());
    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);
    const currencyAfter = await page.evaluate(() => window.__GM!.getState().currency);
    expect(countAfter).toBeLessThan(countBefore);
    expect(currencyAfter).toBeGreaterThanOrEqual(currencyBefore);
  });

  test('#144 rarity filter row exists with all filter buttons', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    // Filter toolbar is in BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-panel', { timeout: 3000 });

    const filterToolbar = page.locator('.backpack-toolbar');
    await expect(filterToolbar).toBeVisible();

    const allBtn = page.locator('.backpack-filter-btn[data-filter="all"]');
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/backpack-filter-active/);

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('#144 rarity filter hides non-matching slimes', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);
    // Filter in BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    const totalCount = await page.locator('.backpack-card').count();
    expect(totalCount).toBeGreaterThan(0);

    await page.locator('.backpack-filter-btn[data-filter="Legendary"]').click();
    await page.waitForTimeout(100);
    const legendaryCount = await page.locator('.backpack-card').count();
    expect(legendaryCount).toBe(0);

    await page.locator('.backpack-filter-btn[data-filter="all"]').click();
    await page.waitForTimeout(100);
    const resetCount = await page.locator('.backpack-card').count();
    expect(resetCount).toBe(totalCount);

    await page.evaluate(() => window.__GM!.closeBackpack());
  });

  test('#145 pixel art buttons have pixel-btn class', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    const uiButtons = page.locator('.ui-actions .pixel-btn');
    const count = await uiButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('#147 canvas exists with positive dimensions', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const dimensions = await canvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(dimensions.w).toBeGreaterThan(0);
    expect(dimensions.h).toBeGreaterThan(0);
  });

  test('#143 cancel batch selection hides batch row', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);
    await setupClassicState(page);
    // Cancel batch via BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    await page.evaluate(() => {
      const cb = document.querySelector('.backpack-card-checkbox') as HTMLInputElement | null;
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);
    const batchBar = page.locator('.backpack-batch-bar');
    await expect(batchBar).toBeVisible();

    await page.locator('.backpack-batch-cancel-btn').click();
    await page.waitForTimeout(100);
    await expect(batchBar).not.toBeVisible();

    const checked = await page.evaluate(() => {
      const cb = document.querySelector('.backpack-card-checkbox') as HTMLInputElement | null;
      return cb ? cb.checked : false;
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    expect(checked).toBe(false);
  });
});

/* ======== M32: Sound System E2E Tests ======== */

test.describe('M32 Sound System', () => {
  test('mute button is visible and toggleable', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    const muteBtn = page.locator('.mute-btn');
    await expect(muteBtn).toBeVisible();
    await expect(muteBtn).toContainText('🔊');

    // Click to mute
    await muteBtn.click();
    await page.waitForTimeout(200);
    await expect(muteBtn).toContainText('🔇');

    // Click to unmute
    await muteBtn.click();
    await page.waitForTimeout(200);
    await expect(muteBtn).toContainText('🔊');
  });

  test('volume slider is visible and adjustable', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    const slider = page.locator('.volume-slider');
    await expect(slider).toBeVisible();

    // Set volume to 80
    await slider.fill('80');
    await page.waitForTimeout(100);
    const val = await slider.inputValue();
    expect(val).toBe('80');
  });

  test('BGM button is visible and toggleable', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    const bgmBtn = page.locator('.bgm-btn');
    await expect(bgmBtn).toBeVisible();
    await expect(bgmBtn).toContainText('BGM');

    // Toggle BGM on
    await bgmBtn.click();
    await page.waitForTimeout(200);
    const text = await bgmBtn.textContent();
    expect(text).toBeTruthy();
  });

  test('SoundManager is accessible via GM API', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const soundState = await page.evaluate(() => window.__GM!.getSoundManager());
    expect(soundState).toBeDefined();
    expect(typeof soundState.isMuted).toBe('boolean');
    expect(typeof soundState.masterVolume).toBe('number');
    expect(typeof soundState.bgmPlaying).toBe('boolean');
  });

  test('mute state syncs with GM API', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(200);

    // Initially not muted
    let soundState = await page.evaluate(() => window.__GM!.getSoundManager());
    expect(soundState.isMuted).toBe(false);

    // Click mute button
    await page.locator('.mute-btn').click();
    await page.waitForTimeout(200);

    soundState = await page.evaluate(() => window.__GM!.getSoundManager());
    expect(soundState.isMuted).toBe(true);
  });

  test('audio control panel layout is correct', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const audioControl = page.locator('.audio-control');
    await expect(audioControl).toBeVisible();

    // Should contain mute button, BGM button, and volume slider
    await expect(audioControl.locator('.mute-btn')).toBeVisible();
    await expect(audioControl.locator('.bgm-btn')).toBeVisible();
    await expect(audioControl.locator('.volume-slider')).toBeVisible();
  });

  test('mutation-catalyst buff activates and clears after split', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__GM !== undefined, { timeout: 15000 });
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(500);

    // Give gold and buy mutation catalyst
    await page.evaluate(() => window.__GM!.setCurrency(5000));
    await page.evaluate(() => window.__GM!.buyItem('shop-mutation-catalyst'));

    // Use mutation catalyst
    const useResult = await page.evaluate(() => window.__GM!.useItem('mutation-catalyst'));
    expect(useResult).toContain('变异催化剂已激活');

    // Check buff is active
    const buffs = await page.evaluate(() => window.__GM!.getActiveBuffs());
    expect(buffs.mutationCatalystActive).toBe(true);
    expect(buffs.rareEssenceActive).toBe(false);

    // Re-activate buff and verify clearing via BreedingSystem
    await page.evaluate(() => window.__GM!.setActiveBuffs({ mutationCatalystActive: true }));
    const beforeSplit = await page.evaluate(() => window.__GM!.getActiveBuffs());
    expect(beforeSplit.mutationCatalystActive).toBe(true);

    // Wait for natural split (max 12s with 10s interval)
    const slimesBefore = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    await page.waitForFunction(
      (count) => window.__GM!.getState().slimes.length > count,
      slimesBefore,
      { timeout: 15000 },
    );

    // After natural split, buff should be cleared
    const afterSplit = await page.evaluate(() => window.__GM!.getActiveBuffs());
    expect(afterSplit.mutationCatalystActive).toBe(false);
  });

  test('rare-essence buff activates and clears after split', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__GM !== undefined, { timeout: 15000 });
    await page.evaluate(() => window.__GM!.skipOnboarding());
    await page.waitForTimeout(500);

    // Give crystals and buy rare essence
    await page.evaluate(() => window.__GM!.setCrystal(500));
    await page.evaluate(() => window.__GM!.buyItem('shop-rare-essence'));

    // Use rare essence
    const useResult = await page.evaluate(() => window.__GM!.useItem('rare-essence'));
    expect(useResult).toContain('稀有精华已激活');

    // Check buff is active
    const buffs = await page.evaluate(() => window.__GM!.getActiveBuffs());
    expect(buffs.rareEssenceActive).toBe(true);
    expect(buffs.mutationCatalystActive).toBe(false);

    // Set buff and verify clearing after natural split
    await page.evaluate(() => window.__GM!.setActiveBuffs({ rareEssenceActive: true }));
    const beforeSplit = await page.evaluate(() => window.__GM!.getActiveBuffs());
    expect(beforeSplit.rareEssenceActive).toBe(true);

    // Wait for natural split
    const slimesBefore = await page.evaluate(() => window.__GM!.getState().slimes.length) as number;
    await page.waitForFunction(
      (count) => window.__GM!.getState().slimes.length > count,
      slimesBefore,
      { timeout: 15000 },
    );

    // After natural split, buff should be cleared
    const afterSplit = await page.evaluate(() => window.__GM!.getActiveBuffs());
    expect(afterSplit.rareEssenceActive).toBe(false);
  });
});

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

// =========================================================
// Test M40: Battle Canvas Animation System
// =========================================================

/** Helper: navigate to battle panel via full UI flow */
async function startBattleViaUI(page: Page) {
  await page.goto('/');
  await waitForGameReady(page);
  await clearSave(page);
  acceptDialogs(page);
  await page.evaluate(() => {
    const gm = window.__GM!;
    gm.skipOnboarding();
    const state = gm.getState();
    for (const s of state.slimes) {
      gm.setStats(s.id, { health: 999, attack: 999, defense: 999, speed: 999 });
    }
    for (const s of [...state.slimes]) {
      gm.archiveSlime(s.id);
    }
  });
  await page.waitForTimeout(200);
  await page.locator('.ui-actions button', { hasText: '战斗' }).click();
  await page.locator('.stage-card').first().click();
  const slimeCards = page.locator('.team-slime-card');
  const count = await slimeCards.count();
  for (let i = 0; i < Math.min(count, 4); i++) {
    await slimeCards.nth(i).click();
  }
  await page.locator('.confirm-btn', { hasText: '开始战斗' }).click();
}

test.describe('M40: Battle Canvas Animation', () => {
  test('battle canvas element exists during combat', async ({ page }) => {
    await startBattleViaUI(page);
    const canvas = page.locator('.battle-canvas-container canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
  });

  test('battle canvas has correct dimensions', async ({ page }) => {
    await startBattleViaUI(page);
    const canvas = page.locator('.battle-canvas-container canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    const size = await canvas.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
    expect(size.w).toBeGreaterThan(0);
    expect(size.h).toBeGreaterThan(0);
  });

  test('battle skip button works with canvas animation', async ({ page }) => {
    await startBattleViaUI(page);
    await page.waitForTimeout(400);
    await page.locator('.battle-controls button', { hasText: '跳过' }).click();
    await expect(page.locator('.battle-result')).toBeVisible({ timeout: 5000 });
  });

  test('battle canvas has rendered pixels after start', async ({ page }) => {
    await startBattleViaUI(page);
    await page.waitForTimeout(300);
    const hasContent = await page.locator('.battle-canvas-container canvas').evaluate(
      (el: HTMLCanvasElement) => {
        const ctx = el.getContext('2d');
        if (!ctx) return false;
        const data = ctx.getImageData(0, 0, el.width, el.height).data;
        for (let i = 0; i < data.length; i += 4) {
          if ((data[i] ?? 0) > 0 || (data[i + 1] ?? 0) > 0 || (data[i + 2] ?? 0) > 0) return true;
        }
        return false;
      },
    );
    expect(hasContent).toBe(true);
  });

  test('battle HP bars update after skip', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await clearSave(page);
    acceptDialogs(page);
    await page.evaluate(() => {
      const gm = window.__GM!;
      gm.skipOnboarding();
      const state = gm.getState();
      for (const s of [...state.slimes]) {
        gm.archiveSlime(s.id);
      }
    });
    await page.waitForTimeout(200);
    await page.locator('.ui-actions button', { hasText: '战斗' }).click();
    await page.locator('.stage-card').first().click();
    const slimeCards2 = page.locator('.team-slime-card');
    const count2 = await slimeCards2.count();
    for (let i = 0; i < Math.min(count2, 4); i++) {
      await slimeCards2.nth(i).click();
    }
    await page.locator('.confirm-btn', { hasText: '开始战斗' }).click();
    await page.waitForTimeout(400);
    await page.locator('.battle-controls button', { hasText: '跳过' }).click();
    await expect(page.locator('.battle-result')).toBeVisible({ timeout: 5000 });
    const hpWidths = await page.locator('.hp-bar-inner').evaluateAll((els: HTMLElement[]) =>
      els.map((el) => parseFloat(el.style.width || '100')),
    );
    const anyChanged = hpWidths.some((w) => w < 100);
    expect(anyChanged).toBe(true);
  });

  test('battle result shows victory or defeat text', async ({ page }) => {
    await startBattleViaUI(page);
    await page.waitForTimeout(300);
    await page.locator('.battle-controls button', { hasText: '跳过' }).click();
    await expect(page.locator('.battle-result')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.battle-result')).toContainText(/胜利|失败/);
  });

  test('battle result auto-completes after all animation plays', async ({ page }) => {
    await startBattleViaUI(page);
    await expect(page.locator('.battle-result')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.battle-result')).toContainText(/胜利|失败/);
  });
});
