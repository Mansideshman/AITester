import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { paths } from './config.js';
import { log } from './logger.js';
import { ask } from './prompt.js';

export interface Session {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export async function openSession(headless: boolean): Promise<Session> {
  const browser = await chromium.launch({ headless });
  const hasStorage = existsSync(paths.storageState);
  const context = await browser.newContext(hasStorage ? { storageState: paths.storageState } : {});
  const page = await context.newPage();
  return { browser, context, page };
}

/**
 * Never solves CAPTCHAs/2FA/checkpoints itself — always hands those to the
 * human in the visible browser window. That's a deliberate boundary, not a
 * missing feature: automating past LinkedIn's own challenge flow is the part
 * of this tool that would turn "assistant" into "bot evading detection".
 */
export async function ensureLoggedIn(session: Session, email: string, password: string) {
  const { page, context } = session;
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });

  const alreadyLoggedIn = await page
    .locator('div.feed-identity-module, a[href*="/in/"], input[placeholder="Search"]')
    .first()
    .isVisible()
    .catch(() => false);

  if (alreadyLoggedIn) {
    log.success('Reusing existing LinkedIn session.');
    return;
  }

  log.info('No valid session found — logging in.');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
  await page.fill('#username', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('domcontentloaded');

  await ask(
    '\nIf LinkedIn shows a security checkpoint, CAPTCHA, or 2FA prompt, complete it now in the ' +
      'browser window yourself. Once you land on your LinkedIn feed, press Enter here to continue... '
  );

  mkdirSync(path.dirname(paths.storageState), { recursive: true });
  await context.storageState({ path: paths.storageState });
  log.success('Login session saved to .auth/ for next run.');
}
