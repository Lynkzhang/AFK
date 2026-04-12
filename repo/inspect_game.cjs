const { chromium } = require('playwright');
async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4177/AFK/');
  await page.waitForSelector('.ui-panel', { timeout: 10000 });
  await page.evaluate(() => window.__GM && window.__GM.skipOnboarding());
  await page.waitForTimeout(500);
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0));
  console.log('BUTTONS:', JSON.stringify(btns));
  const ls = await page.evaluate(() => { try { return localStorage.getItem('slime-keeper-save') ? 'HAS_DATA' : 'EMPTY'; } catch(e) { return 'ERROR: ' + e.message; } });
  console.log('LocalStorage:', ls);
  await browser.close();
}
inspect().catch(console.error);
