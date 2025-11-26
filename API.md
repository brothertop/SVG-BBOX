# SvgVisualBBox.js - Browser API Documentation

Complete API reference for using `SvgVisualBBox.js` in web browsers.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Functions](#core-functions)
  - [waitForDocumentFonts()](#waitfordocumentfonts)
  - [getSvgElementVisualBBoxTwoPassAggressive()](#getsvgelementvisualbboxtwopassaggressive)
  - [getSvgElementVisibleAndFullBBoxes()](#getsvgelementvisibleandfullbboxes)
  - [showTrueBBoxBorder()](#showtruebboxborder)
  - [setViewBoxOnObjects()](#setviewboxonobjects)
- [Options Reference](#options-reference)
- [Return Types](#return-types)
- [Error Handling](#error-handling)
- [Performance Tips](#performance-tips)
- [Examples](#examples)

---

## Installation

### Via CDN (Recommended for Browser)

```html
<!-- Via unpkg (Recommended) -->
<script src="https://unpkg.com/svg-bbox@latest/SvgVisualBBox.min.js"></script>

<!-- Via jsdelivr -->
<script src="https://cdn.jsdelivr.net/npm/svg-bbox@latest/SvgVisualBBox.min.js"></script>
```

### Via npm

```bash
npm install svg-bbox
```

Then in your HTML:

```html
<script src="./node_modules/svg-bbox/SvgVisualBBox.js"></script>
```

---

## Quick Start

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://unpkg.com/svg-bbox@latest/SvgVisualBBox.min.js"></script>
  </head>
  <body>
    <svg id="mySvg" viewBox="0 0 200 100" width="400">
      <text
        id="greeting"
        x="100"
        y="50"
        text-anchor="middle"
        font-size="24"
        fill="black"
      >
        Hello SVG!
      </text>
    </svg>

    <script>
      (async () => {
        // Wait for fonts to load
        await SvgVisualBBox.waitForDocumentFonts();

        // Get accurate bounding box
        const bbox =
          await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(
            '#greeting'
          );
        console.log('BBox:', bbox);
        // Output: {x: 45.2, y: 32.1, width: 109.6, height: 25.8}

        // Show visual debugging border
        const border = await SvgVisualBBox.showTrueBBoxBorder('#greeting');

        // Remove border after 3 seconds
        setTimeout(() => border.remove(), 3000);
      })();
    </script>
  </body>
</html>
```

---

## Core Functions

### `waitForDocumentFonts()`

Waits for all web fonts in the document to finish loading before measuring text.

#### Syntax

```javascript
await SvgVisualBBox.waitForDocumentFonts(document, timeoutMs);
```

#### Parameters

- **`document`** _(Document)_ - The document object. Default: `window.document`
- **`timeoutMs`** _(number)_ - Maximum time to wait in milliseconds. Default:
  `8000`

#### Returns

- **`Promise<void>`** - Resolves when fonts are ready or timeout is reached

#### Example

```javascript
// Wait for fonts with default 8-second timeout
await SvgVisualBBox.waitForDocumentFonts();

// Wait with custom timeout
await SvgVisualBBox.waitForDocumentFonts(document, 5000);
```

#### Why This Matters

Text bounding boxes depend on loaded fonts. If you measure before fonts load,
you'll get incorrect results. Always call this before measuring text elements.

---

### `getSvgElementVisualBBoxTwoPassAggressive()`

Computes the **visual** bounding box for an SVG element, including stroke width,
filters, shadows, and all visual effects.

#### Syntax

```javascript
const bbox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(
  element,
  options
);
```

#### Parameters

- **`element`** _(string | Element)_ - CSS selector string or DOM element
- **`options`** _(Object)_ - Configuration options (see
  [Options Reference](#options-reference))

#### Returns

- **`Promise<BBox | null>`** - Bounding box object or `null` if element is
  invisible

#### BBox Object

```typescript
{
  x: number,        // Left edge in SVG user units
  y: number,        // Top edge in SVG user units
  width: number,    // Width in SVG user units
  height: number    // Height in SVG user units
}
```

#### Example

```javascript
// Basic usage
const bbox =
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive('#myElement');

// With options
const bbox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(
  document.getElementById('myPath'),
  {
    mode: 'unclipped', // Ignore viewBox clipping
    coarseFactor: 3, // Faster coarse pass
    fineFactor: 24, // More accurate fine pass
    useLayoutScale: true // Use element's actual rendered size
  }
);
```

#### Common Use Cases

**Measure text with custom fonts:**

```javascript
await SvgVisualBBox.waitForDocumentFonts();
const textBBox =
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive('#myText');
```

**Measure element with filters:**

```javascript
const blurredBBox =
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(
    '#blurredElement'
  );
// Includes filter effects like blur, shadow, glow
```

**Measure transformed element:**

```javascript
const rotatedBBox =
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(
    '#rotatedElement'
  );
// Accounts for rotation, scale, translate
```

---

### `getSvgElementVisibleAndFullBBoxes()`

Computes **two** bounding boxes:

1. **visible** - Content inside the current viewBox (respects clipping)
2. **full** - Entire drawing extent (ignores viewBox clipping)

#### Syntax

```javascript
const result = await SvgVisualBBox.getSvgElementVisibleAndFullBBoxes(
  svgElement,
  options
);
```

#### Parameters

- **`svgElement`** _(Element)_ - The `<svg>` element (must be an Element, not a
  selector)
- **`options`** _(Object)_ - Configuration options

#### Returns

```typescript
{
  visible: BBox | null,  // What's visible inside viewBox
  full: BBox | null      // Complete drawing extent
}
```

#### Example

```javascript
const svg = document.getElementById('mySvg');
const boxes = await SvgVisualBBox.getSvgElementVisibleAndFullBBoxes(svg);

console.log('Visible area:', boxes.visible);
// {x: 0, y: 0, width: 200, height: 100}

console.log('Full drawing:', boxes.full);
// {x: -50, y: -20, width: 300, height: 140}
```

#### Use Cases

**Fix missing viewBox:**

```javascript
const { full } = await SvgVisualBBox.getSvgElementVisibleAndFullBBoxes(svg);
if (full) {
  svg.setAttribute(
    'viewBox',
    `${full.x} ${full.y} ${full.width} ${full.height}`
  );
}
```

**Decide render mode:**

```javascript
const { visible, full } =
  await SvgVisualBBox.getSvgElementVisibleAndFullBBoxes(svg);

if (visible && full) {
  const hasContentOutsideViewBox =
    full.width > visible.width || full.height > visible.height;

  if (hasContentOutsideViewBox) {
    console.log('⚠️ Some content is clipped by viewBox');
  }
}
```

---

### `showTrueBBoxBorder()`

Displays a **visual debugging border** around an element's true bounding box.
Perfect for debugging layout issues or verifying measurements.

#### Syntax

```javascript
const result = await SvgVisualBBox.showTrueBBoxBorder(selector, options);
```

#### Parameters

- **`selector`** _(string)_ - CSS selector for the target element
- **`options`** _(Object)_ - Border styling options

#### Options

```typescript
{
  theme: 'light' | 'dark' | 'auto',  // Color theme (default: 'auto')
  borderColor: string,                // Custom border color (CSS color)
  borderWidth: string,                // Border width (default: '2px')
  borderStyle: string,                // Border style (default: 'dashed')
  padding: number,                    // Extra padding in SVG units
  opacity: number                     // Border opacity 0-1 (default: 1)
}
```

#### Returns

```typescript
{
  remove: () => void,    // Function to remove the border
  element: HTMLElement   // The border overlay element
}
```

#### Example

**Auto-detected theme:**

```javascript
const result = await SvgVisualBBox.showTrueBBoxBorder('#myText');
// Auto-detects system dark/light mode

// Remove after 5 seconds
setTimeout(() => result.remove(), 5000);
```

**Force dark theme:**

```javascript
const result = await SvgVisualBBox.showTrueBBoxBorder('#myElement', {
  theme: 'dark' // Force dark border for light backgrounds
});
```

**Custom styling:**

```javascript
const result = await SvgVisualBBox.showTrueBBoxBorder('#myPath', {
  borderColor: 'red',
  borderWidth: '3px',
  borderStyle: 'solid',
  padding: 5,
  opacity: 0.8
});
```

**Debugging multiple elements:**

```javascript
const borders = [];
for (const id of ['elem1', 'elem2', 'elem3']) {
  const border = await SvgVisualBBox.showTrueBBoxBorder(`#${id}`, {
    theme: 'dark'
  });
  borders.push(border);
}

// Remove all borders
borders.forEach((b) => b.remove());
```

#### Features

- ✅ Auto-detects system dark/light theme
- ✅ Works with inline SVG, `<object>`, `<iframe>`, sprites
- ✅ Non-intrusive overlay (doesn't modify SVG)
- ✅ Follows SVG on scroll/resize
- ✅ Easy cleanup with `remove()`

---

### `setViewBoxOnObjects()`

Reframes the SVG's viewBox to focus on specific objects, with options for aspect
ratio and margins.

#### Syntax

```javascript
await SvgVisualBBox.setViewBoxOnObjects(svgElement, objectIds, options);
```

#### Parameters

- **`svgElement`** _(string | Element)_ - SVG element or selector
- **`objectIds`** _(string | string[])_ - Object ID(s) to focus on
- **`options`** _(Object)_ - Reframing options

#### Options

```typescript
{
  aspect: 'stretch' | 'meet' | 'slice',  // How to fit objects
  margin: string | number,                 // Margin around objects ('10px' or 10)
  animate: boolean                         // Smooth transition (default: false)
}
```

#### Example

**Focus on a single element:**

```javascript
await SvgVisualBBox.setViewBoxOnObjects('svg', 'importantElement', {
  aspect: 'meet',
  margin: '10px'
});
```

**Focus on multiple elements:**

```javascript
await SvgVisualBBox.setViewBoxOnObjects('svg', ['elem1', 'elem2', 'elem3'], {
  aspect: 'stretch',
  margin: 20
});
```

**Smooth animated transition:**

```javascript
await SvgVisualBBox.setViewBoxOnObjects('#mySvg', 'targetElement', {
  aspect: 'meet',
  margin: '15px',
  animate: true
});
```

---

## Options Reference

### Mode Options

- **`'unclipped'`** - Measure entire element, ignoring viewBox clipping
- **`'clipped'`** - Only measure what's visible inside viewBox

### Sampling Precision

- **`coarseFactor`** _(number)_ - Pixels per SVG unit for initial pass. Default:
  `3`
  - Lower = faster but less accurate
  - Higher = slower but more precise
- **`fineFactor`** _(number)_ - Pixels per SVG unit for refinement. Default:
  `24`
  - Used to refine edges found in coarse pass

### Layout Options

- **`useLayoutScale`** _(boolean)_ - Use element's actual rendered size.
  Default: `true`
  - `true`: Respects CSS transforms and layout
  - `false`: Uses only SVG coordinate system

---

## Return Types

### BBox

```typescript
interface BBox {
  x: number; // Left edge in SVG user units
  y: number; // Top edge in SVG user units
  width: number; // Width in SVG user units
  height: number; // Height in SVG user units
}
```

### BorderResult

```typescript
interface BorderResult {
  remove: () => void; // Removes the border overlay
  element: HTMLElement; // The overlay DOM element
}
```

---

## Error Handling

All async functions may reject with errors. Always use try-catch:

```javascript
try {
  const bbox =
    await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive('#myElement');
  if (bbox) {
    console.log('BBox:', bbox);
  } else {
    console.log('Element is invisible or fully clipped');
  }
} catch (error) {
  console.error('Failed to compute bbox:', error);
}
```

### Common Errors

**Element not found:**

```javascript
// ❌ Throws error if element doesn't exist
await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive('#nonexistent');

// ✅ Check element exists first
const element = document.querySelector('#myElement');
if (element) {
  const bbox =
    await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element);
}
```

**Font not loaded:**

```javascript
// ❌ May give wrong bbox if fonts not loaded
const bbox =
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive('#textElement');

// ✅ Always wait for fonts first
await SvgVisualBBox.waitForDocumentFonts();
const bbox =
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive('#textElement');
```

---

## Performance Tips

### 1. Reuse Elements

Don't query the DOM repeatedly:

```javascript
// ❌ Slow - queries DOM multiple times
for (let i = 0; i < 100; i++) {
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive('#myElement');
}

// ✅ Fast - query once, reuse element
const element = document.getElementById('myElement');
for (let i = 0; i < 100; i++) {
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element);
}
```

### 2. Adjust Sampling for Speed

For faster (but less accurate) measurements:

```javascript
const fastBBox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(
  '#myElement',
  {
    coarseFactor: 2, // Lower = faster
    fineFactor: 12 // Lower = faster
  }
);
```

### 3. Batch Font Loading

Wait for fonts once, not per element:

```javascript
// ✅ Wait once
await SvgVisualBBox.waitForDocumentFonts();

// Then measure all text elements
const bboxes = await Promise.all(
  ['text1', 'text2', 'text3'].map((id) =>
    SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(`#${id}`)
  )
);
```

### 4. Use `mode: 'clipped'` When Appropriate

If you only care about visible content:

```javascript
const visibleBBox =
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive('#myElement', {
    mode: 'clipped' // Faster, ignores content outside viewBox
  });
```

---

## Examples

### Example 1: Measure Text with Custom Font

```html
<svg viewBox="0 0 400 100">
  <text id="fancyText" x="200" y="50" font-family="CustomFont" font-size="32">
    Fancy Text
  </text>
</svg>

<script>
  (async () => {
    // Wait for CustomFont to load
    await SvgVisualBBox.waitForDocumentFonts(document, 10000);

    // Get accurate bbox
    const bbox =
      await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(
        '#fancyText'
      );
    console.log('Text bbox:', bbox);
  })();
</script>
```

### Example 2: Debug Layout Issues

```javascript
// Show borders for all elements with a specific class
const elements = document.querySelectorAll('.debug-me');
const borders = [];

for (const el of elements) {
  const border = await SvgVisualBBox.showTrueBBoxBorder(`#${el.id}`, {
    theme: 'dark',
    borderColor: 'red'
  });
  borders.push(border);
}

// Remove all borders after 10 seconds
setTimeout(() => borders.forEach((b) => b.remove()), 10000);
```

### Example 3: Fix Broken SVG ViewBox

```javascript
const svg = document.getElementById('brokenSvg');

// Get full drawing extent
const { full } = await SvgVisualBBox.getSvgElementVisibleAndFullBBoxes(svg);

if (full) {
  // Fix viewBox
  svg.setAttribute(
    'viewBox',
    `${full.x} ${full.y} ${full.width} ${full.height}`
  );

  // Set reasonable dimensions
  svg.setAttribute('width', Math.round(full.width));
  svg.setAttribute('height', Math.round(full.height));

  console.log('✅ ViewBox fixed!');
}
```

### Example 4: Zoom to Element on Click

```javascript
document.querySelectorAll('.zoomable').forEach((element) => {
  element.addEventListener('click', async () => {
    const svg = element.closest('svg');
    await SvgVisualBBox.setViewBoxOnObjects(svg, element.id, {
      aspect: 'meet',
      margin: '20px',
      animate: true
    });
  });
});
```

### Example 5: Measure Multiple Elements

```javascript
const ids = ['icon1', 'icon2', 'icon3', 'icon4'];

// Measure all in parallel
const bboxes = await Promise.all(
  ids.map((id) =>
    SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(`#${id}`)
  )
);

// Create lookup table
const bboxMap = Object.fromEntries(ids.map((id, i) => [id, bboxes[i]]));

console.log('All bboxes:', bboxMap);
```

### Example 6: Compare getBBox() vs Visual BBox

```javascript
const element = document.getElementById('complexElement');

// Standard getBBox() (often wrong)
const standardBBox = element.getBBox();

// Accurate visual bbox
const visualBBox =
  await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element);

console.log('Standard getBBox():', standardBBox);
console.log('Visual BBox:', visualBBox);

// Show how much getBBox() was off
const widthDiff = Math.abs(visualBBox.width - standardBBox.width);
const heightDiff = Math.abs(visualBBox.height - standardBBox.height);

console.log(`Width difference: ${widthDiff.toFixed(2)} units`);
console.log(`Height difference: ${heightDiff.toFixed(2)} units`);
```

---

## Browser Compatibility

- **Chrome/Chromium**: ✅ Fully supported (recommended)
- **Firefox**: ⚠️ May have minor SVG rendering differences
- **Safari**: ⚠️ May have minor SVG rendering differences
- **Edge**: ✅ Chromium-based version fully supported

**⚠️ IMPORTANT:** For consistent results, always use Chrome/Chromium. Other
browsers have varying SVG support that may cause measurement discrepancies.

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.
