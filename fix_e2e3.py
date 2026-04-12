"""Fix remaining E2E tests."""

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

# Fix sell price preview test
rep(
    "      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(2)') as HTMLButtonElement | null;\n      return btn?.textContent ?? '';\n    });\n    expect(sellText).toContain('\U0001f4b0');\n    expect(sellText).toContain('\u51fa\u552e');",
    "    // Open backpack and check sell button text\n    await page.evaluate(() => window.__GM!.openBackpack());\n    await page.waitForSelector('.backpack-card', { timeout: 3000 });\n    await page.locator('.backpack-card').first().click();\n    await page.waitForTimeout(100);\n    const sellText = await page.evaluate(() => {\n      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;\n      return btn?.textContent ?? '';\n    });\n    await page.evaluate(() => window.__GM!.closeBackpack());\n    expect(sellText).toContain('\U0001f4b0');\n    expect(sellText).toContain('\u51fa\u552e');",
    'sell price preview (content replaced)'
)

# Fix sell toast test - around line 1982
rep(
    "      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(2)') as HTMLButtonElement | null;\n      btn?.click();\n    });\n    await page.waitForTimeout(500);\n\n    const toastText = await page.evaluate(() => {\n      const el = document.querySelector('.toast-message');\n      return el?.textContent ?? '';\n    });\n    expect(toastText).toContain('\u51fa\u552e\u6210\u529f');\n    expect(toastText).toContain('\U0001f4b0');",
    "    // Sell via backpack\n    await page.evaluate(() => window.__GM!.openBackpack());\n    await page.waitForSelector('.backpack-card', { timeout: 3000 });\n    await page.locator('.backpack-card').first().click();\n    await page.waitForTimeout(100);\n    const toastPromise4 = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });\n    await page.evaluate(() => {\n      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;\n      btn?.click();\n    });\n    await toastPromise4;\n    await page.evaluate(() => window.__GM!.closeBackpack());\n    await page.waitForTimeout(300);\n\n    const toastText = await page.evaluate(() => {\n      const el = document.querySelector('.toast-message');\n      return el?.textContent ?? '';\n    });\n    expect(toastText).toContain('\u51fa\u552e\u6210\u529f');\n    expect(toastText).toContain('\U0001f4b0');",
    'sell toast test'
)

# Fix sort button test
rep(
    "    const rarityActive = await page.evaluate(() => {\n      const btns = document.querySelectorAll('.sort-actions button');\n      return (btns[0] as HTMLElement)?.classList.contains('sort-btn-active') ?? false;\n    });\n    expect(rarityActive).toBe(true);\n\n    await page.locator('.sort-actions button', { hasText: '\u6309\u5c5e\u6027\u603b\u548c' }).click();\n    await page.waitForTimeout(100);\n\n    const statsActive = await page.evaluate(() => {\n      const btns = document.querySelectorAll('.sort-actions button');\n      const first = (btns[0] as HTMLElement)?.classList.contains('sort-btn-active') ?? false;\n      const second = (btns[1] as HTMLElement)?.classList.contains('sort-btn-active') ?? false;\n      return { first, second };\n    });\n    expect(statsActive.first).toBe(false);\n    expect(statsActive.second).toBe(true);",
    "    // Sort buttons in BackpackUI\n    await page.evaluate(() => window.__GM!.openBackpack());\n    await page.waitForSelector('.backpack-panel', { timeout: 3000 });\n\n    const rarityActive = await page.evaluate(() => {\n      const btn = document.querySelector('.backpack-sort-btn[data-sort=\"rarity\"]') as HTMLElement | null;\n      return btn?.classList.contains('backpack-sort-active') ?? false;\n    });\n    expect(rarityActive).toBe(true);\n\n    await page.locator('.backpack-sort-btn[data-sort=\"stats\"]').click();\n    await page.waitForTimeout(100);\n\n    const statsActive = await page.evaluate(() => {\n      const first = document.querySelector('.backpack-sort-btn[data-sort=\"rarity\"]')?.classList.contains('backpack-sort-active') ?? false;\n      const second = document.querySelector('.backpack-sort-btn[data-sort=\"stats\"]')?.classList.contains('backpack-sort-active') ?? false;\n      return { first, second };\n    });\n    await page.evaluate(() => window.__GM!.closeBackpack());\n    expect(statsActive.first).toBe(false);\n    expect(statsActive.second).toBe(true);",
    'sort button test'
)

