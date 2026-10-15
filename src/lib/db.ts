/**
 * IndexedDB Local-First Database Service
 * Uses `idb` wrapper around native browser IndexedDB.
 * Guarantees zero cloud data leakage unless student opts in,
 * survives laptop restarts and browser refreshes.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { encryptData, decryptData } from './crypto';
import {
  UniversitySubject,
  TimetableClass,
  Deadline,
  Task,
  Goal,
  StudySession,
  DailyReflection,
  WeeklyReview,
  MentorMessage,
  AppSettings,
} from '../types';
import {
  INITIAL_SETTINGS,
  SAMPLE_SUBJECTS,
  SAMPLE_TIMETABLE,
  SAMPLE_DEADLINES,
  SAMPLE_GOALS,
  SAMPLE_TASKS,
  SAMPLE_STUDY_SESSIONS,
  SAMPLE_REFLECTIONS,
  SAMPLE_WEEKLY_REVIEW,
} from './sampleData';

interface MyAIMentorDB extends DBSchema {
  subjects: {
    key: string;
    value: UniversitySubject;
  };
  timetable: {
    key: string;
    value: TimetableClass;
    indexes: { 'by-day': string };
  };
  deadlines: {
    key: string;
    value: Deadline;
    indexes: { 'by-due': string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-planned-date': string; 'by-status': string };
  };
  goals: {
    key: string;
    value: Goal;
    indexes: { 'by-category': string };
  };
  studySessions: {
    key: string;
    value: StudySession;
    indexes: { 'by-start': string };
  };
  reflections: {
    key: string;
    value: DailyReflection;
    indexes: { 'by-date': string };
  };
  weeklyReviews: {
    key: string;
    value: WeeklyReview;
  };
  mentorChat: {
    key: string;
    value: MentorMessage;
  };
  settings: {
    key: string;
    value: { key: string; data: any };
  };
}

const DB_NAME = 'MyAIMentor_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MyAIMentorDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MyAIMentorDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MyAIMentorDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('subjects')) {
          db.createObjectStore('subjects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('timetable')) {
          const ttStore = db.createObjectStore('timetable', { keyPath: 'id' });
          ttStore.createIndex('by-day', 'day');
        }
        if (!db.objectStoreNames.contains('deadlines')) {
          const dlStore = db.createObjectStore('deadlines', { keyPath: 'id' });
          dlStore.createIndex('by-due', 'dueDate');
        }
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-planned-date', 'plannedDate');
          taskStore.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('goals')) {
          const goalStore = db.createObjectStore('goals', { keyPath: 'id' });
          goalStore.createIndex('by-category', 'category');
        }
        if (!db.objectStoreNames.contains('studySessions')) {
          const sessionStore = db.createObjectStore('studySessions', { keyPath: 'id' });
          sessionStore.createIndex('by-start', 'startTime');
        }
        if (!db.objectStoreNames.contains('reflections')) {
          const refStore = db.createObjectStore('reflections', { keyPath: 'id' });
          refStore.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('weeklyReviews')) {
          db.createObjectStore('weeklyReviews', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('mentorChat')) {
          db.createObjectStore('mentorChat', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Clear all personal application records from local database.
 * Preserves user settings and schema.
 */
export async function clearAllPersonalRecords(providedDb?: IDBPDatabase<MyAIMentorDB>): Promise<void> {
  const db = providedDb || (await getDB());
  const tx = db.transaction(
    ['subjects', 'timetable', 'deadlines', 'tasks', 'goals', 'studySessions', 'reflections', 'weeklyReviews', 'mentorChat'],
    'readwrite'
  );

  await tx.objectStore('subjects').clear();
  await tx.objectStore('timetable').clear();
  await tx.objectStore('deadlines').clear();
  await tx.objectStore('tasks').clear();
  await tx.objectStore('goals').clear();
  await tx.objectStore('studySessions').clear();
  await tx.objectStore('reflections').clear();
  await tx.objectStore('weeklyReviews').clear();
  await tx.objectStore('mentorChat').clear();

  await tx.done;
}

