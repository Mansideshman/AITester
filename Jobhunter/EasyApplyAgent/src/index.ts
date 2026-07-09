import { loadCredentials, loadProfile, loadRunOptions } from './config.js';
import { openSession, ensureLoggedIn } from './session.js';
import { goToSearch, countJobCards, openJobCard, findEasyApplyButton } from './linkedin.js';
import { runEasyApplyFlow } from './applyFlow.js';
import { loadAppliedUrls, saveAppliedUrl, appendTrackerJob } from './exportLog.js';
import { log } from './logger.js';
import { closePrompt } from './prompt.js';

function randomDelay(minMs: number, maxMs: number) {
  return minMs + Math.random() * (maxMs - minMs);
}

async function main() {
  const options = loadRunOptions();
  const profile = loadProfile();
  const credentials = loadCredentials();

  log.info(
    `Starting Easy Apply assistant — max ${options.max} application(s), ` +
      `${options.dryRun ? 'DRY RUN (no submissions)' : 'submissions require your confirmation'}.`
  );

  const session = await openSession(options.headless);
  const { page, browser } = session;

  try {
    await ensureLoggedIn(session, credentials.email, credentials.password);
    await goToSearch(page, profile.search);

    const appliedUrls = loadAppliedUrls();
    const total = await countJobCards(page);
    log.info(`Found ${total} job card(s) on the results page.`);

    let submitted = 0;
    for (let i = 0; i < total && submitted < options.max; i++) {
      const job = await openJobCard(page, i);
      const label = `${job.title} @ ${job.company}`;

      if (appliedUrls.has(job.url)) {
        log.info(`Already applied previously, skipping: ${label}`);
        continue;
      }

      const easyApplyButton = await findEasyApplyButton(page);
      if (!easyApplyButton) {
        log.info(`No Easy Apply button for: ${label} — skipping.`);
        continue;
      }

      log.info(`Opening Easy Apply for: ${label}`);
      await easyApplyButton.click();

      const result = await runEasyApplyFlow(page, profile, label, options.dryRun);

      if (result === 'submitted') {
        submitted++;
        saveAppliedUrl(job.url, appliedUrls);
        appendTrackerJob({
          title: job.title,
          company: job.company,
          url: job.url,
          status: 'Applied',
          resumeUsed: profile.resumeLabel,
        });
        log.success(`Submitted (${submitted}/${options.max}): ${label}`);
      } else if (result === 'skipped') {
        log.info(`Skipped: ${label}`);
      } else if (result === 'quit') {
        log.info('Stopping at your request.');
        break;
      } else {
        log.warn(`Could not complete: ${label} — left for manual review.`);
      }

      if (submitted < options.max) {
        const delay = randomDelay(options.delayMinMs, options.delayMaxMs);
        await page.waitForTimeout(delay);
      }
    }

    log.success(`Done. Submitted ${submitted} application(s) this run.`);
    if (submitted > 0) {
      log.info('Import output/applied-jobs.json into JobTrackerAI (Import button) to sync your board.');
    }
  } finally {
    closePrompt();
    await browser.close();
  }
}

main().catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
