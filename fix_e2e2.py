"""Fix E2E tests to use BackpackUI instead of old slime list selectors."""

with open('repo/e2e/game.spec.ts', encoding='utf-8') as f:
    c = f.read()

original_len = len(c)
changes = []

def rep(old, new, desc):
    global c
    if old in c:
        c = c.replace(old, new)
        changes.append('OK: ' + desc)
    else:
        changes.append('MISSING: ' + desc)

# =====================================================================
# Onboarding test - cull button visibility check (line ~1716)
# =====================================================================
rep(
    """    // Verify cull button is visible in slime actions
    const cullBtnVisible = await page.evaluate(() => {
      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(1)') as HTMLElement | null;
      return btn ? btn.style.display !== 'none' : false;
    });
    expect(cullBtnVisible).toBe(true);""",
    """    // Verify backpack button is visible (cull is accessed via backpack)
    const cullBtnVisible = await page.locator('.ui-actions button', { hasText: '\\u80cc\\u5305' }).isVisible();
    expect(cullBtnVisible).toBe(true);""",
    'onboarding cull visibility check'
)

# =====================================================================
# Onboarding test - cull action (line ~1723)
# =====================================================================
rep(
    """    // Perform cull via evaluate (to avoid DOM detachment race)
    await page.evaluate(() => {
      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(1)') as HTMLButtonElement | null;
      btn?.click();
    });""",
    """    // Perform cull via backpack
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-cull-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'onboarding cull action'
)

# =====================================================================
# Onboarding test - sell action (line ~1741)
# =====================================================================
rep(
    """    // Perform sell
    await page.evaluate(() => {
      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(2)') as HTMLButtonElement | null;
      btn?.click();
    });""",
    """    // Perform sell via backpack
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'onboarding sell action'
)

# =====================================================================
# Onboarding test - archive action (line ~1766)
# =====================================================================
rep(
    """    // Perform archive
    await page.evaluate(() => {
      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(3)') as HTMLButtonElement | null;
      btn?.click();
    });""",
    """    // Perform archive via backpack
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-archive-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'onboarding archive action'
)

# =====================================================================
# M22 archive full test - uses .slime-item .slime-actions button:nth-child(3)
# =====================================================================
rep(
    """    const archiveBtnDisabled = await page.evaluate(() => {
      const btns = document.querySelectorAll('.slime-item .slime-actions button:nth-child(3)');
      return Array.from(btns).every(b => (b as HTMLButtonElement).disabled);
    });
    expect(archiveBtnDisabled).toBe(true);""",
    """    // Open backpack and check archive button is disabled
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const archiveBtnDisabled = await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-archive-btn') as HTMLButtonElement | null;
      return btn ? btn.disabled : false;
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    expect(archiveBtnDisabled).toBe(true);""",
    'M22 archive full test'
)

# =====================================================================
# M22 sell price preview test
# =====================================================================
rep(
    """    const sellText = await page.evaluate(() => {
      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(2)') as HTMLButtonElement | null;
      return btn?.textContent ?? '';
    });
    expect(sellText).toContain('\\u{1F4B0}');
    expect(sellText).toContain('\\u51fa\\u552e');""",
    """    // Open backpack, select slime, check sell button text
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const sellText = await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      return btn?.textContent ?? '';
    });
    await page.evaluate(() => window.__GM!.closeBackpack());
    expect(sellText).toContain('\\u{1F4B0}');
    expect(sellText).toContain('\\u51fa\\u552e');""",
    'M22 sell price preview'
)

# =====================================================================
# M22 sort button active state test
# Uses .sort-actions button and sort-btn-active
# =====================================================================
rep(
    """    const rarityActive = await page.evaluate(() => {
      const btns = document.querySelectorAll('.sort-actions button');
      return (btns[0] as HTMLElement)?.classList.contains('sort-btn-active') ?? false;
    });
    expect(rarityActive).toBe(true);

    await page.locator('.sort-actions button', { hasText: '\\u6309\\u5c5e\\u6027\\u603b\\u548c' }).click();
    await page.waitForTimeout(100);

    const statsActive = await page.evaluate(() => {
      const btns = document.querySelectorAll('.sort-actions button');
      const first = (btns[0] as HTMLElement)?.classList.contains('sort-btn-active') ?? false;
      const second = (btns[1] as HTMLElement)?.classList.contains('sort-btn-active') ?? false;
      return { first, second };
    });
    expect(statsActive.first).toBe(false);
    expect(statsActive.second).toBe(true);""",
    """    // Open backpack and test sort buttons
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
    expect(statsActive.second).toBe(true);""",
    'M22 sort button test'
)

# =====================================================================
# M22 sell toast test (line ~1964)
# =====================================================================
rep(
    """    await page.evaluate(() => {
      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(2)') as HTMLButtonElement | null;
      btn?.click();
    });
    await page.waitForTimeout(500);

    const toastText = await page.evaluate(() => {
      const el = document.querySelector('.toast-message');
      return el?.textContent ?? '';
    });
    expect(toastText).toContain('\\u51fa\\u552e\\u6210\\u529f');
    expect(toastText).toContain('\\uD83D\\uDCB0');""",
    """    // Open backpack, sell via detail
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const toastPromise3 = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await toastPromise3;
    await page.evaluate(() => window.__GM!.closeBackpack());
    await page.waitForTimeout(300);

    const toastText = await page.evaluate(() => {
      const el = document.querySelector('.toast-message');
      return el?.textContent ?? '';
    });
    expect(toastText).toContain('\\u51fa\\u552e\\u6210\\u529f');
    expect(toastText).toContain('\\uD83D\\uDCB0');""",
    'M22 sell toast test'
)

# =====================================================================
# M31: Cull button test (line ~2169)
# =====================================================================
rep(
    """    // Wait for slime list to render
    await page.waitForSelector('.slime-item', { timeout: 5000 });

    // Get slime count before cull
    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);
    expect(countBefore).toBeGreaterThan(1);

    // Click the cull button using evaluate (avoids DOM detach from game loop re-renders)
    // Start watching for toast BEFORE clicking
    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.evaluate(() => {
      const item = document.querySelector('.slime-item');
      if (item) {
        const btn = item.querySelector<HTMLButtonElement>('button');
        if (btn) btn.click();
      }
    });""",
    """    // Get slime count before cull
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
    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'M31 cull button test'
)

