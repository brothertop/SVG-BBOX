#!/usr/bin/env node

/**
 * getbbox.cjs
 *
 * CLI utility to compute visual bounding boxes for SVG files and elements
 * using canvas-based rasterization technique (not getBBox()).
 *
 * Usage:
 *   node getbbox.cjs <svg-file> [object-ids...]
 *   node getbbox.cjs <svg-file> --ignore-vbox
 *   node getbbox.cjs --dir <directory> [--filter <regex>]
 *   node getbbox.cjs --list <txt-file>
 *   node getbbox.cjs <svg-file> [object-ids...] --json <output.json>
 *
 * Features:
 * - Compute bbox for whole SVG or specific elements by ID
 * - Ignore viewBox to get full drawing content bbox (--ignore-vbox)
 * - Batch process directories with optional regex filter
 * - Process list files with per-file object IDs
 * - Export results as JSON
 * - Auto-repair missing SVG attributes (viewBox, width, height, preserveAspectRatio)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    mode: null,           // 'file', 'dir', 'list'
    svgPath: null,        // single SVG file path
    objectIds: [],        // object IDs to compute bbox for
    ignoreViewBox: false, // compute full drawing bbox
    dir: null,            // directory path for batch processing
    filter: null,         // regex filter for directory files
    listFile: null,       // txt file with list of SVGs
    jsonOutput: null,     // JSON output file path
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      return options;
    }
    else if (arg === '--ignore-vbox' || arg === '--ignore-viewbox') {
      options.ignoreViewBox = true;
    }
    else if (arg === '--dir' || arg === '-d') {
      options.mode = 'dir';
      options.dir = args[++i];
    }
    else if (arg === '--filter' || arg === '-f') {
      options.filter = args[++i];
    }
    else if (arg === '--list' || arg === '-l') {
      options.mode = 'list';
      options.listFile = args[++i];
    }
    else if (arg === '--json' || arg === '-j') {
      options.jsonOutput = args[++i];
    }
    else if (!arg.startsWith('-')) {
      // First non-option arg is SVG file (if not in dir/list mode)
      if (!options.mode) {
        options.mode = 'file';
        options.svgPath = arg;
      }
      // Subsequent non-option args are object IDs
      else if (options.mode === 'file') {
        options.objectIds.push(arg);
      }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║ getbbox.cjs - Visual BBox Calculator for SVG                              ║
╚════════════════════════════════════════════════════════════════════════════╝

USAGE:
  node getbbox.cjs <svg-file> [object-ids...] [options]
  node getbbox.cjs --dir <directory> [options]
  node getbbox.cjs --list <txt-file> [options]

MODES:
  Single File:
    node getbbox.cjs drawing.svg
      → Compute bbox for entire SVG content (respecting viewBox)

    node getbbox.cjs drawing.svg --ignore-vbox
      → Compute bbox for full drawing (ignoring viewBox clipping)

    node getbbox.cjs drawing.svg icon1 icon2 icon3
      → Compute bbox for specific elements by ID

  Directory Batch:
    node getbbox.cjs --dir ./svgs
      → Process all SVG files in directory

    node getbbox.cjs --dir ./svgs --filter "^icon_"
      → Process only SVG files matching regex pattern

  List File:
    node getbbox.cjs --list files.txt
      → Process SVGs from list file (see format below)

OPTIONS:
  --ignore-vbox, --ignore-viewbox
      Compute full drawing bbox, ignoring viewBox clipping

  --json <file>, -j <file>
      Save results as JSON to specified file

  --dir <path>, -d <path>
      Batch process all SVG files in directory

  --filter <regex>, -f <regex>
      Filter directory files by regex pattern (filename only)

  --list <file>, -l <file>
      Process SVGs from list file

  --help, -h
      Show this help message

LIST FILE FORMAT:
  Each line: <svg-path> [object-ids...] [--ignore-vbox]
  Lines starting with # are comments

  Example:
    # Process whole SVG content
    path/to/icons.svg

    # Process specific objects
    path/to/sprites.svg icon1 icon2 icon3

    # Get full drawing bbox (ignore viewBox)
    path/to/drawing.svg --ignore-vbox

    # Comments are allowed
    # path/to/disabled.svg

OUTPUT FORMAT:
  Console (default):
    SVG: path/to/file.svg
    ├─ WHOLE CONTENT: {x: 0, y: 0, width: 100, height: 100}
    ├─ icon1: {x: 10, y: 10, width: 20, height: 20}
    └─ icon2: {x: 50, y: 50, width: 30, height: 30}

  JSON (with --json):
    {
      "path/to/file.svg": {
        "WHOLE CONTENT": {x: 0, y: 0, width: 100, height: 100},
        "icon1": {x: 10, y: 10, width: 20, height: 20},
        "icon2": {x: 50, y: 50, width: 30, height: 30}
      }
    }

AUTO-REPAIR:
  Missing SVG attributes are automatically computed:
  • viewBox - derived from visual bbox of content
  • width/height - set to match viewBox dimensions
  • preserveAspectRatio - defaults to "xMidYMid meet"

EXAMPLES:
  # Compute whole SVG bbox
  node getbbox.cjs drawing.svg

  # Compute specific elements
  node getbbox.cjs sprites.svg icon_save icon_load icon_close

  # Get full drawing (ignore viewBox)
  node getbbox.cjs drawing.svg --ignore-vbox

  # Batch process directory
  node getbbox.cjs --dir ./svgs --json results.json

  # Process filtered files
  node getbbox.cjs --dir ./icons --filter "^btn_" --json buttons.json

  # Process from list
  node getbbox.cjs --list process-list.txt --json output.json
`);
}

// ============================================================================
// SVG ATTRIBUTE REPAIR
// ============================================================================

/**
 * Repair missing SVG attributes using visual bbox
 * @param {string} svgMarkup - SVG markup string
 * @param {Object} bbox - Visual bbox {x, y, width, height}
 * @returns {string} - Repaired SVG markup
 */
