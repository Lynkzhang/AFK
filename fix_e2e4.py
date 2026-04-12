"""Fix the double-declaration bug in sell price preview test."""

with open('repo/e2e/game.spec.ts', encoding='utf-8') as f:
    c = f.read()

# Find and fix the mangled sell price test
old = """    const sellText = await page.evaluate(() => {
    // Open backpack and check sell button text
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const sellText = await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      return btn?.textContent ?? '';
    });
    await page.evaluate(() => window.__GM!.closeBackpack());"""

new = """    // Open backpack and check sell button text
    await page.evaluate(() => window.__GM!.openBackpack());
    await page.waitForSelector('.backpack-card', { timeout: 3000 });
    await page.locator('.backpack-card').first().click();
    await page.waitForTimeout(100);
    const sellText = await page.evaluate(() => {
      const btn = document.querySelector('.backpack-detail-sell-btn') as HTMLButtonElement | null;
      return btn?.textContent ?? '';
    });
    await page.evaluate(() => window.__GM!.closeBackpack());"""

if old in c:
    c = c.replace(old, new)
    print('Fixed sell price preview double-declaration')
else:
    print('NOT FOUND - checking content...')
    idx = c.find('    const sellText = await page.evaluate(() => {')
    if idx >= 0:
        print('Found at idx:', idx)
        print('Context:', repr(c[idx:idx+200]))

with open('repo/e2e/game.spec.ts', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