/**
 * Initialize database with clean state. Never auto-seeds fake records.
 * Automatically clears previous demo data if found so student starts from zero.
 */
export async function initDatabase(): Promise<void> {
  const db = await getDB();

  // Ensure default clean settings exist if not already created
  const existingSettings = await db.get('settings', 'appSettings');
  if (!existingSettings) {
    await db.put('settings', { key: 'appSettings', data: INITIAL_SETTINGS });
  } else {
    // If semester was placeholder or old 4th semester, ensure profile is aligned
    if (existingSettings.data?.studentProfile?.university === 'BS Artificial Intelligence') {
      const updated = {
        ...existingSettings.data,
        studentProfile: {
          ...existingSettings.data.studentProfile,
          university: 'UMT Lahore',
          degree: 'BS Artificial Intelligence',
          semester: '3rd Semester',
        },
      };
      await db.put('settings', { key: 'appSettings', data: updated });
    }
  }

  // Detect and purge old template demo records (e.g. sub-1 / CS-301)
  const existingSubjects = await db.getAll('subjects');
  const isPreviousDemoData = existingSubjects.some(
    s => s.id === 'sub-1' || s.code === 'CS-301' || s.name === 'Data Structures & Algorithms'
  );

  if (isPreviousDemoData) {
    await clearAllPersonalRecords(db);
  }
}

/**
 * Full Database Export for Backup
 */
