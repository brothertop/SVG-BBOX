#!/usr/bin/env node
/**
 * sbb-inkscape-exportpng.cjs
 *
 * Export SVG files to PNG format using Inkscape.
 * Requires Inkscape to be installed on your system.
 *
 * Part of the svg-bbox toolkit - Inkscape Tools Collection.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { getVersion } = require('./version.cjs');

const execFilePromise = promisify(execFile);

// SECURITY: Import security utilities
const {
  validateFilePath,
  validateOutputPath,
  SVGBBoxError,
  ValidationError
} = require('./lib/security-utils.cjs');

const {
  runCLI,
  printSuccess,
  printError,
  printInfo
} = require('./lib/cli-utils.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// HELP TEXT
// ═══════════════════════════════════════════════════════════════════════════

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║ sbb-inkscape-exportpng.cjs - SVG to PNG Export Tool                 ║
╚════════════════════════════════════════════════════════════════════════════╝

DESCRIPTION:
  Export SVG files to PNG format using Inkscape with full control over
  dimensions, DPI, and export areas.

USAGE:
  node sbb-inkscape-exportpng.cjs input.svg [options]
  node sbb-inkscape-exportpng.cjs --batch <file> [options]

OPTIONS:
  --output <file>           Output PNG file (default: <input>.png)
  --width <pixels>          Export width in pixels
  --height <pixels>         Export height in pixels
  --dpi <dpi>               Export DPI (default: 96)
  --area <mode>             Export area mode:
                              drawing  - Bounding box of all objects (default)
                              page     - Full SVG page/canvas
  --id <object-id>          Export specific object by ID
  --batch <file>            Batch export mode using file list
                            Format: svg_path.svg (one file per line)
  --help                    Show this help
  --version                 Show version

EXAMPLES:

  # Basic PNG export
  node sbb-inkscape-exportpng.cjs icon.svg

  # Export with specific dimensions
  node sbb-inkscape-exportpng.cjs icon.svg --width 512 --height 512

  # Export at high DPI
  node sbb-inkscape-exportpng.cjs icon.svg --dpi 300

  # Export specific object by ID
  node sbb-inkscape-exportpng.cjs sprite.svg --id icon_home --output home.png

  # Export full page area
  node sbb-inkscape-exportpng.cjs document.svg --area page

  # Batch export from file list
  node sbb-inkscape-exportpng.cjs --batch icons.txt --width 256 --height 256

OUTPUT:
  Creates PNG file(s) from SVG input.

  Exit codes:
  • 0: Export successful
  • 1: Error occurred
  • 2: Invalid arguments
`);
}

function printVersion(toolName) {
  const version = getVersion();
  console.log(`${toolName} v${version} | svg-bbox toolkit`);
}

// ═══════════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    width: null,
    height: null,
    dpi: 96,
    area: 'drawing',
    objectId: null,
    batch: null
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      printVersion('sbb-inkscape-exportpng');
      process.exit(0);
    } else if (arg === '--output' && i + 1 < argv.length) {
      args.output = argv[++i];
    } else if (arg === '--width' && i + 1 < argv.length) {
      args.width = parseInt(argv[++i], 10);
      if (isNaN(args.width) || args.width <= 0) {
        console.error('Error: --width must be a positive number');
        process.exit(2);
      }
    } else if (arg === '--height' && i + 1 < argv.length) {
      args.height = parseInt(argv[++i], 10);
      if (isNaN(args.height) || args.height <= 0) {
        console.error('Error: --height must be a positive number');
        process.exit(2);
      }
    } else if (arg === '--dpi' && i + 1 < argv.length) {
      args.dpi = parseInt(argv[++i], 10);
      if (isNaN(args.dpi) || args.dpi <= 0) {
        console.error('Error: --dpi must be a positive number');
        process.exit(2);
      }
    } else if (arg === '--area' && i + 1 < argv.length) {
      args.area = argv[++i];
      if (!['drawing', 'page'].includes(args.area)) {
        console.error('Error: --area must be "drawing" or "page"');
        process.exit(2);
      }
    } else if (arg === '--id' && i + 1 < argv.length) {
      args.objectId = argv[++i];
    } else if (arg === '--batch' && i + 1 < argv.length) {
      args.batch = argv[++i];
    } else if (!arg.startsWith('-')) {
      if (!args.input) {
        args.input = arg;
      } else {
        console.error(`Error: Unexpected argument: ${arg}`);
        process.exit(2);
      }
    } else {
      console.error(`Error: Unknown option: ${arg}`);
      process.exit(2);
    }
  }

  // Validate required arguments
  if (!args.batch && !args.input) {
    console.error('Error: Input SVG file required (or use --batch <file>)');
    console.error('Usage: node sbb-inkscape-exportpng.cjs input.svg [options]');
    console.error('   or: node sbb-inkscape-exportpng.cjs --batch <file> [options]');
    process.exit(2);
  }

  // Batch mode cannot have individual input file
  if (args.batch && args.input) {
    console.error('Error: --batch mode cannot be combined with individual SVG file argument');
    process.exit(2);
  }

  // Set default output file (only for non-batch mode)
  if (!args.batch && !args.output) {
    const inputBase = path.basename(args.input, path.extname(args.input));
    args.output = `${inputBase}.png`;
  }

  return args;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH FILE PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read and parse batch export file (one SVG path per line)
 * Returns array of SVG file paths
 */
