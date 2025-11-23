#!/bin/bash
#
# getBBox() SCOURGE Scanner - Find and eliminate the unreliable getBBox() function
#
# ⚠️  WARNING: .getBBox() IS A SCOURGE! ⚠️
#
# WHY getBBox() IS BAD:
#   - Unreliable for complex SVG elements (transforms, filters, strokes)
#   - Returns incorrect bounds for text with font-specific rendering
#   - Doesn't account for viewBox, clipping, masks, symbols
#   - THIS ENTIRE LIBRARY EXISTS BECAUSE getBBox() IS INADEQUATE!
#
# WHAT TO USE INSTEAD:
#   await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element, options)
#   - Uses raster sampling through headless Chrome for accurate visual bounds
#   - Handles all edge cases correctly (transforms, filters, text, strokes)
#   - Returns bbox in root SVG user coordinate system (viewBox units)
#
# This script scans the entire codebase for .getBBox() usage and generates
# a report in scourge_getbbox_report.md
#
# IMPORTANT: Only detects actual code usage, NOT comments or config files!
#
# Filters out COMMENTS:
#   - Lines starting with // (single-line comments)
#   - Lines starting with /* */ or * (multi-line comments, JSDoc)
#   - Inline comments after // on the same line
#
# Excludes NON-CODE FILES:
#   - Config files: *.json, *.yaml, *.yml, *.toml, *.ini, package.json, tsconfig.json
#   - Docs: *.md files and docs/doc/documentation directories
#   - Git files: .gitignore, .gitattributes
#   - Build artifacts: dist, build, node_modules directories
#
# Only scans CODE files: *.js, *.cjs, *.mjs, *.ts, *.jsx, *.tsx
#

OUTPUT_FILE="scourge_getbbox_report.md"

