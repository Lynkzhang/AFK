const { chromium } = require('playwright');
async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4177/AFK/');
  await page.waitForSelector('.ui-panel', { timeout: 10000 });
  await page.evaluate(() => { window.__GM && window.__GM.skipOnboarding(); window.__GM && window.__GM.setCurrency(500); });
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: '🛒 商店' }).click();
  await page.waitForTimeout(600);
  const body = await page.textContent('body');
  console.log('SHOP BODY (first 500):', body.substring(0, 500));
  const shopItems = await page.evaluate(() => Array.from(document.querySelectorAll('.shop-item, .item-card')).map(el => el.textContent.trim().substring(0, 50)));
  console.log('SHOP ITEMS:', JSON.stringify(shopItems));
  const allButtons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0));
  console.log('ALL BUTTONS IN SHOP:', JSON.stringify(allButtons));
  await page.screenshot({ path: 'workspace/qa_tester/screenshots/debug_shop.png' });
  await browser.close();
}
inspect().catch(console.error);