function readBatchFile(batchFilePath) {
  // SECURITY: Validate batch file path
  const safeBatchPath = validateFilePath(batchFilePath, {
    requiredExtensions: ['.txt'],
    mustExist: true
  });

  const content = fs.readFileSync(safeBatchPath, 'utf-8');
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new ValidationError('Batch file is empty or contains no valid SVG paths');
  }

  return lines;
}

// ═══════════════════════════════════════════════════════════════════════════
// INKSCAPE PNG EXPORT
// ═══════════════════════════════════════════════════════════════════════════

async function exportPngWithInkscape(inputPath, outputPath, options = {}) {
  // SECURITY: Validate input file path
  const safeInputPath = validateFilePath(inputPath, {
    requiredExtensions: ['.svg'],
    mustExist: true
  });

  // SECURITY: Validate output file path
  const safeOutputPath = validateOutputPath(outputPath, {
    requiredExtensions: ['.png']
  });

  const {
    width = null,
    height = null,
    dpi = 96,
    area = 'drawing',
    objectId = null
  } = options;

  // Build Inkscape command arguments
  const inkscapeArgs = [
    '--export-type=png',
    `--export-dpi=${dpi}`,
    `--export-filename=${safeOutputPath}`
  ];

  // Set export area
  if (area === 'page') {
    inkscapeArgs.push('--export-area-page');
  } else {
    inkscapeArgs.push('--export-area-drawing');
  }

  // Add width/height if specified
  if (width !== null) {
    inkscapeArgs.push(`--export-width=${width}`);
  }
  if (height !== null) {
    inkscapeArgs.push(`--export-height=${height}`);
  }

  // Export specific object by ID
  if (objectId) {
    inkscapeArgs.push(`--export-id=${objectId}`);
    inkscapeArgs.push('--export-id-only');
  }

  // Add input file as last argument
  inkscapeArgs.push(safeInputPath);

  try {
    // Execute Inkscape with timeout
    const { stdout, stderr } = await execFilePromise('inkscape', inkscapeArgs, {
      timeout: 30000, // 30 second timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    // Check if output file was created
    if (!fs.existsSync(safeOutputPath)) {
      throw new SVGBBoxError('Inkscape did not create output PNG file');
    }

    // Get output file size
    const stats = fs.statSync(safeOutputPath);

    return {
      inputPath: safeInputPath,
      outputPath: safeOutputPath,
      fileSize: stats.size,
      width,
      height,
      dpi,
      area,
      objectId,
      stdout: stdout.trim(),
      stderr: stderr.trim()
    };

  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SVGBBoxError(
        'Inkscape not found. Please install Inkscape and ensure it is in your PATH.\n' +
        'Download from: https://inkscape.org/release/'
      );
    } else if (error.killed) {
      throw new SVGBBoxError('Inkscape process timed out (30s limit)');
    } else {
      throw new SVGBBoxError(`Inkscape PNG export failed: ${error.message}`, error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = parseArgs(process.argv);

  printInfo(`sbb-inkscape-exportpng v${getVersion()} | svg-bbox toolkit\n`);

  // BATCH MODE: Export multiple SVG files
  if (args.batch) {
    const svgFiles = readBatchFile(args.batch);

    console.log(`Processing ${svgFiles.length} SVG files from ${args.batch}...\n`);

    const results = [];
    for (let i = 0; i < svgFiles.length; i++) {
      const svgPath = svgFiles[i];
      const inputBase = path.basename(svgPath, path.extname(svgPath));
      const pngPath = `${inputBase}.png`;

      console.log(`[${i + 1}/${svgFiles.length}] Exporting ${svgPath}...`);

      try {
        const result = await exportPngWithInkscape(svgPath, pngPath, {
          width: args.width,
          height: args.height,
          dpi: args.dpi,
          area: args.area,
          objectId: args.objectId
        });

        results.push({
          success: true,
          input: result.inputPath,
          output: result.outputPath,
          fileSize: result.fileSize
        });

        printSuccess(`  ✓ Created ${result.outputPath} (${(result.fileSize / 1024).toFixed(1)} KB)`);
      } catch (error) {
        results.push({
          success: false,
          input: svgPath,
          error: error.message
        });

        printError(`  ✗ Failed: ${error.message}`);
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n${'═'.repeat(78)}`);
    console.log(`Summary: ${successful} successful, ${failed} failed`);
    console.log('═'.repeat(78));

    return;
  }

  // SINGLE FILE MODE
  console.log(`Exporting ${args.input} to PNG...`);

  const result = await exportPngWithInkscape(args.input, args.output, {
    width: args.width,
    height: args.height,
    dpi: args.dpi,
    area: args.area,
    objectId: args.objectId
  });

  printSuccess(`✓ PNG export successful`);
  console.log(`  Input:     ${result.inputPath}`);
  console.log(`  Output:    ${result.outputPath}`);
  console.log(`  Size:      ${(result.fileSize / 1024).toFixed(1)} KB`);
  console.log(`  DPI:       ${result.dpi}`);
  console.log(`  Area:      ${result.area}`);
  if (result.width) {
    console.log(`  Width:     ${result.width}px`);
  }
  if (result.height) {
    console.log(`  Height:    ${result.height}px`);
  }
  if (result.objectId) {
    console.log(`  Object ID: ${result.objectId}`);
  }

  // Show Inkscape warnings if any
  if (result.stderr) {
    printInfo(`\nInkscape warnings:\n${result.stderr}`);
  }
}

// SECURITY: Run with CLI error handling
runCLI(main);

module.exports = { main, exportPngWithInkscape };
