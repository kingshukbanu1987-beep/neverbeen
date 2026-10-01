// Headless-browser helper shared by build.mjs (HTML -> PDF) and capture-screens.mjs (app screenshots).
//
// Browser resolution:
//   1. CHROME_PATH=/path/to/chrome|chromium           -> use that browser
//   2. otherwise the Chromium bundled in @sparticuz/chromium (works in minimal Linux containers)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOLS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function launchBrowser() {
  const { default: puppeteer } = await import('puppeteer-core');

  if (process.env.CHROME_PATH) {
    return puppeteer.launch({
      executablePath: process.env.CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
      defaultViewport: null,
    });
  }

  // @sparticuz/chromium only unpacks its bundled shared libraries when it believes it runs on
  // AWS Lambda, so the variable must be set *before* the package is imported.
  process.env.AWS_EXECUTION_ENV ||= 'AWS_Lambda_nodejs22.x';
  const { default: chromium } = await import('@sparticuz/chromium');

  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    headless: 'shell',
    defaultViewport: null,
  });
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