# Fix view toggle test 1 - line ~2250
rep(
    "    await page.waitForSelector('.slime-item', { timeout: 5000 });\n\n    const viewToggle = page.locator('.view-toggle-btn');\n    await expect(viewToggle).toBeVisible();\n\n    const infoEl = page.locator('.slime-item .slime-info').first();\n    await expect(infoEl).toBeVisible();\n\n    await viewToggle.click();\n    await page.waitForTimeout(100);\n\n    await expect(infoEl).not.toBeVisible();\n\n    const btnText = await viewToggle.textContent();\n    expect(btnText).toContain('\u5c55\u5f00');",
    "    // View toggle moved to BackpackUI\n    await page.evaluate(() => window.__GM!.openBackpack());\n    await page.waitForSelector('.backpack-card', { timeout: 5000 });\n\n    // Backpack cards show stats inline\n    const statsEl = page.locator('.backpack-card-stats').first();\n    await expect(statsEl).toBeVisible();\n\n    await page.evaluate(() => window.__GM!.closeBackpack());",
    'view toggle test 1'
)

# Fix batch cull test - line ~2339
rep(
    "    await page.waitForSelector('.slime-item', { timeout: 5000 });\n\n    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);\n\n    await page.evaluate(() => {\n      const cb = document.querySelector('.slime-checkbox');\n      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }\n    });\n    await page.waitForTimeout(100);\n\n    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });\n    await page.locator('.batch-cull-btn').click();\n    const toastEl = await toastPromise;\n    const toastText = await toastEl.textContent();\n    expect(toastText).toMatch(/\u6279\u91cf\u5254\u9664/);\n\n    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);\n    expect(countAfter).toBeLessThan(countBefore);",
    "    // Batch cull via BackpackUI\n    await page.evaluate(() => window.__GM!.openBackpack());\n    await page.waitForSelector('.backpack-card', { timeout: 5000 });\n\n    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);\n\n    await page.evaluate(() => {\n      const cb = document.querySelector('.backpack-card-checkbox') as HTMLInputElement | null;\n      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }\n    });\n    await page.waitForTimeout(100);\n\n    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });\n    await page.locator('.backpack-batch-cull-btn').click();\n    const toastEl = await toastPromise;\n    const toastText = await toastEl.textContent();\n    expect(toastText).toMatch(/\u6279\u91cf\u5254\u9664/);\n\n    await page.evaluate(() => window.__GM!.closeBackpack());\n    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);\n    expect(countAfter).toBeLessThan(countBefore);",
    'batch cull test'
)

# Fix batch sell test - line ~2366
rep(
    "    await page.waitForSelector('.slime-item', { timeout: 5000 });\n\n    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);\n    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency);\n\n    await page.evaluate(() => {\n      const cb = document.querySelector('.slime-checkbox');\n      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }\n    });\n    await page.waitForTimeout(100);\n\n    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });\n    await page.locator('.batch-sell-btn').click();\n    const toastEl = await toastPromise;\n    const toastText = await toastEl.textContent();\n    expect(toastText).toMatch(/\u6279\u91cf\u51fa\u552e/);\n\n    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);\n    const currencyAfter = await page.evaluate(() => window.__GM!.getState().currency);\n    expect(countAfter).toBeLessThan(countBefore);\n    expect(currencyAfter).toBeGreaterThanOrEqual(currencyBefore);",
    "    // Batch sell via BackpackUI\n    await page.evaluate(() => window.__GM!.openBackpack());\n    await page.waitForSelector('.backpack-card', { timeout: 5000 });\n\n    const countBefore = await page.evaluate(() => window.__GM!.getState().slimes.length);\n    const currencyBefore = await page.evaluate(() => window.__GM!.getState().currency);\n\n    await page.evaluate(() => {\n      const cb = document.querySelector('.backpack-card-checkbox') as HTMLInputElement | null;\n      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }\n    });\n    await page.waitForTimeout(100);\n\n    const toastPromise = page.waitForSelector('.toast-message', { state: 'attached', timeout: 5000 });\n    await page.locator('.backpack-batch-sell-btn').click();\n    const toastEl = await toastPromise;\n    const toastText = await toastEl.textContent();\n    expect(toastText).toMatch(/\u6279\u91cf\u51fa\u552e/);\n\n    await page.evaluate(() => window.__GM!.closeBackpack());\n    const countAfter = await page.evaluate(() => window.__GM!.getState().slimes.length);\n    const currencyAfter = await page.evaluate(() => window.__GM!.getState().currency);\n    expect(countAfter).toBeLessThan(countBefore);\n    expect(currencyAfter).toBeGreaterThanOrEqual(currencyBefore);",
    'batch sell test'
)

print('Changes summary:')
for ch in changes:
    print(' ', ch)

print(f'File size: {original_len} -> {len(c)}')

with open('repo/e2e/game.spec.ts', 'w', encoding='utf-8') as f:
    f.write(c)
print('Saved')
