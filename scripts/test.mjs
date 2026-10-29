import { chromium } from 'playwright-core';
import fs from 'node:fs';

fs.mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/microsoft-edge',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-crash-reporter', '--disable-breakpad'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
const badResponses = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) badResponses.push(r.status() + ' ' + r.url()); });

const result = {};
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
await page.screenshot({ path: 'screenshots/editor-1920.png' });
result.initialNodes = await page.locator('.node').count();
result.chartCanvases = await page.locator('canvas').count();

// add text from palette
await page.locator('.palette-item', { hasText: '文本' }).first().click();
await page.waitForTimeout(300);
result.afterAdd = await page.locator('.node').count();
result.selectedHandles = await page.locator('.handle').count();

const node = page.locator('.node').last();
const before = await node.evaluate((el) => ({
  left: parseFloat(el.style.left),
  top: parseFloat(el.style.top),
  w: parseFloat(el.style.width),
}));
const box = await node.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 45, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(200);
const afterMove = await node.evaluate((el) => ({ left: parseFloat(el.style.left), top: parseFloat(el.style.top) }));
result.dragDelta = { dx: Math.round(afterMove.left - before.left), dy: Math.round(afterMove.top - before.top) };

const handle = page.locator('.handle-se');
const hb = await handle.boundingBox();
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await page.mouse.down();
await page.mouse.move(hb.x + hb.width / 2 + 60, hb.y + hb.height / 2 + 40, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(200);
result.resizeWidth = Math.round(await node.evaluate((el) => parseFloat(el.style.width)));
result.beforeWidth = Math.round(before.w);

await page.keyboard.press('Control+z');
await page.waitForTimeout(200);
result.afterUndoResizeWidth = Math.round(await node.evaluate((el) => parseFloat(el.style.width)));
await page.keyboard.press('Control+z');
await page.waitForTimeout(300);
result.afterUndoAdd = await page.locator('.node').count();

// add again and delete
await page.locator('.palette-item', { hasText: '文本' }).first().click();
await page.waitForTimeout(200);
await page.keyboard.press('Delete');
await page.waitForTimeout(200);
result.afterDelete = await page.locator('.node').count();

// select chart through layers panel
await page.locator('.layer-row', { hasText: '图表 · 流量趋势' }).click();
await page.waitForTimeout(300);
result.inspectorTitle = (await page.locator('.inspector .node-name').inputValue().catch(() => null));
result.chartFields = await page.locator('.inspector-section').count();
await page.screenshot({ path: 'screenshots/editor-selected.png' });

// preview
await page.locator('.preview-btn').click();
await page.waitForTimeout(1800);
result.playerVisible = await page.locator('.player').count();
await page.screenshot({ path: 'screenshots/preview-1920.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
result.playerAfterEsc = await page.locator('.player').count();

result.errors = errors;
result.badResponses = badResponses;
console.log(JSON.stringify(result, null, 2));
await browser.close();
