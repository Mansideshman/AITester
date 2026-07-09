import type { Page } from 'playwright';
import type { SearchConfig } from './types.js';
import { log } from './logger.js';

export function buildSearchUrl(search: SearchConfig): string {
  const params = new URLSearchParams({
    keywords: search.keywords,
    location: search.location,
  });
  if (search.easyApplyOnly) params.set('f_AL', 'true');
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

const JOB_CARD_SELECTOR = 'li.jobs-search-results__list-item, div.job-card-container, div.job-card-job-posting-card-wrapper';

export async function goToSearch(page: Page, search: SearchConfig) {
  const url = buildSearchUrl(search);
  log.info(`Opening job search: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
}

export async function countJobCards(page: Page): Promise<number> {
  return page.locator(JOB_CARD_SELECTOR).count();
}

export interface OpenedJob {
  title: string;
  company: string;
  url: string;
}

/** Clicks the nth job card in the results list and returns its basic metadata from the detail pane. */
export async function openJobCard(page: Page, index: number): Promise<OpenedJob> {
  const cards = page.locator(JOB_CARD_SELECTOR);
  await cards.nth(index).scrollIntoViewIfNeeded();
  await cards.nth(index).click();
  await page.waitForTimeout(1200);

  const detailPane = page.locator('.jobs-search__job-details, .job-view-layout, main');
  const title = await detailPane
    .locator('h1, h2.job-details-jobs-unified-top-card__job-title')
    .first()
    .innerText()
    .catch(() => 'Unknown title');
  const company = await detailPane
    .locator('.job-details-jobs-unified-top-card__company-name, a[href*="/company/"]')
    .first()
    .innerText()
    .catch(() => 'Unknown company');

  return { title: title.trim(), company: company.trim(), url: page.url() };
}

export async function findEasyApplyButton(page: Page) {
  const button = page.getByRole('button', { name: /Easy Apply/i }).first();
  const visible = await button.isVisible().catch(() => false);
  return visible ? button : null;
}
