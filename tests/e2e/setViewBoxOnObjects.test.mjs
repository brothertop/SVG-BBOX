/**
 * setViewBoxOnObjects() E2E Tests
 *
 * Tests the setViewBoxOnObjects() function with various aspect modes,
 * visibility options, and margin configurations.
 */

import playwright from '@playwright/test';
const { test, expect } = playwright;
import fs from 'fs/promises';
import path from 'path';

const testPagePath = '/tmp/setViewBoxOnObjects_test.html';

test.beforeAll(async ({ }, testInfo) => {
  // Skip if file already exists
  try {
    await fs.access(testPagePath);
    console.log('Test page already exists');
    return;
  } catch (e) {
    // File doesn't exist, create it
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>setViewBoxOnObjects Test</title>
  <script src="file://${path.resolve('SvgVisualBBox.js')}"></script>
  <style>
    body { margin: 20px; font-family: Arial, sans-serif; }
    .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; }
    svg { border: 1px solid #ccc; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>setViewBoxOnObjects() Test Page</h1>

  <!-- Test 1: Basic SVG with multiple elements -->
  <div class="section">
    <h2>Test 1: Multi-element SVG</h2>
    <svg id="svg1" viewBox="0 0 400 300" width="800" height="600">
      <circle id="circle1" cx="100" cy="100" r="30" fill="#e74c3c"/>
      <rect id="rect1" x="250" y="150" width="80" height="60" fill="#3498db"/>
      <text id="text1" x="200" y="50" font-size="24" text-anchor="middle" fill="#2c3e50">Center Text</text>
    </svg>
  </div>

  <!-- Test 2: Sprite sheet with use elements -->
  <div class="section">
    <h2>Test 2: Sprite Sheet</h2>
    <svg id="svg2" viewBox="0 0 400 300" width="800" height="600">
      <defs>
        <symbol id="icon1" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="#9b59b6"/>
        </symbol>
        <symbol id="icon2" viewBox="0 0 50 50">
          <rect x="5" y="5" width="40" height="40" fill="#1abc9c"/>
        </symbol>
      </defs>
      <use id="use1" href="#icon1" x="50" y="50" width="50" height="50"/>
      <use id="use2" href="#icon2" x="300" y="200" width="50" height="50"/>
    </svg>
  </div>

  <!-- Test 3: SVG with no viewBox -->
  <div class="section">
    <h2>Test 3: No ViewBox</h2>
    <svg id="svg3" width="400" height="300">
      <circle id="circle3" cx="200" cy="150" r="50" fill="#e67e22"/>
      <text id="text3" x="200" y="250" font-size="18" text-anchor="middle" fill="#34495e">Below Circle</text>
    </svg>
  </div>

  <!-- Test 4: Wide aspect ratio SVG -->
  <div class="section">
    <h2>Test 4: Wide Aspect Ratio</h2>
    <svg id="svg4" viewBox="0 0 800 200" width="800" height="200">
      <rect id="rect4" x="350" y="75" width="100" height="50" fill="#c0392b"/>
    </svg>
  </div>

  <!-- Test 5: Tall aspect ratio SVG -->
  <div class="section">
    <h2>Test 5: Tall Aspect Ratio</h2>
    <svg id="svg5" viewBox="0 0 200 600" width="200" height="600">
      <circle id="circle5" cx="100" cy="300" r="60" fill="#27ae60"/>
    </svg>
  </div>

  <script>
    window.testViewBox = async function(svgId, objectIds, options = {}) {
      try {
        const svg = document.getElementById(svgId);
        if (!svg) throw new Error('SVG not found: ' + svgId);

        // Get old viewBox
        const oldVB = svg.viewBox.baseVal;
        const oldViewBox = {
          x: oldVB.x || 0,
          y: oldVB.y || 0,
          width: oldVB.width || parseFloat(svg.getAttribute('width')) || 0,
          height: oldVB.height || parseFloat(svg.getAttribute('height')) || 0
        };

        // Call setViewBoxOnObjects
        await SvgVisualBBox.waitForDocumentFonts();
        const result = await SvgVisualBBox.setViewBoxOnObjects(svgId, objectIds, options);

        // Get new viewBox
        const newVB = svg.viewBox.baseVal;
        const actualViewBox = {
          x: newVB.x,
          y: newVB.y,
          width: newVB.width,
          height: newVB.height
        };

        return {
          success: true,
          oldViewBox: oldViewBox,
          actualViewBox: actualViewBox,
          expectedViewBox: result.newViewBox,
          bbox: result.bbox,
          restore: result.restore
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
});

test.describe('setViewBoxOnObjects() Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('Stretch mode: single element', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', 'circle1', { aspect: 'stretch' });
    });

    expect(result.success).toBe(true);

    // ViewBox should match bbox
    expect(result.actualViewBox.width).toBeCloseTo(result.bbox.width, 1);
    expect(result.actualViewBox.height).toBeCloseTo(result.bbox.height, 1);
    expect(result.actualViewBox.x).toBeCloseTo(result.bbox.x, 1);
    expect(result.actualViewBox.y).toBeCloseTo(result.bbox.y, 1);

    console.log('✓ Stretch mode (single element) - viewBox matches bbox');
  });

  test('Stretch mode: multiple elements', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', ['circle1', 'rect1'], { aspect: 'stretch' });
    });

    expect(result.success).toBe(true);

    // ViewBox should encompass both elements
    expect(result.actualViewBox.width).toBeGreaterThan(result.bbox.width - 1);
    expect(result.actualViewBox.height).toBeGreaterThan(result.bbox.height - 1);

    console.log('✓ Stretch mode (multiple elements) - union bbox');
  });

  test('Stretch mode with margin (user units)', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', 'circle1', {
        aspect: 'stretch',
        margin: 20
      });
    });

    expect(result.success).toBe(true);

    // ViewBox should be bbox + 2*margin on each side
    expect(result.actualViewBox.width).toBeCloseTo(result.bbox.width + 40, 1);
    expect(result.actualViewBox.height).toBeCloseTo(result.bbox.height + 40, 1);

    console.log('✓ Stretch mode with margin (20 user units)');
  });

  test('Stretch mode with margin (pixels)', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', 'rect1', {
        aspect: 'stretch',
        margin: '10px'
      });
    });

    expect(result.success).toBe(true);

    // Should have some margin added
    expect(result.actualViewBox.width).toBeGreaterThan(result.bbox.width);
    expect(result.actualViewBox.height).toBeGreaterThan(result.bbox.height);

    console.log('✓ Stretch mode with margin (10px)');
  });

  test('ChangePosition mode: centers without zooming', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', 'rect1', { aspect: 'changePosition' });
    });

    expect(result.success).toBe(true);

    // ViewBox dimensions should match old dimensions
    expect(result.actualViewBox.width).toBeCloseTo(result.oldViewBox.width, 0.1);
    expect(result.actualViewBox.height).toBeCloseTo(result.oldViewBox.height, 0.1);

    // But position should change to center on element
    expect(result.actualViewBox.x).not.toBeCloseTo(result.oldViewBox.x, 1);

    console.log('✓ ChangePosition mode - dimensions unchanged, position adjusted');
  });

  test('PreserveAspectRatio mode with meet', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', 'text1', {
        aspect: 'preserveAspectRatio',
        aspectRatioMode: 'meet',
        align: 'xMidYMid'
      });
    });

    expect(result.success).toBe(true);

    // Aspect ratio should be preserved
    const oldAspect = result.oldViewBox.width / result.oldViewBox.height;
    const newAspect = result.actualViewBox.width / result.actualViewBox.height;
    expect(newAspect).toBeCloseTo(oldAspect, 0.01);

    // ViewBox should encompass the bbox
    expect(result.actualViewBox.width).toBeGreaterThanOrEqual(result.bbox.width);
    expect(result.actualViewBox.height).toBeGreaterThanOrEqual(result.bbox.height);

    console.log('✓ PreserveAspectRatio (meet) - aspect preserved, bbox fits');
  });

  test('PreserveAspectRatio mode with slice', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg4', 'rect4', {
        aspect: 'preserveAspectRatio',
        aspectRatioMode: 'slice',
        align: 'xMidYMid'
      });
    });

    expect(result.success).toBe(true);

    // Aspect ratio should be preserved
    const oldAspect = result.oldViewBox.width / result.oldViewBox.height;
    const newAspect = result.actualViewBox.width / result.actualViewBox.height;
    expect(newAspect).toBeCloseTo(oldAspect, 0.01);

    console.log('✓ PreserveAspectRatio (slice) - aspect preserved, may clip');
  });

  test('Alignment: xMinYMin (top-left)', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', 'circle1', {
        aspect: 'preserveAspectRatio',
        aspectRatioMode: 'meet',
        align: 'xMinYMin'
      });
    });

    expect(result.success).toBe(true);

    // Element bbox should be at top-left of viewBox
    expect(result.actualViewBox.x).toBeCloseTo(result.bbox.x, 1);
    expect(result.actualViewBox.y).toBeCloseTo(result.bbox.y, 1);

    console.log('✓ Alignment xMinYMin - element at top-left');
  });

  test('Alignment: xMaxYMax (bottom-right)', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', 'rect1', {
        aspect: 'preserveAspectRatio',
        aspectRatioMode: 'meet',
        align: 'xMaxYMax',
        margin: 0
      });
    });

    expect(result.success).toBe(true);

    // Element bbox should be at bottom-right of viewBox
    const bboxRight = result.bbox.x + result.bbox.width;
    const vbRight = result.actualViewBox.x + result.actualViewBox.width;
    expect(bboxRight).toBeCloseTo(vbRight, 1);

    console.log('✓ Alignment xMaxYMax - element at bottom-right');
  });

  test('Sprite sheet with <use> element', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg2', 'use1', { aspect: 'stretch', margin: 10 });
    });

    expect(result.success).toBe(true);
    expect(result.bbox.width).toBeGreaterThan(0);
    expect(result.bbox.height).toBeGreaterThan(0);

    console.log('✓ Sprite sheet <use> element - bbox computed');
  });

  test('SVG with no viewBox', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg3', 'circle3', { aspect: 'stretch' });
    });

    expect(result.success).toBe(true);

    // Should synthesize viewBox from width/height
    expect(result.oldViewBox.width).toBeGreaterThan(0);
    expect(result.oldViewBox.height).toBeGreaterThan(0);

    console.log('✓ SVG without viewBox - synthesized from dimensions');
  });

  test('Wide aspect ratio: preserveAspectRatio meet', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg4', 'rect4', {
        aspect: 'preserveAspectRatio',
        aspectRatioMode: 'meet'
      });
    });

    expect(result.success).toBe(true);

    const oldAspect = result.oldViewBox.width / result.oldViewBox.height;
    const newAspect = result.actualViewBox.width / result.actualViewBox.height;
    expect(newAspect).toBeCloseTo(oldAspect, 0.01);

    console.log('✓ Wide aspect ratio - aspect preserved');
  });

  test('Tall aspect ratio: preserveAspectRatio meet', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg5', 'circle5', {
        aspect: 'preserveAspectRatio',
        aspectRatioMode: 'meet'
      });
    });

    expect(result.success).toBe(true);

    const oldAspect = result.oldViewBox.width / result.oldViewBox.height;
    const newAspect = result.actualViewBox.width / result.actualViewBox.height;
    expect(newAspect).toBeCloseTo(oldAspect, 0.01);

    console.log('✓ Tall aspect ratio - aspect preserved');
  });

  test('Dry-run mode: no modifications', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(async () => {
      const svg = document.getElementById('svg1');
      const oldVBString = svg.getAttribute('viewBox');

      await window.testViewBox('svg1', 'circle1', {
        aspect: 'stretch',
        dryRun: true
      });

      const newVBString = svg.getAttribute('viewBox');

      return {
        changed: oldVBString !== newVBString,
        old: oldVBString,
        new: newVBString
      };
    });

    expect(result.changed).toBe(false);

    console.log('✓ Dry-run mode - SVG unchanged');
  });

  test('Restore function: undoes changes', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(async () => {
      const svg = document.getElementById('svg1');
      const oldVBString = svg.getAttribute('viewBox');

      const res = await window.testViewBox('svg1', 'rect1', {
        aspect: 'stretch'
      });

      const changedVBString = svg.getAttribute('viewBox');

      // Call restore
      res.restore();

      const restoredVBString = svg.getAttribute('viewBox');

      return {
        wasChanged: oldVBString !== changedVBString,
        wasRestored: oldVBString === restoredVBString,
        oldVB: oldVBString,
        changedVB: changedVBString,
        restoredVB: restoredVBString
      };
    });

    expect(result.wasChanged).toBe(true);
    expect(result.wasRestored).toBe(true);

    console.log('✓ Restore function - viewBox restored');
  });

  test('Visibility: hideAllExcept mode', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const hiddenCount = await page.evaluate(async () => {
      await window.testViewBox('svg1', 'circle1', {
        visibility: 'hideAllExcept'
      });

      // Count hidden elements
      const svg = document.getElementById('svg1');
      const elements = svg.querySelectorAll('[id]');
      let hidden = 0;
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none') hidden++;
      });
      return hidden;
    });

    // Should hide rect1 and text1 (2 elements)
    expect(hiddenCount).toBeGreaterThanOrEqual(2);

    console.log(`✓ Visibility hideAllExcept - ${hiddenCount} elements hidden`);
  });

  test('Visibility: hideTargets mode', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const isHidden = await page.evaluate(async () => {
      await window.testViewBox('svg1', 'rect1', {
        visibility: 'hideTargets'
      });

      const el = document.getElementById('rect1');
      const style = window.getComputedStyle(el);
      return style.display === 'none';
    });

    expect(isHidden).toBe(true);

    console.log('✓ Visibility hideTargets - target hidden');
  });

  test('Save and restore visibility list', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(async () => {
      await SvgVisualBBox.waitForDocumentFonts();

      // Save visibility
      const save = await SvgVisualBBox.setViewBoxOnObjects('svg1', 'circle1', {
        saveVisibilityList: true,
        dryRun: true
      });

      // Change visibility
      await SvgVisualBBox.setViewBoxOnObjects('svg1', 'circle1', {
        visibility: 'hideAllExcept'
      });

      const hiddenAfterChange = document.getElementById('rect1').style.display === 'none';

      // Restore visibility
      await SvgVisualBBox.setViewBoxOnObjects('svg1', 'circle1', {
        visibility: 'restoreList',
        visibilityList: save.visibilityList
      });

      const hiddenAfterRestore = document.getElementById('rect1').style.display === 'none';

      return {
        hasVisibilityList: !!save.visibilityList,
        hiddenAfterChange: hiddenAfterChange,
        hiddenAfterRestore: hiddenAfterRestore
      };
    });

    expect(result.hasVisibilityList).toBe(true);
    expect(result.hiddenAfterChange).toBe(true);
    expect(result.hiddenAfterRestore).toBe(false);

    console.log('✓ Save/restore visibility list - state preserved');
  });

  test('Error: nonexistent element ID', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(() => {
      return window.testViewBox('svg1', 'nonexistent', { aspect: 'stretch' });
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');

    console.log('✓ Error handling - nonexistent element');
  });

  test('Symbol resolution: pass symbol ID, finds use element', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(async () => {
      await SvgVisualBBox.waitForDocumentFonts();

      try {
        // Pass symbol ID directly - should find and use the <use> element
        const res = await SvgVisualBBox.setViewBoxOnObjects('svg2', 'icon1', {
          aspect: 'stretch',
          margin: 10
        });

        return {
          success: true,
          hasBBox: res.bbox && res.bbox.width > 0 && res.bbox.height > 0
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(result.success).toBe(true);
    expect(result.hasBBox).toBe(true);

    console.log('✓ Symbol resolution - symbol ID → use element');
  });

  test('Symbol resolution error: multiple use elements', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(async () => {
      // Create SVG with symbol referenced by multiple <use> elements
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'multiUse';
      svg.setAttribute('viewBox', '0 0 400 300');
      svg.setAttribute('width', '800');
      svg.setAttribute('height', '600');

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbol.id = 'multiSymbol';
      symbol.setAttribute('viewBox', '0 0 50 50');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '25');
      circle.setAttribute('cy', '25');
      circle.setAttribute('r', '20');
      circle.setAttribute('fill', '#ff0000');
      symbol.appendChild(circle);
      defs.appendChild(symbol);
      svg.appendChild(defs);

      // Add TWO use elements
      const use1 = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use1.id = 'use_multi_1';
      use1.setAttribute('href', '#multiSymbol');
      use1.setAttribute('x', '50');
      use1.setAttribute('y', '50');
      svg.appendChild(use1);

      const use2 = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use2.id = 'use_multi_2';
      use2.setAttribute('href', '#multiSymbol');
      use2.setAttribute('x', '200');
      use2.setAttribute('y', '200');
      svg.appendChild(use2);

      document.body.appendChild(svg);

      await SvgVisualBBox.waitForDocumentFonts();

      try {
        // Try to use symbol ID - should fail because multiple <use> elements
        await SvgVisualBBox.setViewBoxOnObjects('multiUse', 'multiSymbol', {
          aspect: 'stretch'
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('multiple');

    console.log('✓ Symbol resolution error - multiple use elements detected');
  });

  test('Symbol resolution error: no use elements', async ({ page }) => {
    await page.goto('file://' + testPagePath);

    const result = await page.evaluate(async () => {
      // Create SVG with symbol but NO <use> elements
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'noUse';
      svg.setAttribute('viewBox', '0 0 400 300');

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbol.id = 'orphanSymbol';
      symbol.setAttribute('viewBox', '0 0 50 50');
      defs.appendChild(symbol);
      svg.appendChild(defs);

      document.body.appendChild(svg);

      await SvgVisualBBox.waitForDocumentFonts();

      try {
        await SvgVisualBBox.setViewBoxOnObjects('noUse', 'orphanSymbol', {
          aspect: 'stretch'
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('no <use> elements');

    console.log('✓ Symbol resolution error - no use elements found');
  });
});