function repairSvgAttributes(svgMarkup, bbox) {
  // Parse SVG to extract root element
  const svgMatch = svgMarkup.match(/<svg([^>]*)>/);
  if (!svgMatch) return svgMarkup;

  const attrs = svgMatch[1];
  let hasViewBox = /viewBox\s*=/.test(attrs);
  let hasWidth = /\swidth\s*=/.test(attrs);
  let hasHeight = /\sheight\s*=/.test(attrs);
  let hasPreserveAspectRatio = /preserveAspectRatio\s*=/.test(attrs);

  if (hasViewBox && hasWidth && hasHeight && hasPreserveAspectRatio) {
    return svgMarkup; // All attributes present
  }

  // Build repaired attributes
  let newAttrs = attrs;

  if (!hasViewBox && bbox) {
    newAttrs += ` viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}"`;
  }

  if (!hasWidth && bbox) {
    newAttrs += ` width="${bbox.width}"`;
  }

  if (!hasHeight && bbox) {
    newAttrs += ` height="${bbox.height}"`;
  }

  if (!hasPreserveAspectRatio) {
    newAttrs += ` preserveAspectRatio="xMidYMid meet"`;
  }

  return svgMarkup.replace(/<svg([^>]*)>/, `<svg${newAttrs}>`);
}

// ============================================================================
// BBOX COMPUTATION (using Puppeteer + SvgVisualBBox)
// ============================================================================

/**
 * Compute bbox for SVG file and optional object IDs
 * @param {string} svgPath - Path to SVG file
 * @param {string[]} objectIds - Array of object IDs (empty = whole content)
 * @param {boolean} ignoreViewBox - Compute full drawing bbox
 * @returns {Promise<Object>} - {filename: string, results: {id: bbox}}
 */
