import { describe, it, expect } from 'vitest';
import { validateBackupPayload, decryptAndValidateBackup } from '../lib/db';
import { encryptData } from '../lib/crypto';

describe('Database & Backup Schema Validation (db.ts)', () => {
  it('accepts a valid backup payload and returns accurate content summary', () => {
    const validBackup = JSON.stringify({
      version: 1,
      exportedAt: '2026-10-14T10:00:00.000Z',
      subjects: [
        { id: 'sub-1', code: 'CS-301', name: 'DSA', instructor: 'Dr. Tariq', creditHours: 4, color: '#3b82f6' },
      ],
      timetable: [
        { id: 'tt-1', subjectId: 'sub-1', day: 'Monday', startTime: '09:00', endTime: '10:30', classType: 'Lecture' },
      ],
      deadlines: [
        { id: 'dl-1', title: 'Binary Tree Lab', type: 'Assignment', dueDate: '2026-10-20', status: 'pending' },
      ],
      tasks: [
        { id: 't-1', title: 'Practice Graph BFS', category: 'DSA & OOP', priority: 'high', status: 'not_started' },
      ],
      goals: [
        { id: 'g-1', title: 'Master C++ STL', description: 'Deep dive', category: 'cpp_python', targetDate: '2026-12-01', status: 'active', milestones: [], createdAt: '', updatedAt: '' },
      ],
      studySessions: [
        { id: 's-1', title: 'Trees Study', startTime: '2026-10-14T10:00:00.000Z', endTime: '2026-10-14T10:45:00.000Z', durationMinutes: 45, sessionType: 'pomodoro', isMeasured: true },
      ],
      reflections: [
        { id: 'r-1', date: '2026-10-14', wellDone: 'Focused', mistakes: 'None', learnedConcept: 'Heaps', distractions: [], tomorrowImprovement: 'Start early', gratitudeOrPride: 'Grateful', createdAt: '' },
      ],
      weeklyReviews: [],
      settings: {
        studentProfile: { name: 'Amjad' },
      },
    });

    const result = validateBackupPayload(validBackup);
    expect(result.valid).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary?.subjectsCount).toBe(1);
    expect(result.summary?.tasksCount).toBe(1);
    expect(result.summary?.sessionsCount).toBe(1);
  });

  it('rejects invalid JSON syntax', () => {
    const invalidJson = '{"version": 1, "tasks": [';
    const result = validateBackupPayload(invalidJson);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/syntax/i);
  });

  it('rejects missing or unsupported backup version', () => {
    const missingVersion = JSON.stringify({ subjects: [] });
    const result = validateBackupPayload(missingVersion);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unsupported or missing backup schema version/i);
  });

  it('rejects malformed task items to prevent IndexedDB corruption', () => {
    const corruptedTask = JSON.stringify({
      version: 1,
      tasks: [
        { id: 't-1' }, // Missing required 'title' and 'status'
      ],
    });

    const result = validateBackupPayload(corruptedTask);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/malformed task at index 0/i);
  });

  it('rejects non-array collections', () => {
    const badSubjects = JSON.stringify({
      version: 1,
      subjects: 'not-an-array',
    });

    const result = validateBackupPayload(badSubjects);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/"subjects" must be an array/i);
  });

  it('correctly validates decrypted backup using decryptAndValidateBackup', async () => {
    const validData = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: [],
      timetable: [],
      deadlines: [],
      tasks: [{ id: 'task-real-1', title: 'Calculus assignment 2', category: 'University', priority: 'high', status: 'not_started' }],
      goals: [],
      studySessions: [],
      reflections: [],
      weeklyReviews: [],
      settings: { studentProfile: { name: 'Amjad Roghani', university: 'UMT Lahore' } },
    });

    const passphrase = 'SecretPassphrase123!';
    const encryptedPkg = await encryptData(validData, passphrase);
    const containerStr = JSON.stringify({
      app: 'My AI Mentor',
      format: 'encrypted-backup',
      version: 1,
      payload: encryptedPkg,
    });

    // Valid passphrase decrypts and validates
    const successResult = await decryptAndValidateBackup(containerStr, passphrase);
    expect(successResult.valid).toBe(true);
    expect(successResult.summary?.tasksCount).toBe(1);

    // Invalid passphrase fails with informative error
    const failedResult = await decryptAndValidateBackup(containerStr, 'WrongPassphrase');
    expect(failedResult.valid).toBe(false);
    expect(failedResult.error).toMatch(/Decryption failed/i);
  });
});

