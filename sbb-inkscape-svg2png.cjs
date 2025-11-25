#!/usr/bin/env node
/**
 * sbb-inkscape-svg2png.cjs
 *
 * Simple SVG to PNG converter using Inkscape.
 *
 * WARNING: This tool uses Inkscape's rendering engine which has known issues
 * with font bounding box calculations. For accurate bbox computation, use the
 * native svg-bbox tools (sbb-render, sbb-getbbox) instead.
 *
 * This tool is provided for completeness and comparison purposes only.
 *
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
  printInfo,
  printWarning
} = require('./lib/cli-utils.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// HELP TEXT
// ═══════════════════════════════════════════════════════════════════════════

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║ sbb-inkscape-svg2png.cjs - Basic SVG to PNG Converter               ║
╚════════════════════════════════════════════════════════════════════════════╝

⚠️  WARNING: Inkscape has known issues with font bounding box calculations.
   For accurate bbox computation, use native svg-bbox tools instead:
   • sbb-render.cjs - Native SVG rendering with accurate bbox
   • sbb-getbbox.cjs - Precise bounding box calculation

   This tool is provided for completeness and comparison purposes only.

DESCRIPTION:
  Simple SVG to PNG converter using Inkscape's rendering engine.
  Provides basic conversion with optional width, height, and DPI settings.

USAGE:
  node sbb-inkscape-svg2png.cjs input.svg [options]
  node sbb-inkscape-svg2png.cjs --batch <file> [options]

OPTIONS:
  --output <file>           Output PNG file (default: <input>.png)
  --width <pixels>          Export width in pixels
  --height <pixels>         Export height in pixels
  --dpi <dpi>               Export DPI (default: 96)
  --area-drawing            Export bounding box of all objects (default)
  --area-page               Export full SVG page/viewBox area
  --batch <file>            Batch conversion mode using file list
                            Format: svg_path.svg (one file per line)
  --help                    Show this help
  --version                 Show version

EXAMPLES:

  # Basic PNG conversion
  node sbb-inkscape-svg2png.cjs icon.svg

  # Convert with specific dimensions
  node sbb-inkscape-svg2png.cjs icon.svg --width 512 --height 512

  # Convert at high DPI
  node sbb-inkscape-svg2png.cjs icon.svg --dpi 300

  # Export full page area
  node sbb-inkscape-svg2png.cjs document.svg --area-page

  # Batch conversion from file list
  node sbb-inkscape-svg2png.cjs --batch icons.txt --width 256 --height 256

OUTPUT:
  Creates PNG file(s) from SVG input.

  Exit codes:
  • 0: Conversion successful
  • 1: Error occurred
  • 2: Invalid arguments

COMPARISON WITH NATIVE TOOLS:
  Use native svg-bbox tools for production work:

  Instead of:
    node sbb-inkscape-svg2png.cjs input.svg

  Use:
    node sbb-render.cjs input.svg output.png

  The native tools provide:
  • Accurate font bounding box calculations
  • Reliable text rendering
  • Consistent cross-platform results
  • Better performance
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
    dpi: null,
    areaDrawing: true,
    areaPage: false,
    batch: null
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      printVersion('sbb-inkscape-svg2png');
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
    } else if (arg === '--area-drawing') {
      args.areaDrawing = true;
      args.areaPage = false;
    } else if (arg === '--area-page') {
      args.areaPage = true;
      args.areaDrawing = false;
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
    console.error('Usage: node sbb-inkscape-svg2png.cjs input.svg [options]');
    console.error('   or: node sbb-inkscape-svg2png.cjs --batch <file> [options]');
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
 * Read and parse batch conversion file (one SVG path per line)
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
// INKSCAPE SVG TO PNG CONVERSION
// ═══════════════════════════════════════════════════════════════════════════

async function convertSvgToPngWithInkscape(inputPath, outputPath, options = {}) {
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
    dpi = null,
    areaDrawing = true,
    areaPage = false
  } = options;

  // Build Inkscape command arguments
  const inkscapeArgs = [
    '--export-type=png',
    '--export-overwrite',
    '--no-convert-text-baseline-spacing',
    '--convert-dpi-method=none',
    `--export-filename=${safeOutputPath}`
  ];

  // Export area mode
  if (areaPage) {
    inkscapeArgs.push('--export-area-page');
  } else if (areaDrawing) {
    inkscapeArgs.push('--export-area-drawing');
  }

  // Dimensions and DPI
  if (dpi !== null) {
    inkscapeArgs.push(`--export-dpi=${dpi}`);
  }
  if (width !== null) {
    inkscapeArgs.push(`--export-width=${width}`);
  }
  if (height !== null) {
    inkscapeArgs.push(`--export-height=${height}`);
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
      dpi: dpi || 96,
      areaMode: areaPage ? 'page' : 'drawing',
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
      throw new SVGBBoxError(`Inkscape conversion failed: ${error.message}`, error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = parseArgs(process.argv);

  printInfo(`sbb-inkscape-svg2png v${getVersion()} | svg-bbox toolkit\n`);

  // Show accuracy warning
  printWarning('⚠️  Inkscape has known issues with font bounding boxes.');
  printWarning('   For accurate results, use native svg-bbox tools (sbb-render, sbb-getbbox).\n');

  // BATCH MODE: Convert multiple SVG files
  if (args.batch) {
    const svgFiles = readBatchFile(args.batch);

    console.log(`Processing ${svgFiles.length} SVG files from ${args.batch}...\n`);

    const results = [];
    for (let i = 0; i < svgFiles.length; i++) {
      const svgPath = svgFiles[i];
      const inputBase = path.basename(svgPath, path.extname(svgPath));
      const pngPath = `${inputBase}.png`;

      console.log(`[${i + 1}/${svgFiles.length}] Converting ${svgPath}...`);

      try {
        const result = await convertSvgToPngWithInkscape(svgPath, pngPath, {
          width: args.width,
          height: args.height,
          dpi: args.dpi,
          areaDrawing: args.areaDrawing,
          areaPage: args.areaPage
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
  console.log(`Converting ${args.input} to PNG...\n`);

  const result = await convertSvgToPngWithInkscape(args.input, args.output, {
    width: args.width,
    height: args.height,
    dpi: args.dpi,
    areaDrawing: args.areaDrawing,
    areaPage: args.areaPage
  });

  printSuccess(`✓ PNG conversion successful`);
  console.log(`  Input:       ${result.inputPath}`);
  console.log(`  Output:      ${result.outputPath}`);
  console.log(`  Size:        ${(result.fileSize / 1024).toFixed(1)} KB`);
  console.log(`  DPI:         ${result.dpi}`);
  console.log(`  Export area: ${result.areaMode}`);

  if (result.width || result.height) {
    const dims = [];
    if (result.width) dims.push(`${result.width}px`);
    if (result.height) dims.push(`${result.height}px`);
    console.log(`  Dimensions:  ${dims.join(' × ')}`);
  }

  // Show Inkscape warnings if any
  if (result.stderr) {
    printInfo(`\nInkscape warnings:\n${result.stderr}`);
  }

  // Reminder about native tools
  console.log('\n' + '─'.repeat(78));
  printInfo('💡 For production use, consider native svg-bbox tools:');
  console.log('   node sbb-render.cjs input.svg output.png');
  console.log('─'.repeat(78));
}

// SECURITY: Run with CLI error handling
runCLI(main);

module.exports = { main, convertSvgToPngWithInkscape };
