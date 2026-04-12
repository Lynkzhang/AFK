"""Fix orphaned await page.evaluate block in sell toast test."""

with open('repo/e2e/game.spec.ts', encoding='utf-8') as f:
    c = f.read()

# The sell toast test has an orphaned evaluate block
# Need to find and remove it
old = """    await page.evaluate(() => {
    // Sell via backpack
    await page.evaluate(() => window.__GM!.openBackpack());"""

new = """    // Sell via backpack
    await page.evaluate(() => window.__GM!.openBackpack());"""

if old in c:
    c = c.replace(old, new)
    print('Fixed orphaned evaluate block in sell toast test')
else:
    print('MISSING - checking...')
    idx = c.find('await page.evaluate(() => {\n    // Sell via backpack')
    if idx >= 0:
        print('Found at', idx, ':', repr(c[idx:idx+200]))

with open('repo/e2e/game.spec.ts', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
