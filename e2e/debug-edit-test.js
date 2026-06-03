import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', (msg) => console.log('PAGE:', msg.text()));

  await page.goto('http://127.0.0.1:5173/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Initialize Session")');
  await page.waitForURL('**/terminal');

  await page.click('button:has-text("New Trade")');
  await page.getByLabel('Asset').fill('TRADE-EDIT-TEST/USDT');
  await page.getByLabel('Entry Price').fill('0.5');
  await page.getByLabel('Exit Price').fill('0.6');
  await page.click('button:has-text("Create")');
  await page.waitForSelector('tbody tr:has-text("TRADE-EDIT-TEST/USDT")');

  const rowsBefore = await page.locator('tbody tr').allTextContents();
  console.log('rowsBefore', rowsBefore);

  const tradeRow = page.locator('tbody tr', { hasText: 'TRADE-EDIT-TEST/USDT' }).first();
  await tradeRow.locator('[title="Edit"]').click();
  await page.waitForSelector('button:has-text("Update")');

  const assetValue = await page.getByLabel('Asset').inputValue();
  console.log('assetValueBefore', assetValue);

  await page.getByLabel('Asset').fill('TRADE-EDIT-TEST/USDT-UPDATED');
  await page.click('button:has-text("Update")');
  await page.waitForTimeout(1000);

  const rowsAfter = await page.locator('tbody tr').allTextContents();
  console.log('rowsAfter', rowsAfter);

  const count = await page.locator('tbody tr', { hasText: 'TRADE-EDIT-TEST/USDT-UPDATED' }).count();
  console.log('updatedCount', count);
  if (count > 0) {
    const text = await page.locator('tbody tr', { hasText: 'TRADE-EDIT-TEST/USDT-UPDATED' }).first().innerText();
    console.log('updatedText', text);
  }

  const tradesStorage = await page.evaluate(() => localStorage.getItem('trade_dashboard_trades'));
  console.log('localStorage trades:', tradesStorage);

  await browser.close();
})();
