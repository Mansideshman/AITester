import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Profile, RunOptions } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export const paths = {
  root: rootDir,
  profile: path.join(rootDir, 'config', 'profile.json'),
  storageState: path.join(rootDir, '.auth', 'linkedin-storage-state.json'),
  outputDir: path.join(rootDir, 'output'),
  appliedLog: path.join(rootDir, 'output', 'applied-log.json'),
  exportFile: path.join(rootDir, 'output', 'applied-jobs.json'),
};

export function loadCredentials(): { email: string; password: string } {
  const email = process.env.LINKEDIN_EMAIL;
  const password = process.env.LINKEDIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Missing LINKEDIN_EMAIL / LINKEDIN_PASSWORD. Copy .env.example to .env and fill in your credentials.'
    );
  }
  return { email, password };
}

export function loadProfile(): Profile {
  if (!existsSync(paths.profile)) {
    throw new Error(
      `Missing ${paths.profile}. Copy config/profile.example.json to config/profile.json and fill it in.`
    );
  }
  const profile = JSON.parse(readFileSync(paths.profile, 'utf-8')) as Profile;
  if (!profile.search?.keywords || !profile.search?.location) {
    throw new Error('profile.json must set search.keywords and search.location.');
  }
  return profile;
}

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

export function loadRunOptions(): RunOptions {
  const max = Number(argValue('--max') ?? 5);
  const delayMinMs = Number(argValue('--delay-min') ?? 6) * 1000;
  const delayMaxMs = Number(argValue('--delay-max') ?? 14) * 1000;
  const dryRun = process.argv.includes('--dry-run');
  const headless = process.argv.includes('--headless');

  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('--max must be a positive number.');
  }
  if (delayMinMs > delayMaxMs) {
    throw new Error('--delay-min must be <= --delay-max.');
  }

  return { max, delayMinMs, delayMaxMs, dryRun, headless };
}
