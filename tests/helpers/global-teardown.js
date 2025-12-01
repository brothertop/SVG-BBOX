/**
 * Global Teardown for Vitest
 *
 * Ensures all browser processes are killed when tests complete or crash.
 * This prevents hanging vitest processes caused by orphaned Puppeteer browsers.
 *
 * WHY THIS FILE EXISTS:
 * - Puppeteer browsers can become orphaned if tests crash or timeout
 * - Orphaned browsers keep Node.js event loop running, preventing exit
 * - vitest will hang indefinitely waiting for event loop to drain
 * - This teardown gracefully closes browsers and forces exit if needed
 *
 * WHAT NOT TO DO:
 * - Don't remove this file (tests will hang on failure)
 * - Don't increase timeout (indicates real cleanup problems)
 * - Don't skip browser cleanup (causes resource leaks)
 */

import { spawn } from 'child_process';

/**
 * Kill Chrome/Chromium processes using spawn (safe, no shell injection)
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<void>}
 */
function safeKillProcesses(command, args, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const proc = spawn(command, args, {
        stdio: 'ignore',
        timeout,
        detached: false
      });

      proc.on('close', () => resolve());
      proc.on('error', () => resolve());

      // Force resolve after timeout
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          // Process may already be dead
        }
        resolve();
      }, timeout);
    } catch {
      resolve();
    }
  });
}

/**
 * Close shared browser and cleanup orphaned processes
 * Called automatically by vitest after all tests complete
 */
export default async function globalTeardown() {
  const startTime = Date.now();

  try {
    // Try to close the shared browser gracefully first
    try {
      const { closeBrowser } = await import('./browser-test.js');
      await Promise.race([
        closeBrowser(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('closeBrowser timeout')), 5000)
        )
      ]);
    } catch {
      // Browser module not loaded or close failed - proceed to force kill
    }

    // Force kill any remaining headless Chrome processes
    const platform = process.platform;

    if (platform === 'darwin' || platform === 'linux') {
      // macOS/Linux: Use pkill to find and terminate Chrome processes
      await safeKillProcesses('pkill', ['-f', 'chrome.*--headless'], 3000);
    } else if (platform === 'win32') {
      // Windows: Use taskkill to terminate Chrome
      await safeKillProcesses('taskkill', ['/F', '/IM', 'chrome.exe'], 3000);
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > 1000) {
      console.log(`[global-teardown] Browser cleanup completed in ${elapsed}ms`);
    }
  } catch (error) {
    console.error('[global-teardown] Error during cleanup:', error.message);
  }

  // Force process exit if event loop is still running after 5 seconds
  // This is a last resort to prevent hanging
  const forceExitTimer = setTimeout(() => {
    console.error('[global-teardown] Force exit: event loop still running after cleanup');
    process.exit(0);
  }, 5000);

  // Unref so it doesn't keep the process alive if everything else is done
  forceExitTimer.unref();
}