echo "# getBBox() SCOURGE Report" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Generated:** $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "# ⚠️  WARNING: .getBBox() IS A SCOURGE! ⚠️" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## Overview" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "This report lists all occurrences of the **forbidden** \`.getBBox()\` function in **code files only**." >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**WHAT IS SCANNED:**" >> "$OUTPUT_FILE"
echo "- Only code files: \`*.js\`, \`*.cjs\`, \`*.mjs\`, \`*.ts\`, \`*.jsx\`, \`*.tsx\`" >> "$OUTPUT_FILE"
echo "- Only actual code lines (NOT comments!)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**WHAT IS EXCLUDED:**" >> "$OUTPUT_FILE"
echo "- Comments: \`//\`, \`/* */\`, JSDoc, inline comments" >> "$OUTPUT_FILE"
echo "- Config files: \`*.json\`, \`*.yaml\`, \`*.yml\`, \`*.toml\`, \`package.json\`, \`tsconfig.json\`" >> "$OUTPUT_FILE"
echo "- Documentation: \`*.md\` files, \`docs/\` directories" >> "$OUTPUT_FILE"
echo "- Build artifacts: \`node_modules\`, \`dist\`, \`build\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## Why getBBox() is a SCOURGE" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Thousands of innocent SVG images were cruelly and injustly truncated because of this scourge.**" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "\`getBBox()\` is **fundamentally broken** and **must never be used**:" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "1. **Unreliable for complex SVG elements**" >> "$OUTPUT_FILE"
echo "   - Ignores transforms (translate, rotate, scale, matrix)" >> "$OUTPUT_FILE"
echo "   - Ignores filters (blur, drop-shadow, etc.)" >> "$OUTPUT_FILE"
echo "   - Ignores stroke width, caps, joins, markers" >> "$OUTPUT_FILE"
echo "   - Ignores viewBox clipping and coordinate systems" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "2. **Returns incorrect bounds for text**" >> "$OUTPUT_FILE"
echo "   - Font-specific rendering varies across browsers" >> "$OUTPUT_FILE"
echo "   - Ligatures, kerning, and complex scripts (Arabic, CJK, Tamil) break it" >> "$OUTPUT_FILE"
echo "   - \`textPath\` and \`tspan\` positioning is wrong" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "3. **Doesn't account for visual effects**" >> "$OUTPUT_FILE"
echo "   - Masks, clipping paths, symbols are ignored" >> "$OUTPUT_FILE"
echo "   - Bitmap images and external resources not measured" >> "$OUTPUT_FILE"
echo "   - Nested \`<use>\` elements break" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**THIS ENTIRE LIBRARY EXISTS BECAUSE getBBox() IS INADEQUATE!**" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## How to Replace getBBox() with the Correct Solution" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "### Step 1: Import the Library" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**In Browser (HTML):**" >> "$OUTPUT_FILE"
echo "\`\`\`html" >> "$OUTPUT_FILE"
echo "<script src=\"SvgVisualBBox.js\"></script>" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**In Node.js:**" >> "$OUTPUT_FILE"
echo "\`\`\`javascript" >> "$OUTPUT_FILE"
echo "// Requires Puppeteer for headless Chrome" >> "$OUTPUT_FILE"
echo "// See test-svg-bbox.js or export-svg-objects.cjs for Node.js examples" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "### Step 2: Replace getBBox() Calls" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**WRONG (old code):**" >> "$OUTPUT_FILE"
echo "\`\`\`javascript" >> "$OUTPUT_FILE"
echo "const bbox = element.getBBox();" >> "$OUTPUT_FILE"
echo "console.log(bbox.x, bbox.y, bbox.width, bbox.height);" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**CORRECT (new code):**" >> "$OUTPUT_FILE"
echo "\`\`\`javascript" >> "$OUTPUT_FILE"
echo "// Wait for fonts to load first (important for text elements!)" >> "$OUTPUT_FILE"
echo "await SvgVisualBBox.waitForDocumentFonts(document, 8000);" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "// Get accurate visual bbox using raster sampling" >> "$OUTPUT_FILE"
echo "const bbox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element, {" >> "$OUTPUT_FILE"
echo "  mode: 'unclipped',    // or 'clipped' to respect viewBox" >> "$OUTPUT_FILE"
echo "  coarseFactor: 3,      // Pass 1 resolution multiplier" >> "$OUTPUT_FILE"
echo "  fineFactor: 24        // Pass 2 resolution multiplier (higher = more accurate)" >> "$OUTPUT_FILE"
echo "});" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "if (bbox) {" >> "$OUTPUT_FILE"
echo "  console.log(bbox.x, bbox.y, bbox.width, bbox.height);" >> "$OUTPUT_FILE"
echo "} else {" >> "$OUTPUT_FILE"
echo "  console.error('Failed to measure element');" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "### Step 3: Understand the Options" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**mode:** \`'clipped'\` or \`'unclipped'\`" >> "$OUTPUT_FILE"
echo "- \`'clipped'\`: Only measure content inside viewBox/viewport (respects clipping)" >> "$OUTPUT_FILE"
echo "- \`'unclipped'\`: Measure full geometry, ignoring viewBox clipping" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**coarseFactor:** Pass 1 resolution multiplier (default: 3)" >> "$OUTPUT_FILE"
echo "- Lower = faster but less accurate initial bbox" >> "$OUTPUT_FILE"
echo "- Higher = slower but more accurate initial bbox" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**fineFactor:** Pass 2 resolution multiplier (default: 24)" >> "$OUTPUT_FILE"
echo "- Lower = faster but less precise final bbox" >> "$OUTPUT_FILE"
echo "- Higher = slower but pixel-perfect final bbox" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "### Step 4: Handle Async Properly" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "The library uses \`async/await\` because it samples pixels from rendered canvas:" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "\`\`\`javascript" >> "$OUTPUT_FILE"
echo "// Wrap in async function or use .then()" >> "$OUTPUT_FILE"
echo "async function measureElement(element) {" >> "$OUTPUT_FILE"
echo "  const bbox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element);" >> "$OUTPUT_FILE"
echo "  return bbox;" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "### Common Use Cases" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Measure single element:**" >> "$OUTPUT_FILE"
echo "\`\`\`javascript" >> "$OUTPUT_FILE"
echo "const bbox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element);" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Measure multiple elements (union):**" >> "$OUTPUT_FILE"
echo "\`\`\`javascript" >> "$OUTPUT_FILE"
echo "const elements = [elem1, elem2, elem3];" >> "$OUTPUT_FILE"
echo "const unionBBox = await SvgVisualBBox.getSvgElementsUnionVisualBBox(elements);" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Get both clipped and unclipped bboxes:**" >> "$OUTPUT_FILE"
echo "\`\`\`javascript" >> "$OUTPUT_FILE"
echo "const { visible, full } = await SvgVisualBBox.getSvgElementVisibleAndFullBBoxes(element);" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Compute viewBox expansion needed:**" >> "$OUTPUT_FILE"
echo "\`\`\`javascript" >> "$OUTPUT_FILE"
echo "const expansion = await SvgVisualBBox.getSvgRootViewBoxExpansionForFullDrawing('svgId');" >> "$OUTPUT_FILE"
echo "if (expansion) {" >> "$OUTPUT_FILE"
echo "  const vb = expansion.newViewBox;" >> "$OUTPUT_FILE"
echo "  svgRoot.setAttribute('viewBox', \\\`\\\${vb.x} \\\${vb.y} \\\${vb.width} \\\${vb.height}\\\`);" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Search for .getBBox() in all text files, excluding node_modules, .git, etc.
echo "## Findings" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

FOUND_COUNT=0

# Use grep to find all occurrences (only in CODE files, not config/docs)
grep -rn "\.getBBox()" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=docs \
  --exclude-dir=doc \
  --exclude-dir=documentation \
  --exclude="*.md" \
  --exclude="*.json" \
  --exclude="*.yaml" \
  --exclude="*.yml" \
  --exclude="*.toml" \
  --exclude="*.ini" \
  --exclude="*.config.*" \
  --exclude=".gitignore" \
  --exclude=".gitattributes" \
  --exclude=".editorconfig" \
  --exclude=".npmrc" \
  --exclude=".npmignore" \
  --exclude="package.json" \
  --exclude="package-lock.json" \
  --exclude="tsconfig.json" \
  --exclude="$OUTPUT_FILE" \
  --include="*.js" \
  --include="*.cjs" \
  --include="*.mjs" \
  --include="*.ts" \
  --include="*.jsx" \
  --include="*.tsx" \
  . | while read -r line; do

  # Parse the line (format: filepath:line_number:content)
  FILE=$(echo "$line" | cut -d: -f1)
  LINE_NUM=$(echo "$line" | cut -d: -f2)
  CONTENT=$(echo "$line" | cut -d: -f3-)

  # Trim whitespace from content
  CONTENT_TRIMMED=$(echo "$CONTENT" | sed -e 's/^[[:space:]]*//')

  # Skip comment lines:
  # - Lines starting with // (single-line comments)
  # - Lines starting with /* or */ (multi-line comment start/end)
  # - Lines starting with * (multi-line comment continuation or JSDoc)
  if [[ "$CONTENT_TRIMMED" =~ ^// ]] || \
     [[ "$CONTENT_TRIMMED" =~ ^/\* ]] || \
     [[ "$CONTENT_TRIMMED" =~ ^\*/ ]] || \
     [[ "$CONTENT_TRIMMED" =~ ^\* ]]; then
    continue
  fi

  # Also skip if getBBox appears only after // in the line (inline comment)
  BEFORE_COMMENT=$(echo "$CONTENT" | sed 's|//.*||')
  if ! echo "$BEFORE_COMMENT" | grep -q "\.getBBox()"; then
    continue
  fi

  echo "### Found in \`$FILE\` (line $LINE_NUM)" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "\`\`\`javascript" >> "$OUTPUT_FILE"
  echo "$CONTENT" >> "$OUTPUT_FILE"
  echo "\`\`\`" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"

  FOUND_COUNT=$((FOUND_COUNT + 1))
done

# Count total occurrences (excluding comments)
TOTAL=0
while IFS= read -r line; do
  # Parse content
  CONTENT=$(echo "$line" | cut -d: -f3-)
  CONTENT_TRIMMED=$(echo "$CONTENT" | sed -e 's/^[[:space:]]*//')

  # Skip comment lines
  if [[ "$CONTENT_TRIMMED" =~ ^// ]] || \
     [[ "$CONTENT_TRIMMED" =~ ^/\* ]] || \
     [[ "$CONTENT_TRIMMED" =~ ^\*/ ]] || \
     [[ "$CONTENT_TRIMMED" =~ ^\* ]]; then
    continue
  fi

  # Skip if getBBox appears only in inline comment
  BEFORE_COMMENT=$(echo "$CONTENT" | sed 's|//.*||')
  if ! echo "$BEFORE_COMMENT" | grep -q "\.getBBox()"; then
    continue
  fi

  TOTAL=$((TOTAL + 1))
done < <(grep -rn "\.getBBox()" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=docs \
  --exclude-dir=doc \
  --exclude-dir=documentation \
  --exclude="*.md" \
  --exclude="*.json" \
  --exclude="*.yaml" \
  --exclude="*.yml" \
  --exclude="*.toml" \
  --exclude="*.ini" \
  --exclude="*.config.*" \
  --exclude=".gitignore" \
  --exclude=".gitattributes" \
  --exclude=".editorconfig" \
  --exclude=".npmrc" \
  --exclude=".npmignore" \
  --exclude="package.json" \
  --exclude="package-lock.json" \
  --exclude="tsconfig.json" \
  --exclude="$OUTPUT_FILE" \
  --include="*.js" \
  --include="*.cjs" \
  --include="*.mjs" \
  --include="*.ts" \
  --include="*.jsx" \
  --include="*.tsx" \
  .)

echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## Summary" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Total occurrences of .getBBox() SCOURGE found:** $TOTAL" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [ "$TOTAL" -eq 0 ]; then
  echo "✅ **NO getBBox() usage found!** The codebase is clean." >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "**Keep it this way!** Never use \`.getBBox()\` - always use the SvgVisualBBox library." >> "$OUTPUT_FILE"
else
  echo "# 🚨 CRITICAL: $TOTAL INSTANCES OF getBBox() SCOURGE FOUND! 🚨" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "**IMMEDIATE ACTION REQUIRED:** Replace ALL instances with proper SvgVisualBBox calls!" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "## Replacement Instructions" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "For each occurrence listed above, follow these steps:" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "1. **Add library import** (if not already present in file)" >> "$OUTPUT_FILE"
  echo "2. **Make function async** (the library requires \`await\`)" >> "$OUTPUT_FILE"
  echo "3. **Add font loading** (for text elements)" >> "$OUTPUT_FILE"
  echo "4. **Replace getBBox() call** with proper library function" >> "$OUTPUT_FILE"
  echo "5. **Handle null result** (library returns null on failure)" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "See the \"How to Replace getBBox()\" section above for complete code examples." >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "### Quick Reference Replacement" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "**BEFORE (WRONG):**" >> "$OUTPUT_FILE"
  echo "\`\`\`javascript" >> "$OUTPUT_FILE"
  echo "const bbox = element.getBBox();" >> "$OUTPUT_FILE"
  echo "\`\`\`" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "**AFTER (CORRECT):**" >> "$OUTPUT_FILE"
  echo "\`\`\`javascript" >> "$OUTPUT_FILE"
  echo "await SvgVisualBBox.waitForDocumentFonts(document, 8000);" >> "$OUTPUT_FILE"
  echo "const bbox = await SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive(element, {" >> "$OUTPUT_FILE"
  echo "  mode: 'unclipped'," >> "$OUTPUT_FILE"
  echo "  coarseFactor: 3," >> "$OUTPUT_FILE"
  echo "  fineFactor: 24" >> "$OUTPUT_FILE"
  echo "});" >> "$OUTPUT_FILE"
  echo "\`\`\`" >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "*Report generated by scan_getbbox.sh*" >> "$OUTPUT_FILE"

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  getBBox() SCOURGE Scanner - Scan Complete"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "  ⚠️  WARNING: .getBBox() IS A SCOURGE! ⚠️"
echo ""
echo "  Thousands of innocent SVG images were cruelly and injustly"
echo "  truncated because of this scourge."
echo ""
echo "  Why? It's unreliable, ignores transforms/filters/strokes,"
echo "  and breaks with text rendering. THIS LIBRARY EXISTS BECAUSE"
echo "  getBBox() IS INADEQUATE!"
echo ""
echo "  ALWAYS USE: SvgVisualBBox.getSvgElementVisualBBoxTwoPassAggressive()"
echo ""
echo "────────────────────────────────────────────────────────────────────────"
echo ""
echo "  📊 Scan Results:"
echo ""
echo "     Report:      $OUTPUT_FILE"
echo "     Occurrences: $TOTAL"
echo ""

if [ "$TOTAL" -gt 0 ]; then
  echo "  🚨 CRITICAL: $TOTAL INSTANCES OF getBBox() SCOURGE FOUND!"
  echo ""
  echo "  IMMEDIATE ACTION REQUIRED:"
  echo "  1. Read the report: $OUTPUT_FILE"
  echo "  2. Follow replacement instructions in the report"
  echo "  3. Replace ALL .getBBox() with SvgVisualBBox library calls"
  echo ""
  echo "════════════════════════════════════════════════════════════════════════"
  echo ""
  exit 1  # Exit with error if getBBox() found
else
  echo "  ✅ NO getBBox() USAGE FOUND - Codebase is clean!"
  echo ""
  echo "  Keep it this way! Never use .getBBox() - always use"
  echo "  the SvgVisualBBox library for accurate visual bounds."
  echo ""
  echo "════════════════════════════════════════════════════════════════════════"
  echo ""
  exit 0  # Exit successfully if clean
fi
