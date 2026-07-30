import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { CandidateProfile, Job } from './types';

const PROFILE_KEY = 'main';

interface JobTrackerDB extends DBSchema {
  jobs: {
    key: string;
    value: Job;
    indexes: { 'by-date': number };
  };
  profile: {
    key: string;
    value: CandidateProfile;
  };
}

let dbPromise: Promise<IDBPDatabase<JobTrackerDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<JobTrackerDB>('job-tracker-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('jobs')) {
          const store = db.createObjectStore('jobs', { keyPath: 'id' });
          store.createIndex('by-date', 'dateApplied');
        }
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile');
        }
      },
    });
  }
  return dbPromise;
}

export async function addJob(job: Job) {
  const db = await getDB();
  return db.add('jobs', job);
}

export async function updateJob(job: Job) {
  const db = await getDB();
  return db.put('jobs', job);
}

export async function deleteJob(id: string) {
  const db = await getDB();
  return db.delete('jobs', id);
}

export async function getAllJobs() {
  const db = await getDB();
  return db.getAll('jobs');
}

export async function clearAllJobs() {
  const db = await getDB();
  return db.clear('jobs');
}

export async function getProfile(): Promise<CandidateProfile | undefined> {
  const db = await getDB();
  return db.get('profile', PROFILE_KEY);
}

export async function saveProfile(profile: CandidateProfile) {
  const db = await getDB();
  return db.put('profile', profile, PROFILE_KEY);
}