# =====================================================================
# M31 view toggle tests (#142) - viewToggle no longer exists, rewrite
# =====================================================================
rep(
    """    await page.waitForSelector('.slime-item', { timeout: 5000 });

    const viewToggle = page.locator('.view-toggle-btn');
    await expect(viewToggle).toBeVisible();

    const infoEl = page.locator('.slime-item .slime-info').first();
    await expect(infoEl).toBeVisible();

    await viewToggle.click();
    await page.waitForTimeout(100);

    await expect(infoEl).not.toBeVisible();

    const btnText = await viewToggle.textContent();
    expect(btnText).toContain('\\u5c55\\u5f00');""",
    """    // View toggle moved to BackpackUI - verify backpack shows card stats
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    // Backpack cards show stats inline
    const statsEl = page.locator('.backpack-card-stats').first();
    await expect(statsEl).toBeVisible();

    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'M31 view toggle test 1'
)

rep(
    """    await page.waitForSelector('.slime-item', { timeout: 5000 });

    const viewToggle = page.locator('.view-toggle-btn');
    const actionsEl = page.locator('.slime-item .slime-actions').first();
    await expect(actionsEl).toBeVisible();

    await viewToggle.click();
    await page.waitForTimeout(100);
    await expect(actionsEl).not.toBeVisible();

    await viewToggle.click();
    await page.waitForTimeout(100);
    await expect(actionsEl).toBeVisible();""",
    """    // Action buttons now in BackpackUI detail pane
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);

    // Detail pane action buttons are visible
    const actionsEl = page.locator('.backpack-detail-actions');
    await expect(actionsEl).toBeVisible();

    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'M31 view toggle test 2'
)