export async function exportAllData(stripSecrets = true): Promise<string> {
  const db = await getDB();
  const rawSettings = (await db.get('settings', 'appSettings'))?.data || INITIAL_SETTINGS;
  const settings = stripSecrets
    ? {
        ...rawSettings,
        security: {
          ...rawSettings.security,
          pinHash: undefined,
          salt: undefined,
          recoveryPhraseHash: undefined,
          pinVaultPackage: undefined,
          recoveryVaultPackage: undefined,
        },
      }
    : rawSettings;

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: await db.getAll('subjects'),
    timetable: await db.getAll('timetable'),
    deadlines: await db.getAll('deadlines'),
    tasks: await db.getAll('tasks'),
    goals: await db.getAll('goals'),
    studySessions: await db.getAll('studySessions'),
    reflections: await db.getAll('reflections'),
    weeklyReviews: await db.getAll('weeklyReviews'),
    settings,
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Export full backup encrypted with user passphrase using AES-GCM 256-bit
 */
export async function exportEncryptedBackup(passphrase: string): Promise<string> {
  const plaintextJson = await exportAllData(false);
  const encryptedPkg = await encryptData(plaintextJson, passphrase);
  const container = {
    app: 'My AI Mentor',
    format: 'encrypted-backup',
    version: 1,
    encryptedAt: new Date().toISOString(),
    payload: encryptedPkg,
  };
  return JSON.stringify(container, null, 2);
}

/**
 * Decrypt and validate an encrypted backup container
 */
export async function decryptAndValidateBackup(
  encryptedJsonString: string,
  passphrase: string
): Promise<BackupValidationResult> {
  try {
    const container = JSON.parse(encryptedJsonString);
    if (!container || container.format !== 'encrypted-backup' || !container.payload) {
      return { valid: false, error: 'File is not a valid encrypted My AI Mentor backup.' };
    }
    const decryptedJson = await decryptData(container.payload, passphrase);
    return validateBackupPayload(decryptedJson);
  } catch (err: any) {
    return {
      valid: false,
      error: 'Decryption failed. Incorrect passphrase or corrupted backup file.',
    };
  }
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  summary?: {
    version: number;
    exportedAt?: string;
    subjectsCount: number;
    timetableCount: number;
    deadlinesCount: number;
    tasksCount: number;
    goalsCount: number;
    sessionsCount: number;
    reflectionsCount: number;
    reviewsCount: number;
  };
  data?: any;
}

/**
 * Validate imported JSON structure, schema versions, and data types before accepting a backup.
 * Prevents malformed backups from partially overwriting existing records.
 */
export function validateBackupPayload(jsonString: string): BackupValidationResult {
  if (!jsonString || typeof jsonString !== 'string') {
    return { valid: false, error: 'Backup payload is empty or not a string.' };
  }

  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON syntax: ${err?.message || 'Parse error'}` };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'Backup payload must be a JSON object.' };
  }

  // Version check (only version 1 currently supported)
  if (typeof data.version !== 'number' || data.version < 1) {
    return { valid: false, error: `Unsupported or missing backup schema version: ${data.version}` };
  }

  // Helper validation functions
  const isString = (v: any) => typeof v === 'string';
  const isOptionalString = (v: any) => v === undefined || v === null || typeof v === 'string';

  // Validate subjects
  if (data.subjects !== undefined) {
    if (!Array.isArray(data.subjects)) {
      return { valid: false, error: 'Malformed backup: "subjects" must be an array.' };
    }
    for (let i = 0; i < data.subjects.length; i++) {
      const s = data.subjects[i];
      if (!s || typeof s !== 'object' || !isString(s.id) || !isString(s.code) || !isString(s.name)) {
        return { valid: false, error: `Malformed subject at index ${i}: must include id, code, and name strings.` };
      }
    }
  }

  // Validate timetable
  if (data.timetable !== undefined) {
    if (!Array.isArray(data.timetable)) {
      return { valid: false, error: 'Malformed backup: "timetable" must be an array.' };
    }
    for (let i = 0; i < data.timetable.length; i++) {
      const t = data.timetable[i];
      if (!t || typeof t !== 'object' || !isString(t.id) || !isString(t.day) || !isString(t.startTime) || !isString(t.endTime)) {
        return { valid: false, error: `Malformed timetable slot at index ${i}: must include id, day, startTime, and endTime.` };
      }
    }
  }

  // Validate deadlines
  if (data.deadlines !== undefined) {
    if (!Array.isArray(data.deadlines)) {
      return { valid: false, error: 'Malformed backup: "deadlines" must be an array.' };
    }
    for (let i = 0; i < data.deadlines.length; i++) {
      const d = data.deadlines[i];
      if (!d || typeof d !== 'object' || !isString(d.id) || !isString(d.title) || !isString(d.dueDate)) {
        return { valid: false, error: `Malformed deadline at index ${i}: must include id, title, and dueDate.` };
      }
    }
  }

  // Validate tasks
  if (data.tasks !== undefined) {
    if (!Array.isArray(data.tasks)) {
      return { valid: false, error: 'Malformed backup: "tasks" must be an array.' };
    }
    for (let i = 0; i < data.tasks.length; i++) {
      const t = data.tasks[i];
      if (!t || typeof t !== 'object' || !isString(t.id) || !isString(t.title) || !isString(t.status)) {
        return { valid: false, error: `Malformed task at index ${i}: must include id, title, and status.` };
      }
    }
  }

  // Validate goals
  if (data.goals !== undefined) {
    if (!Array.isArray(data.goals)) {
      return { valid: false, error: 'Malformed backup: "goals" must be an array.' };
    }
    for (let i = 0; i < data.goals.length; i++) {
      const g = data.goals[i];
      if (!g || typeof g !== 'object' || !isString(g.id) || !isString(g.title) || !Array.isArray(g.milestones)) {
        return { valid: false, error: `Malformed goal at index ${i}: must include id, title, and milestones array.` };
      }
    }
  }

  // Validate studySessions
  if (data.studySessions !== undefined) {
    if (!Array.isArray(data.studySessions)) {
      return { valid: false, error: 'Malformed backup: "studySessions" must be an array.' };
    }
    for (let i = 0; i < data.studySessions.length; i++) {
      const ses = data.studySessions[i];
      if (!ses || typeof ses !== 'object' || !isString(ses.id) || typeof ses.durationMinutes !== 'number') {
        return { valid: false, error: `Malformed studySession at index ${i}: must include id and durationMinutes number.` };
      }
    }
  }

  // Validate reflections
  if (data.reflections !== undefined) {
    if (!Array.isArray(data.reflections)) {
      return { valid: false, error: 'Malformed backup: "reflections" must be an array.' };
    }
    for (let i = 0; i < data.reflections.length; i++) {
      const r = data.reflections[i];
      if (!r || typeof r !== 'object' || !isString(r.id) || !isString(r.date)) {
        return { valid: false, error: `Malformed reflection at index ${i}: must include id and date string.` };
      }
    }
  }

  // Validate weeklyReviews
  if (data.weeklyReviews !== undefined) {
    if (!Array.isArray(data.weeklyReviews)) {
      return { valid: false, error: 'Malformed backup: "weeklyReviews" must be an array.' };
    }
    for (let i = 0; i < data.weeklyReviews.length; i++) {
      const rev = data.weeklyReviews[i];
      if (!rev || typeof rev !== 'object' || !isString(rev.id) || !isString(rev.weekStartDate)) {
        return { valid: false, error: `Malformed weeklyReview at index ${i}: must include id and weekStartDate string.` };
      }
    }
  }

  // Validate settings if provided
  if (data.settings !== undefined) {
    if (typeof data.settings !== 'object' || data.settings === null) {
      return { valid: false, error: 'Malformed settings object in backup.' };
    }
  }

  return {
    valid: true,
    summary: {
      version: data.version,
      exportedAt: isOptionalString(data.exportedAt) ? data.exportedAt : undefined,
      subjectsCount: (data.subjects || []).length,
      timetableCount: (data.timetable || []).length,
      deadlinesCount: (data.deadlines || []).length,
      tasksCount: (data.tasks || []).length,
      goalsCount: (data.goals || []).length,
      sessionsCount: (data.studySessions || []).length,
      reflectionsCount: (data.reflections || []).length,
      reviewsCount: (data.weeklyReviews || []).length,
    },
    data,
  };
}

/**
 * Full Database Import / Restore from JSON
 * Atomically replaces data only if the payload passes full schema validation.
 */
export async function importAllData(jsonString: string): Promise<{ success: boolean; error?: string; summary?: any }> {
  const validation = validateBackupPayload(jsonString);
  if (!validation.valid || !validation.data) {
    return { success: false, error: validation.error || 'Backup validation failed.' };
  }

  const data = validation.data;
  try {
    const db = await getDB();
    const tx = db.transaction(
      ['subjects', 'timetable', 'deadlines', 'tasks', 'goals', 'studySessions', 'reflections', 'weeklyReviews', 'settings'],
      'readwrite'
    );

    // Clear existing stores safely inside transaction
    await tx.objectStore('subjects').clear();
    await tx.objectStore('timetable').clear();
    await tx.objectStore('deadlines').clear();
    await tx.objectStore('tasks').clear();
    await tx.objectStore('goals').clear();
    await tx.objectStore('studySessions').clear();
    await tx.objectStore('reflections').clear();
    await tx.objectStore('weeklyReviews').clear();

    // Populate validated items
    if (Array.isArray(data.subjects)) {
      for (const item of data.subjects) await tx.objectStore('subjects').put(item);
    }
    if (Array.isArray(data.timetable)) {
      for (const item of data.timetable) await tx.objectStore('timetable').put(item);
    }
    if (Array.isArray(data.deadlines)) {
      for (const item of data.deadlines) await tx.objectStore('deadlines').put(item);
    }
    if (Array.isArray(data.tasks)) {
      for (const item of data.tasks) await tx.objectStore('tasks').put(item);
    }
    if (Array.isArray(data.goals)) {
      for (const item of data.goals) await tx.objectStore('goals').put(item);
    }
    if (Array.isArray(data.studySessions)) {
      for (const item of data.studySessions) await tx.objectStore('studySessions').put(item);
    }
    if (Array.isArray(data.reflections)) {
      for (const item of data.reflections) await tx.objectStore('reflections').put(item);
    }
    if (Array.isArray(data.weeklyReviews)) {
      for (const item of data.weeklyReviews) await tx.objectStore('weeklyReviews').put(item);
    }
    if (data.settings) {
      await tx.objectStore('settings').put({ key: 'appSettings', data: data.settings });
    }

    await tx.done;
    return { success: true, summary: validation.summary };
  } catch (err: any) {
    console.error('Database transaction error during import:', err);
    return { success: false, error: `Restore failed during database write: ${err?.message || 'Database error'}` };
  }
}
