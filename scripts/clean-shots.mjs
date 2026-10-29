import { chromium } from 'playwright-core';
import fs from 'node:fs';

fs.mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/microsoft-edge',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-crash-reporter', '--disable-breakpad'],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const result = { initialNodes: await page.locator('.node').count() };
await page.screenshot({ path: 'screenshots/editor-1920.png' });

// export JSON
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('.toolbar .ghost-btn', { hasText: '导出' }).click(),
]);
const exportPath = 'screenshots/export-test.json';
await download.saveAs(exportPath);
const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
result.exportedNodes = Object.keys(exported.nodes).length;
result.exportedName = exported.name;
fs.unlinkSync(exportPath);

// preview at 1:1
await page.locator('.preview-btn').click();
await page.waitForTimeout(2200);
result.playerVisible = await page.locator('.player').count();
await page.screenshot({ path: 'screenshots/preview.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// selected state
await page.locator('.layer-row', { hasText: '图表 · 流量趋势' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/editor-selected.png' });

// persistence
await page.locator('.palette-item', { hasText: '文本' }).first().click();
await page.waitForTimeout(1000);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
result.afterReload = await page.locator('.node').count();
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
result.afterClear = await page.locator('.node').count();
result.errors = errors;
console.log(JSON.stringify(result, null, 2));
await browser.close();