# =====================================================================
# M31 checkbox test (#143)
# =====================================================================
rep(
    """    await page.waitForSelector('.slime-item', { timeout: 5000 });

    const checkboxes = page.locator('.slime-checkbox');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);""",
    """    // Checkboxes are in BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 5000 });

    const checkboxes = page.locator('.backpack-card-checkbox');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'M31 checkbox test'
)

# =====================================================================
# M31 batch row test (#143)
# =====================================================================
rep(
    """    await page.waitForSelector('.slime-item', { timeout: 5000 });

    const batchRow = page.locator('.batch-row');
    await expect(batchRow).not.toBeVisible();

    await page.evaluate(() => {
      const cb = document.querySelector('.slime-checkbox');
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);

    await expect(batchRow).toBeVisible();
    await expect(page.locator('.batch-cull-btn')).toBeVisible();
    await expect(page.locator('.batch-sell-btn')).toBeVisible();""",
    """    // Batch bar is in BackpackUI
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

    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'M31 batch row visibility test'
)

# =====================================================================
# M31 batch cull test (#143)
# =====================================================================
rep(
    """    await page.waitForSelector('.slime-item', { timeout: 5000 });

    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);

    await page.evaluate(() => {
      const cb = document.querySelector('.slime-checkbox');
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);

    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.locator('.batch-cull-btn').click();
    const toastEl = await toastPromise;
    const toastText = await toastEl.textContent();
    expect(toastText).toMatch(/\\u6279\\u91cf\\u5254\\u9664/);

    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);
    expect(countAfter).toBeLessThan(countBefore);""",
    """    // Batch cull via BackpackUI
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
    expect(toastText).toMatch(/\\u6279\\u91cf\\u5254\\u9664/);

    await page.evaluate(() => window.__GM!.closeBackpack());
    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);
    expect(countAfter).toBeLessThan(countBefore);""",
    'M31 batch cull test'
)

# =====================================================================
# M31 batch sell test (#143)
# =====================================================================
rep(
    """    await page.waitForSelector('.slime-item', { timeout: 5000 });

    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);
    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency);

    await page.evaluate(() => {
      const cb = document.querySelector('.slime-checkbox');
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);

    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });
    await page.locator('.batch-sell-btn').click();
    const toastEl = await toastPromise;
    const toastText = await toastEl.textContent();
    expect(toastText).toMatch(/\\u6279\\u91cf\\u51fa\\u552e/);

    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);
    const currencyAfter = await page.evaluate(() => window.__GM!.getState().currency);
    expect(countAfter).toBeLessThan(countBefore);
    expect(currencyAfter).toBeGreaterThanOrEqual(currencyBefore);""",
    """    // Batch sell via BackpackUI
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
    expect(toastText).toMatch(/\\u6279\\u91cf\\u51fa\\u552e/);

    await page.evaluate(() => window.__GM!.closeBackpack());
    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);
    const currencyAfter = await page.evaluate(() => window.__GM!.getState().currency);
    expect(countAfter).toBeLessThan(countBefore);
    expect(currencyAfter).toBeGreaterThanOrEqual(currencyBefore);""",
    'M31 batch sell test'
)

# =====================================================================
# M31 filter row test (#144)
# =====================================================================
rep(
    """    const filterRow = page.locator('.filter-row');
    await expect(filterRow).toBeVisible();

    const allBtn = page.locator('.filter-btn[data-filter-value="all"]');
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/filter-btn-active/);""",
    """    // Filter toolbar is in BackpackUI
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-panel', { timeout: 3000 });

    const filterToolbar = page.locator('.backpack-toolbar');
    await expect(filterToolbar).toBeVisible();

    const allBtn = page.locator('.backpack-filter-btn[data-filter="all"]');
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/backpack-filter-active/);

    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'M31 filter row test'
)

# =====================================================================
# M31 filter functionality test (#144)
# =====================================================================
rep(
    """    await page.waitForSelector('.slime-item', { timeout: 5000 });

    const totalCount = await page.locator('.slime-item').count();
    expect(totalCount).toBeGreaterThan(0);

    await page.locator('.filter-btn[data-filter-value="Legendary"]').click();
    await page.waitForTimeout(100);
    const legendaryCount = await page.locator('.slime-item').count();
    expect(legendaryCount).toBe(0);

    await page.locator('.filter-btn[data-filter-value="all"]').click();
    await page.waitForTimeout(100);
    const resetCount = await page.locator('.slime-item').count();
    expect(resetCount).toBe(totalCount);""",
    """    // Filter in BackpackUI
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

    await page.evaluate(() => window.__GM!.closeBackpack());""",
    'M31 filter functionality test'
)

# =====================================================================
# M31 cancel batch selection test (#143) - line ~2441
# =====================================================================
rep(
    """    await page.waitForSelector('.slime-item', { timeout: 5000 });

    await page.evaluate(() => {
      const cb = document.querySelector('.slime-checkbox');
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(100);
    const batchRow = page.locator('.batch-row');
    await expect(batchRow).toBeVisible();

    await page.locator('.batch-clear-btn').click();
    await page.waitForTimeout(100);
    await expect(batchRow).not.toBeVisible();

    const checked = await page.evaluate(() => {
      const cb = document.querySelector('.slime-checkbox');
      return cb ? cb.checked : false;
    });
    expect(checked).toBe(false);""",
    """    // Cancel batch via BackpackUI
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
    expect(checked).toBe(false);""",
    'M31 cancel batch test'
)

print('Changes summary:')
for ch in changes:
    print(' ', ch)

print(f'File size: {original_len} -> {len(c)}')

with open('repo/e2e/game.spec.ts', 'w', encoding='utf-8') as f:
    f.write(c)
print('Saved')
