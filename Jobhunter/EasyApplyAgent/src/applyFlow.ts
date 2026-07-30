import type { Page, Locator } from 'playwright';
import type { Profile } from './types.js';
import { log } from './logger.js';
import { confirm, ask } from './prompt.js';

export type ApplyResult = 'submitted' | 'skipped' | 'quit' | 'error';

const MAX_STEPS = 15;

/**
 * Walks the Easy Apply modal step by step, auto-filling only the fields the
 * user has explicitly pre-approved in profile.json. Anything unrecognized is
 * left for the human to fill in the visible browser. The flow always stops
 * at "Submit application" and waits for an explicit confirmation — this
 * function will never click Submit on its own.
 */
export async function runEasyApplyFlow(
  page: Page,
  profile: Profile,
  jobLabel: string,
  dryRun: boolean
): Promise<ApplyResult> {
  const dialog = page.getByRole('dialog').first();

  for (let step = 0; step < MAX_STEPS; step++) {
    await page.waitForTimeout(800);
    if (!(await dialog.isVisible().catch(() => false))) {
      log.warn('Easy Apply dialog closed unexpectedly.');
      return 'error';
    }

    await autofillKnownFields(dialog, profile);

    const submitButton = dialog.getByRole('button', { name: /Submit application/i }).first();
    if (await submitButton.isVisible().catch(() => false)) {
      if (dryRun) {
        log.info(`[dry-run] Would submit application for ${jobLabel}. Closing without submitting.`);
        await closeDialog(page, dialog);
        return 'skipped';
      }

      const decision = await confirm(
        `\nReady to submit application for ${jobLabel}. Review the form in the browser window.`
      );
      if (decision === 'quit') {
        await closeDialog(page, dialog);
        return 'quit';
      }
      if (decision === 'skip') {
        await closeDialog(page, dialog);
        return 'skipped';
      }

      await submitButton.click();
      await page.waitForTimeout(1500);
      await dismissPostSubmitModal(page);
      return 'submitted';
    }

    const nextButton = dialog.getByRole('button', { name: /Next|Review/i }).first();
    const nextVisible = await nextButton.isVisible().catch(() => false);
    const nextEnabled = nextVisible && (await nextButton.isEnabled().catch(() => false));

    if (nextVisible && nextEnabled) {
      await nextButton.click();
      continue;
    }

    const proceedDecision = await ask(
      `\nCouldn't move to the next step automatically for ${jobLabel}. Fill in the remaining ` +
        `field(s) yourself in the browser, then press Enter to continue (or type 's' to skip this job)... `
    );
    if (proceedDecision.toLowerCase() === 's') {
      await closeDialog(page, dialog);
      return 'skipped';
    }
  }

  log.warn(`Gave up after ${MAX_STEPS} steps for ${jobLabel} — closing without submitting.`);
  await closeDialog(page, dialog);
  return 'error';
}

async function autofillKnownFields(dialog: Locator, profile: Profile) {
  if (profile.resumePath) {
    const fileInput = dialog.locator('input[type="file"]');
    if (await fileInput.count()) {
      await fileInput.first().setInputFiles(profile.resumePath).catch(() => {});
    }
  }

  if (profile.phone) {
    const phoneInput = dialog.locator('input[id*="phoneNumber" i], input[name*="phone" i]');
    if (await phoneInput.count()) {
      const current = await phoneInput.first().inputValue().catch(() => '');
      if (!current) await phoneInput.first().fill(profile.phone).catch(() => {});
    }
  }

  if (profile.coverLetterDefault) {
    const textareas = dialog.locator('textarea');
    const count = await textareas.count();
    for (let i = 0; i < count; i++) {
      const ta = textareas.nth(i);
      const current = await ta.inputValue().catch(() => '');
      if (!current) await ta.fill(profile.coverLetterDefault).catch(() => {});
    }
  }

  if (profile.answers) {
    for (const [question, answer] of Object.entries(profile.answers)) {
      await answerKnownQuestion(dialog, question, answer);
    }
  }
}

// Only answers questions the user has pre-approved verbatim in profile.json —
// never guesses or infers an answer to a question it hasn't seen before.
async function answerKnownQuestion(dialog: Locator, question: string, answer: string) {
  const group = dialog.locator(`fieldset:has-text("${question}"), div:has-text("${question}")`).first();
  if (!(await group.count().catch(() => 0))) return;

  const optionByLabel = group.getByLabel(new RegExp(`^${escapeRegExp(answer)}$`, 'i'));
  if (await optionByLabel.count().catch(() => 0)) {
    await optionByLabel.first().check({ force: true }).catch(() => {});
    return;
  }

  const select = group.locator('select');
  if (await select.count()) {
    await select.first().selectOption({ label: answer }).catch(() => {});
    return;
  }

  const textInput = group.locator('input[type="text"], input:not([type])');
  if (await textInput.count()) {
    const current = await textInput.first().inputValue().catch(() => '');
    if (!current) await textInput.first().fill(answer).catch(() => {});
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function closeDialog(page: Page, dialog: Locator) {
  const dismiss = dialog.getByRole('button', { name: /Dismiss|Discard|Cancel|Close/i }).first();
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click().catch(() => {});
    const discardConfirm = page.getByRole('button', { name: /Discard/i }).first();
    if (await discardConfirm.isVisible().catch(() => false)) {
      await discardConfirm.click().catch(() => {});
    }
  }
}

async function dismissPostSubmitModal(page: Page) {
  const closeButton = page.getByRole('button', { name: /Done|Close/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click().catch(() => {});
  }
}
