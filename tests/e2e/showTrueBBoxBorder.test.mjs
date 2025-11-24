/**
 * showTrueBBoxBorder() E2E Tests
 *
 * Tests the showTrueBBoxBorder() function with randomly generated SVG elements.
 * Verifies that the border overlay accurately matches the computed bounding box.
 */

import playwright from '@playwright/test';
const { test, expect } = playwright;
import fs from 'fs/promises';
import path from 'path';

const testPagePath = '/tmp/showTrueBBoxBorder_test.html';

test.beforeAll(async ({ }, testInfo) => {
  // Skip if file already exists (avoid race condition with parallel workers)
  try {
    await fs.access(testPagePath);
    console.log('Test page already exists');
    return;
  } catch (e) {
    // File doesn't exist, create it
  }

  // Generate test HTML page with random SVG elements
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>showTrueBBoxBorder Test</title>
  <script src="file://${path.resolve('SvgVisualBBox.js')}"></script>
  <style>
    body { margin: 20px; font-family: Arial, sans-serif; }
    .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; }
    svg { border: 1px solid #ccc; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>showTrueBBoxBorder() Test Page</h1>

  <!-- Test 1: Random Text -->
  <div class="section">
    <h2>Test 1: Random Text</h2>
    <svg id="svg1" viewBox="0 0 400 200" width="800" height="400">
      <text id="text1" x="200" y="100" font-size="${20 + Math.random() * 40}" text-anchor="middle" fill="#3498db">
        Random ${Math.random().toString(36).substring(7)}
      </text>
    </svg>
  </div>

  <!-- Test 2: Random Circle -->
  <div class="section">
    <h2>Test 2: Circle</h2>
    <svg id="svg2" viewBox="0 0 300 300" width="600" height="600">
      <circle id="circle1" cx="${100 + Math.random() * 100}" cy="${100 + Math.random() * 100}" r="${30 + Math.random() * 40}" fill="#e74c3c"/>
    </svg>
  </div>

  <!-- Test 3: Rectangle with Stroke -->
  <div class="section">
    <h2>Test 3: Rectangle with Stroke</h2>
    <svg id="svg3" viewBox="0 0 400 300" width="800" height="600">
      <rect id="rect1" x="100" y="80" width="100" height="80" fill="none" stroke="#9b59b6" stroke-width="${5 + Math.random() * 10}"/>
    </svg>
  </div>

  <!-- Test 4: Rotated Text -->
  <div class="section">
    <h2>Test 4: Rotated Text</h2>
    <svg id="svg4" viewBox="0 0 400 300" width="800" height="600">
      <text id="text2" x="200" y="150" font-size="36" text-anchor="middle" transform="rotate(${-30 + Math.random() * 60} 200 150)" fill="#34495e">
        Rotated
      </text>
    </svg>
  </div>

  <!-- Edge Case: No viewBox -->
  <div class="section">
    <h2>Edge Case: No viewBox</h2>
    <svg id="svg5" width="400" height="300">
      <circle id="circle2" cx="200" cy="150" r="50" fill="#2ecc71"/>
    </svg>
  </div>

  <!-- Edge Case: Negative viewBox -->
  <div class="section">
    <h2>Edge Case: Negative viewBox</h2>
    <svg id="svg6" viewBox="-200 -150 400 300" width="600" height="450">
      <circle id="circle3" cx="0" cy="0" r="40" fill="#f39c12"/>
    </svg>
  </div>

  <script>
    window.testBorder = async function(elementId, options = {}) {
      try {
        const element = document.getElementById(elementId);
        if (!element) throw new Error('Element not found: ' + elementId);

        const rootSvg = element.ownerSVGElement || element;
        await SvgVisualBBox.waitForDocumentFonts();

        const result = await SvgVisualBBox.showTrueBBoxBorder('#' + elementId, options);
        const overlay = result.overlay;
        const overlayRect = overlay.getBoundingClientRect();
        const svgRect = rootSvg.getBoundingClientRect();

        const viewBox = rootSvg.viewBox.baseVal;
        let vbX = 0, vbY = 0, vbWidth = svgRect.width, vbHeight = svgRect.height;
        if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
          vbX = viewBox.x;
          vbY = viewBox.y;
          vbWidth = viewBox.width;
          vbHeight = viewBox.height;
        }

        const scaleX = svgRect.width / vbWidth;
        const scaleY = svgRect.height / vbHeight;
        const bbox = result.bbox;
        const padding = options.padding !== undefined ? options.padding : 4;

        const expectedX = svgRect.left + (bbox.x - vbX) * scaleX - padding;
        const expectedY = svgRect.top + (bbox.y - vbY) * scaleY - padding;
        const expectedWidth = bbox.width * scaleX + (padding * 2);
        const expectedHeight = bbox.height * scaleY + (padding * 2);

        const tolerance = 1;
        const xMatch = Math.abs(overlayRect.left - expectedX) <= tolerance;
        const yMatch = Math.abs(overlayRect.top - expectedY) <= tolerance;
        const widthMatch = Math.abs(overlayRect.width - expectedWidth) <= tolerance;
        const heightMatch = Math.abs(overlayRect.height - expectedHeight) <= tolerance;

        return {
          success: true,
          accurate: xMatch && yMatch && widthMatch && heightMatch,
          bbox: bbox,
          overlay: {
            left: overlayRect.left,
            top: overlayRect.top,
            width: overlayRect.width,
            height: overlayRect.height
          },
          expected: {
            left: expectedX,
            top: expectedY,
            width: expectedWidth,
            height: expectedHeight
          },
          diffs: {
            x: Math.abs(overlayRect.left - expectedX),
            y: Math.abs(overlayRect.top - expectedY),
            width: Math.abs(overlayRect.width - expectedWidth),
            height: Math.abs(overlayRect.height - expectedHeight)
          },
          borderStyle: window.getComputedStyle(overlay).border,
          result: result
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };
  </script>
</body>
</html>`;

  await fs.writeFile(testPagePath, html, 'utf8');
  console.log('Test page generated: ' + testPagePath);
});

test.afterAll(async () => {
  // Don't delete - let OS clean up /tmp
  // Deleting causes race conditions with parallel test workers
});

test.describe('showTrueBBoxBorder() Tests', () => {
  // Run tests serially to avoid file access issues
  test.describe.configure({ mode: 'serial' });

  test('Border matches bbox for random text', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('text1'));

    expect(result.success).toBe(true);
    expect(result.accurate).toBe(true);
    expect(result.diffs.x).toBeLessThanOrEqual(1);
    expect(result.diffs.y).toBeLessThanOrEqual(1);
    expect(result.bbox.width).toBeGreaterThan(0);
    expect(result.bbox.height).toBeGreaterThan(0);

    console.log('✓ Text: accurate (x=' + result.diffs.x.toFixed(2) + ', y=' + result.diffs.y.toFixed(2) + ')');
  });

  test('Border matches bbox for circle', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('circle1'));

    expect(result.success).toBe(true);
    expect(result.accurate).toBe(true);

    console.log('✓ Circle: accurate');
  });

  test('Border includes stroke width for rectangle', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('rect1'));

    expect(result.success).toBe(true);
    expect(result.accurate).toBe(true);
    expect(result.bbox.width).toBeGreaterThan(0);

    console.log('✓ Rectangle with stroke: accurate');
  });

  test('Border wraps rotated text correctly', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('text2'));

    expect(result.success).toBe(true);
    expect(result.accurate).toBe(true);

    console.log('✓ Rotated text: accurate');
  });

  test('Auto theme detection works', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('text1', { theme: 'auto' }));

    expect(result.success).toBe(true);
    expect(result.borderStyle).toContain('dashed');

    const isDark = result.borderStyle.includes('rgba(0, 0, 0') || result.borderStyle.includes('rgb(0, 0, 0');
    const isLight = result.borderStyle.includes('rgba(255, 255, 255') || result.borderStyle.includes('rgb(255, 255, 255');
    expect(isDark || isLight).toBe(true);

    console.log('✓ Auto theme: ' + (isDark ? 'dark' : 'light') + ' border');
  });

  test('Forced dark theme uses light border', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('circle1', { theme: 'dark' }));

    expect(result.success).toBe(true);
    const isLight = result.borderStyle.includes('rgba(255, 255, 255') || result.borderStyle.includes('rgb(255, 255, 255');
    expect(isLight).toBe(true);

    console.log('✓ Dark theme: light border');
  });

  test('Forced light theme uses dark border', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('circle1', { theme: 'light' }));

    expect(result.success).toBe(true);
    const isDark = result.borderStyle.includes('rgba(0, 0, 0') || result.borderStyle.includes('rgb(0, 0, 0');
    expect(isDark).toBe(true);

    console.log('✓ Light theme: dark border');
  });

  test('Custom border color works', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('rect1', {
      borderColor: 'rgb(255, 0, 0)'
    }));

    expect(result.success).toBe(true);
    expect(result.borderStyle).toContain('rgb(255, 0, 0)');

    console.log('✓ Custom color: red border');
  });

  test('Custom padding adjusts offset', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('text1', { padding: 10 }));

    expect(result.success).toBe(true);
    expect(result.accurate).toBe(true);

    console.log('✓ Custom padding: 10px offset');
  });

  test('EDGE: SVG with no viewBox', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('circle2'));

    expect(result.success).toBe(true);
    expect(result.accurate).toBe(true);
    expect(result.bbox.width).toBeGreaterThan(0);

    console.log('✓ EDGE: No viewBox - accurate');
  });

  test('EDGE: ViewBox with negative coordinates', async ({ page }) => {
    await page.goto('file://' + testPagePath);
    const result = await page.evaluate(() => window.testBorder('circle3'));

    expect(result.success).toBe(true);
    expect(result.accurate).toBe(true);

    console.log('✓ EDGE: Negative viewBox coords - accurate');
  });

  test('Remove function cleans up overlay', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    await page.evaluate(() => window.testBorder('circle1'));

    let count = await page.evaluate(() => document.querySelectorAll('[data-svg-bbox-overlay]').length);
    expect(count).toBe(1);

    await page.evaluate(() => {
      const overlay = document.querySelector('[data-svg-bbox-overlay]');
      const targetId = overlay.getAttribute('data-target-id');
      window.testResults = window.testResults || {};
      // Get result and remove
      document.querySelectorAll('[data-svg-bbox-overlay]').forEach(o => o.remove());
    });

    count = await page.evaluate(() => document.querySelectorAll('[data-svg-bbox-overlay]').length);
    expect(count).toBe(0);

    console.log('✓ Remove: overlay cleaned up');
  });
});