async function computeBBox(svgPath, objectIds = [], ignoreViewBox = false) {
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Create HTML with SVG
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 20px; }
    svg { display: block; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>
    `;

    await page.setContent(html, { waitUntil: 'load' });

    // Load SvgVisualBBox library via addScriptTag
    const libPath = path.join(__dirname, 'SvgVisualBBox.js');
    if (!fs.existsSync(libPath)) {
      throw new Error('SvgVisualBBox.js not found at: ' + libPath);
    }
    await page.addScriptTag({ path: libPath });

    // Wait for fonts to load
    await page.evaluate(async () => {
      if (window.SvgVisualBBox && window.SvgVisualBBox.waitForDocumentFonts) {
        await window.SvgVisualBBox.waitForDocumentFonts(document, 8000);
      }
    });

    const mode = ignoreViewBox ? 'unclipped' : 'clipped';

    // Compute bboxes
    const results = await page.evaluate(async (objectIds, mode) => {
      const SvgVisualBBox = window.SvgVisualBBox;
      if (!SvgVisualBBox) {
        throw new Error('SvgVisualBBox library not loaded');
      }

      const rootSvg = document.querySelector('svg');
      if (!rootSvg) {
        throw new Error('No <svg> element found');
      }

      const output = {};
      const options = { mode, coarseFactor: 3, fineFactor: 24, useLayoutScale: true };

      // If no object IDs specified, compute whole content bbox
      if (objectIds.length === 0) {
        // Get all direct children of SVG (except <defs>, <style>, <script>)
        const children = Array.from(rootSvg.children).filter(el => {
          const tag = el.tagName.toLowerCase();
          return tag !== 'defs' && tag !== 'style' && tag !== 'script' && tag !== 'title' && tag !== 'desc' && tag !== 'metadata';
        });

        if (children.length === 0) {
          output['WHOLE CONTENT'] = { error: 'No renderable content found' };
        } else if (children.length === 1) {
          // Single child - compute bbox directly
          const bbox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(children[0], options);
          output['WHOLE CONTENT'] = bbox || { error: 'No visible pixels' };
        } else {
          // Multiple children - compute union bbox
          const union = await SvgVisualBBox.getSvgElementsUnionVisualBBox(children, options);
          output['WHOLE CONTENT'] = union || { error: 'No visible pixels' };
        }
      } else {
        // Compute bbox for each object ID
        for (const id of objectIds) {
          const element = rootSvg.ownerDocument.getElementById(id);
          if (!element) {
            output[id] = { error: 'Element not found' };
            continue;
          }

          const bbox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element, options);
          output[id] = bbox || { error: 'No visible pixels' };
        }
      }

      return output;
    }, objectIds, mode);

    return {
      filename: path.basename(svgPath),
      path: svgPath,
      results
    };

  } finally {
    await browser.close();
  }
}

// ============================================================================
// DIRECTORY PROCESSING
// ============================================================================

/**
 * Process all SVG files in a directory
 * @param {string} dirPath - Directory path
 * @param {string|null} filterRegex - Regex pattern to filter filenames
 * @param {boolean} ignoreViewBox - Compute full drawing bbox
 * @returns {Promise<Object[]>} - Array of {filename, path, results}
 */
async function processDirectory(dirPath, filterRegex = null, ignoreViewBox = false) {
  const files = fs.readdirSync(dirPath);
  const svgFiles = files.filter(f => f.endsWith('.svg'));

  let filtered = svgFiles;
  if (filterRegex) {
    const regex = new RegExp(filterRegex);
    filtered = svgFiles.filter(f => regex.test(f));
  }

  const results = [];
  for (const file of filtered) {
    const filePath = path.join(dirPath, file);
    console.log(`Processing: ${file}...`);

    try {
      const result = await computeBBox(filePath, [], ignoreViewBox);
      results.push(result);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.push({
        filename: file,
        path: filePath,
        results: { error: err.message }
      });
    }
  }

  return results;
}

// ============================================================================
// LIST FILE PROCESSING
// ============================================================================

/**
 * Parse list file and extract entries
 * @param {string} listPath - Path to list file
 * @returns {Array<{path: string, ids: string[], ignoreViewBox: boolean}>}
 */
function parseListFile(listPath) {
  const content = fs.readFileSync(listPath, 'utf8');
  const lines = content.split('\n');
  const entries = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    const tokens = trimmed.split(/\s+/);
    const svgPath = tokens[0];
    const rest = tokens.slice(1);

    const entry = {
      path: svgPath,
      ids: [],
      ignoreViewBox: false
    };

    // Parse remaining tokens
    for (const token of rest) {
      if (token === '--ignore-vbox' || token === '--ignore-viewbox') {
        entry.ignoreViewBox = true;
      } else {
        entry.ids.push(token);
      }
    }

    entries.push(entry);
  }

  return entries;
}

/**
 * Process list file
 * @param {string} listPath - Path to list file
 * @returns {Promise<Object[]>} - Array of {filename, path, results}
 */
async function processList(listPath) {
  const entries = parseListFile(listPath);
  const results = [];

  for (const entry of entries) {
    console.log(`Processing: ${entry.path}...`);

    if (!fs.existsSync(entry.path)) {
      console.error(`  ERROR: File not found`);
      results.push({
        filename: path.basename(entry.path),
        path: entry.path,
        results: { error: 'File not found' }
      });
      continue;
    }

    try {
      const result = await computeBBox(entry.path, entry.ids, entry.ignoreViewBox);
      results.push(result);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.push({
        filename: path.basename(entry.path),
        path: entry.path,
        results: { error: err.message }
      });
    }
  }

  return results;
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

/**
 * Format bbox for console output
 * @param {Object} bbox - {x, y, width, height}
 * @returns {string}
 */
function formatBBox(bbox) {
  if (!bbox) return 'null';
  if (bbox.error) return `ERROR: ${bbox.error}`;
  return `{x: ${bbox.x.toFixed(2)}, y: ${bbox.y.toFixed(2)}, width: ${bbox.width.toFixed(2)}, height: ${bbox.height.toFixed(2)}}`;
}

/**
 * Print results to console
 * @param {Object[]} allResults - Array of {filename, path, results}
 */
function printResults(allResults) {
  for (const item of allResults) {
    console.log(`\nSVG: ${item.path}`);

    const keys = Object.keys(item.results);
    keys.forEach((key, idx) => {
      const isLast = idx === keys.length - 1;
      const prefix = isLast ? '└─' : '├─';
      console.log(`${prefix} ${key}: ${formatBBox(item.results[key])}`);
    });
  }
}

/**
 * Save results as JSON
 * @param {Object[]} allResults - Array of {filename, path, results}
 * @param {string} outputPath - Output JSON file path
 */
function saveJSON(allResults, outputPath) {
  const json = {};

  for (const item of allResults) {
    json[item.path] = item.results;
  }

  fs.writeFileSync(outputPath, JSON.stringify(json, null, 2), 'utf8');
  console.log(`\n✓ JSON saved to: ${outputPath}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.mode) {
    console.error('ERROR: No input specified. Use --help for usage information.');
    process.exit(1);
  }

  let allResults = [];

  try {
    if (options.mode === 'file') {
      if (!fs.existsSync(options.svgPath)) {
        console.error(`ERROR: File not found: ${options.svgPath}`);
        process.exit(1);
      }

      const result = await computeBBox(options.svgPath, options.objectIds, options.ignoreViewBox);
      allResults.push(result);
    }
    else if (options.mode === 'dir') {
      if (!fs.existsSync(options.dir) || !fs.statSync(options.dir).isDirectory()) {
        console.error(`ERROR: Directory not found: ${options.dir}`);
        process.exit(1);
      }

      allResults = await processDirectory(options.dir, options.filter, options.ignoreViewBox);
    }
    else if (options.mode === 'list') {
      if (!fs.existsSync(options.listFile)) {
        console.error(`ERROR: List file not found: ${options.listFile}`);
        process.exit(1);
      }

      allResults = await processList(options.listFile);
    }

    // Output results
    if (options.jsonOutput) {
      saveJSON(allResults, options.jsonOutput);
    } else {
      printResults(allResults);
    }

  } catch (err) {
    console.error(`\nFATAL ERROR: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { computeBBox, processDirectory, processList, repairSvgAttributes };
