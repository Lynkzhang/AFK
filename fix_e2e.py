import re

with open('repo/e2e/game.spec.ts', encoding='utf-8') as f:
    c = f.read()

# Fix: remove slime-list check, replace with backpack btn check
old_marker = "'.slime-list'"
if old_marker in c:
    # Find and replace the two-line block
    # Lines look like:
    # "    // Slime list section\n    await expect(page.locator('.slime-list')).toBeVisible();"
    c = c.replace(
        "    // Slime list section\n    await expect(page.locator('.slime-list')).toBeVisible();",
        "    // Backpack button exists in UI (replacing old slime list)\n    await expect(page.locator('.ui-actions button').nth(4)).toBeVisible();"
    )
    print('Fixed slime-list')
else:
    print('slime-list already removed')

# Fix: 'selling a slime' test - open backpack first, use backpack-detail-sell-btn
old_sell_test = """    // The game loop continuously re-renders the slime list, which detaches
    // DOM nodes between frames. We use page.evaluate to click the sell button
    // directly within a single JS tick, avoiding the detachment race.
    await page.evaluate(() => {
      const btn = document.querySelector('.slime-item .slime-actions button:nth-child(2)') as HTMLButtonElement | null;
      btn?.click();
    });"""
new_sell_test = """    // Open backpack, select first slime, sell it
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
    await page.evaluate(() => window.__GM!.closeBackpack());"""
if old_sell_test in c:
    c = c.replace(old_sell_test, new_sell_test)
    print('Fixed selling test')
else:
    print('selling test marker not found, partial check:')
    print('slime-item .slime-actions button:nth-child(2)' in c)

with open('repo/e2e/game.spec.ts', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
