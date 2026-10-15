import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
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
  TaskStatus,
  MentorMode,
  DayOfWeek,
} from '../types';
import {
  getDB,
  initDatabase,
  exportAllData,
  importAllData,
  validateBackupPayload,
  exportEncryptedBackup,
  decryptAndValidateBackup,
  clearAllPersonalRecords,
  BackupValidationResult,
} from '../lib/db';
import {
  hashSecret,
  verifySecret,
  generateSalt,
  hashRecoveryPhrase,
  generateVaultKey,
  packageVaultKey,
  recoverVaultKey,
} from '../lib/crypto';
import { getLocalDateString, getTomorrowDateString, getLocalDayName } from '../lib/dateUtils';
import { INITIAL_SETTINGS } from '../lib/sampleData';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
  validateFirestoreConnection,
} from '../lib/firebase';
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

export type ActiveView =
  | 'dashboard'
  | 'university'
  | 'tasks'
  | 'goals'
  | 'timer'
  | 'reflection'
  | 'review'
  | 'mentor'
  | 'settings';

interface AppContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Firebase Auth
  currentUser: FirebaseUser | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isFirestoreConnected: boolean;

  // Voice Modal
  isVoiceModalOpen: boolean;
  setIsVoiceModalOpen: (open: boolean) => void;

  // Lock & Security
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: (pin: string) => Promise<{ success: boolean; error?: string }>;
  enablePinLock: (pin: string, recoveryPhrase: string) => Promise<boolean>;
  disablePinLock: () => Promise<boolean>;
  emergencyResetWithPhrase: (phrase: string) => Promise<boolean>;
  lockSettings: AppSettings['security'];

  // Data
  subjects: UniversitySubject[];
  timetable: TimetableClass[];
  deadlines: Deadline[];
  tasks: Task[];
  goals: Goal[];
  studySessions: StudySession[];
  reflections: DailyReflection[];
  weeklyReviews: WeeklyReview[];
  mentorMessages: MentorMessage[];
  settings: AppSettings;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus, missedReason?: string) => Promise<void>;

  // University actions
  addSubject: (subject: Omit<UniversitySubject, 'id'>) => Promise<UniversitySubject>;
  updateSubject: (subject: UniversitySubject) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;

  addClassSlot: (slot: Omit<TimetableClass, 'id'>) => Promise<TimetableClass>;
  updateClassSlot: (slot: TimetableClass) => Promise<void>;
  deleteClassSlot: (id: string) => Promise<void>;

  addDeadline: (deadline: Omit<Deadline, 'id'>) => Promise<Deadline>;
  updateDeadline: (deadline: Deadline) => Promise<void>;
  deleteDeadline: (id: string) => Promise<void>;

  // Goal actions
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Goal>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  toggleMilestone: (goalId: string, milestoneId: string) => Promise<void>;

  // Study timer actions
  logStudySession: (session: Omit<StudySession, 'id'>) => Promise<StudySession>;

  // Reflection & Review actions
  saveReflection: (reflection: Omit<DailyReflection, 'id' | 'createdAt'>) => Promise<DailyReflection>;
  saveWeeklyReview: (review: Omit<WeeklyReview, 'id' | 'createdAt'>) => Promise<WeeklyReview>;

  // Mentor Chat
  addMentorMessage: (message: Omit<MentorMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearMentorHistory: () => Promise<void>;

  // In-app Toast Notification (Non-blocking replacement for window.alert)
  notification: { id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  dismissNotification: () => void;

  // Onboarding
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;

  // Settings & System
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  exportBackup: () => Promise<string>;
  exportEncryptedBackupAction: (passphrase: string) => Promise<string>;
  validateBackup: (jsonStr: string) => BackupValidationResult;
  decryptAndValidateBackupAction: (encryptedJsonStr: string, passphrase: string) => Promise<BackupValidationResult>;
  importBackup: (jsonStr: string) => Promise<{ success: boolean; error?: string; summary?: any }>;
  resetAllData: () => Promise<void>;
  clearAllPersonalRecordsAndReset: () => Promise<void>;
  syncLocalDataToCloud: () => Promise<{ success: boolean; error?: string; count?: number }>;
  pullCloudDataToLocal: () => Promise<{ success: boolean; error?: string; count?: number }>;

  // Computed Real Analytics
  todayTasks: Task[];
  tomorrowTasks: Task[];
  todaySchedule: Array<{ slot: TimetableClass; subject: UniversitySubject }>;
  nextClass: { slot: TimetableClass; subject: UniversitySubject; startsInMinutes: number } | null;
  todayStudyMinutes: number;
  weekStudyMinutes: number;
  upcomingDeadlines: Deadline[];
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  // Live Voice Modal State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Security Lock state
  const [isLocked, setIsLocked] = useState(false);

  // Entities state
  const [subjects, setSubjects] = useState<UniversitySubject[]>([]);
  const [timetable, setTimetable] = useState<TimetableClass[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [mentorMessages, setMentorMessages] = useState<MentorMessage[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  // In-app notification toast state (replaces window.alert for iFrame and desktop reliability)
  const [notification, setNotification] = useState<{
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
      const id = `${Date.now()}-${Math.random()}`;
      setNotification({ id, message, type });
      setTimeout(() => {
        setNotification(prev => (prev?.id === id ? null : prev));
      }, 4000);
    },
    []
  );

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // First-run / Onboarding modal state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Validate Firestore and listen to Firebase Auth
  useEffect(() => {
    validateFirestoreConnection().then(connected => {
      setIsFirestoreConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Sync user profile to Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'BS AI Student',
            photoURL: user.photoURL || '',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Load from IndexedDB
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      await initDatabase();
      const localDb = await getDB();

      const [
        loadedSubjects,
        loadedTimetable,
        loadedDeadlines,
        loadedTasks,
        loadedGoals,
        loadedSessions,
        loadedReflections,
        loadedReviews,
        loadedChat,
        loadedSettingsRecord,
      ] = await Promise.all([
        localDb.getAll('subjects'),
        localDb.getAll('timetable'),
        localDb.getAll('deadlines'),
        localDb.getAll('tasks'),
        localDb.getAll('goals'),
        localDb.getAll('studySessions'),
        localDb.getAll('reflections'),
        localDb.getAll('weeklyReviews'),
        localDb.getAll('mentorChat'),
        localDb.get('settings', 'appSettings'),
      ]);

      setSubjects(loadedSubjects);
      setTimetable(loadedTimetable);
      setDeadlines(loadedDeadlines);
      setTasks(loadedTasks);
      setGoals(loadedGoals);
      setStudySessions(loadedSessions);
      setReflections(loadedReflections);
      setWeeklyReviews(loadedReviews);
      setMentorMessages(loadedChat);

      const resolvedSettings: AppSettings = loadedSettingsRecord?.data || INITIAL_SETTINGS;
      setSettings(resolvedSettings);

      // Prompt onboarding if first time
      if (!resolvedSettings.onboardingCompleted && loadedSubjects.length === 0) {
        setIsOnboardingOpen(true);
      }

      // Lock status on startup
      if (resolvedSettings.security.isLockEnabled) {
        setIsLocked(true);
      }

      // Sync theme
      if (resolvedSettings.theme === 'light') {
        setTheme('light');
        document.documentElement.classList.remove('dark');
      } else {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      }
    } catch (err) {
      console.error('Failed to initialize local database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Google Sign-In & Sign-Out
  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      showNotification(
        'Google Sign-In was cancelled or failed. Your local study records remain active.',
        'info'
      );
    }
  }, [showNotification]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }, []);

  // Inactivity auto-lock listener
  useEffect(() => {
    if (!settings.security.isLockEnabled || settings.security.autoLockMinutes <= 0 || isLocked) {
      return;
    }

    let timeoutId: any;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
      }, settings.security.autoLockMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [settings.security.isLockEnabled, settings.security.autoLockMinutes, isLocked]);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  // Lock Actions
  const lockApp = useCallback(() => {
    if (settings.security.isLockEnabled) {
      setIsLocked(true);
    }
  }, [settings.security.isLockEnabled]);

  const unlockApp = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      const sec = settings.security;
      const now = Date.now();

      if (sec.lockoutUntil && sec.lockoutUntil > now) {
        const remainingMinutes = Math.ceil((sec.lockoutUntil - now) / 60000);
        return {
          success: false,
          error: `Too many failed attempts. Locked for security. Try again in ${remainingMinutes} minute(s).`,
        };
      }

      if (!sec.pinHash || !sec.salt) {
        setIsLocked(false);
        return { success: true };
      }

      const isValid = await verifySecret(pin, sec.pinHash, sec.salt);
      const localDb = await getDB();

      if (isValid) {
        const updatedSettings: AppSettings = {
          ...settings,
          security: {
            ...sec,
            failedAttempts: 0,
            lockoutUntil: undefined,
          },
        };
        setSettings(updatedSettings);
        await localDb.put('settings', { key: 'appSettings', data: updatedSettings });
        setIsLocked(false);
        return { success: true };
      } else {
        const failedAttempts = (sec.failedAttempts || 0) + 1;
        let lockoutUntil: number | undefined = undefined;

        if (failedAttempts >= 5) {
          lockoutUntil = now + 10 * 60 * 1000;
        }

        const updatedSettings: AppSettings = {
          ...settings,
          security: {
            ...sec,
            failedAttempts,
            lockoutUntil,
          },
        };
        setSettings(updatedSettings);
        await localDb.put('settings', { key: 'appSettings', data: updatedSettings });

        return {
          success: false,
          error:
            failedAttempts >= 5
              ? '5 failed attempts reached. App locked for 10 minutes.'
              : `Incorrect PIN. ${5 - failedAttempts} attempt(s) remaining.`,
        };
      }
    },
    [settings]
  );

  const enablePinLock = useCallback(
    async (pin: string, recoveryPhrase: string): Promise<boolean> => {
      const salt = generateSalt();
      const pinHash = await hashSecret(pin, salt);
      const cleanPhrase = recoveryPhrase.trim().toLowerCase();
      const recoveryPhraseHash = await hashRecoveryPhrase(cleanPhrase);

      // Generate cryptographically secure 256-bit vault master key
      const vaultKey = generateVaultKey();

      // Package vault key with both PIN and Recovery Phrase for genuine recovery
      const pinVaultPackage = await packageVaultKey(vaultKey, pin);
      const recoveryVaultPackage = await packageVaultKey(vaultKey, cleanPhrase);

      const updatedSettings: AppSettings = {
        ...settings,
        security: {
          ...settings.security,
          isLockEnabled: true,
          pinHash,
          salt,
          recoveryPhraseHash,
          pinVaultPackage,
          recoveryVaultPackage,
          failedAttempts: 0,
          lockoutUntil: undefined,
        },
      };

      const localDb = await getDB();
      await localDb.put('settings', { key: 'appSettings', data: updatedSettings });
      setSettings(updatedSettings);
      return true;
    },
    [settings]
  );

  const disablePinLock = useCallback(async (): Promise<boolean> => {
    const updatedSettings: AppSettings = {
      ...settings,
      security: {
        isLockEnabled: false,
        autoLockMinutes: 15,
        failedAttempts: 0,
      },
    };
    const localDb = await getDB();
    await localDb.put('settings', { key: 'appSettings', data: updatedSettings });
    setSettings(updatedSettings);
    setIsLocked(false);
    return true;
  }, [settings]);

  const emergencyResetWithPhrase = useCallback(
    async (phrase: string): Promise<boolean> => {
      const sec = settings.security;
      if (!sec.recoveryPhraseHash && !sec.recoveryVaultPackage) return false;

      const cleanPhrase = phrase.trim().toLowerCase();
      let keyRecovered = false;

      if (sec.recoveryVaultPackage) {
        const recoveredKey = await recoverVaultKey(sec.recoveryVaultPackage, cleanPhrase);
        if (recoveredKey) {
          keyRecovered = true;
        }
      }

      const phraseHash = await hashRecoveryPhrase(cleanPhrase);
      if (keyRecovered || phraseHash === sec.recoveryPhraseHash) {
        // Genuine recovery success: reset lock state while keeping all records safely intact
        await disablePinLock();
        return true;
      }
      return false;
    },
    [settings.security, disablePinLock]
  );

  // Helper to check if cloud synchronization is explicitly allowed by the student
  const shouldSyncToCloud = useCallback(() => {
    return Boolean(currentUser && settings.privacy.cloudSyncEnabled);
  }, [currentUser, settings.privacy.cloudSyncEnabled]);

  // Task Actions (Local-first IndexedDB, with optional opt-in cloud sync)
  const addTask = useCallback(async (taskInput: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...taskInput,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const localDb = await getDB();
    await localDb.put('tasks', newTask);
    setTasks(prev => [newTask, ...prev]);

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/tasks`, newTask.id), {
          ...newTask,
          userId: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/tasks/${newTask.id}`);
      }
    }

    return newTask;
  }, [currentUser, shouldSyncToCloud]);

  const updateTask = useCallback(async (updated: Task) => {
    const localDb = await getDB();
    const taskWithTimestamp = { ...updated, updatedAt: new Date().toISOString() };
    await localDb.put('tasks', taskWithTimestamp);
    setTasks(prev => prev.map(t => (t.id === updated.id ? taskWithTimestamp : t)));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/tasks`, updated.id), {
          ...taskWithTimestamp,
          userId: currentUser.uid,
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/tasks/${updated.id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  const deleteTask = useCallback(async (id: string) => {
    const localDb = await getDB();
    await localDb.delete('tasks', id);
    setTasks(prev => prev.filter(t => t.id !== id));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/tasks`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/tasks/${id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  const setTaskStatus = useCallback(
    async (id: string, status: TaskStatus, missedReason?: string) => {
      const target = tasks.find(t => t.id === id);
      if (!target) return;

      const updated: Task = {
        ...target,
        status,
        missedReason: status === 'skipped' || status === 'postponed' ? missedReason || target.missedReason : undefined,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      };
      await updateTask(updated);
    },
    [tasks, updateTask]
  );

  // University Subjects & Timetable
  const addSubject = useCallback(async (subInput: Omit<UniversitySubject, 'id'>) => {
    const newSubject: UniversitySubject = {
      ...subInput,
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const localDb = await getDB();
    await localDb.put('subjects', newSubject);
    setSubjects(prev => [...prev, newSubject]);

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/subjects`, newSubject.id), {
          ...newSubject,
          userId: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/subjects/${newSubject.id}`);
      }
    }
    return newSubject;
  }, [currentUser, shouldSyncToCloud]);

  const updateSubject = useCallback(async (updated: UniversitySubject) => {
    const localDb = await getDB();
    await localDb.put('subjects', updated);
    setSubjects(prev => prev.map(s => (s.id === updated.id ? updated : s)));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/subjects`, updated.id), {
          ...updated,
          userId: currentUser.uid,
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/subjects/${updated.id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  const deleteSubject = useCallback(async (id: string) => {
    const localDb = await getDB();
    await localDb.delete('subjects', id);
    setSubjects(prev => prev.filter(s => s.id !== id));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/subjects`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/subjects/${id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  const addClassSlot = useCallback(async (slotInput: Omit<TimetableClass, 'id'>) => {
    const newSlot: TimetableClass = {
      ...slotInput,
      id: `tt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const localDb = await getDB();
    await localDb.put('timetable', newSlot);
    setTimetable(prev => [...prev, newSlot]);

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/timetable`, newSlot.id), {
          ...newSlot,
          userId: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/timetable/${newSlot.id}`);
      }
    }
    return newSlot;
  }, [currentUser, shouldSyncToCloud]);

  const updateClassSlot = useCallback(async (updated: TimetableClass) => {
    const localDb = await getDB();
    await localDb.put('timetable', updated);
    setTimetable(prev => prev.map(s => (s.id === updated.id ? updated : s)));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/timetable`, updated.id), {
          ...updated,
          userId: currentUser.uid,
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/timetable/${updated.id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  const deleteClassSlot = useCallback(async (id: string) => {
    const localDb = await getDB();
    await localDb.delete('timetable', id);
    setTimetable(prev => prev.filter(s => s.id !== id));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/timetable`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/timetable/${id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  // Deadlines
  const addDeadline = useCallback(async (dlInput: Omit<Deadline, 'id'>) => {
    const newDeadline: Deadline = {
      ...dlInput,
      id: `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const localDb = await getDB();
    await localDb.put('deadlines', newDeadline);
    setDeadlines(prev => [...prev, newDeadline]);

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/deadlines`, newDeadline.id), {
          ...newDeadline,
          userId: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/deadlines/${newDeadline.id}`);
      }
    }
    return newDeadline;
  }, [currentUser, shouldSyncToCloud]);

  const updateDeadline = useCallback(async (updated: Deadline) => {
    const localDb = await getDB();
    await localDb.put('deadlines', updated);
    setDeadlines(prev => prev.map(d => (d.id === updated.id ? updated : d)));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/deadlines`, updated.id), {
          ...updated,
          userId: currentUser.uid,
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/deadlines/${updated.id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  const deleteDeadline = useCallback(async (id: string) => {
    const localDb = await getDB();
    await localDb.delete('deadlines', id);
    setDeadlines(prev => prev.filter(d => d.id !== id));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/deadlines`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/deadlines/${id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  // Goals & Milestones
  const addGoal = useCallback(async (goalInput: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGoal: Goal = {
      ...goalInput,
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const localDb = await getDB();
    await localDb.put('goals', newGoal);
    setGoals(prev => [...prev, newGoal]);

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/goals`, newGoal.id), {
          ...newGoal,
          userId: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/goals/${newGoal.id}`);
      }
    }
    return newGoal;
  }, [currentUser, shouldSyncToCloud]);

  const updateGoal = useCallback(async (updated: Goal) => {
    const localDb = await getDB();
    const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
    await localDb.put('goals', withTimestamp);
    setGoals(prev => prev.map(g => (g.id === updated.id ? withTimestamp : g)));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/goals`, updated.id), {
          ...withTimestamp,
          userId: currentUser.uid,
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/goals/${updated.id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  const deleteGoal = useCallback(async (id: string) => {
    const localDb = await getDB();
    await localDb.delete('goals', id);
    setGoals(prev => prev.filter(g => g.id !== id));

    if (shouldSyncToCloud() && currentUser) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/goals`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/goals/${id}`);
      }
    }
  }, [currentUser, shouldSyncToCloud]);

  const toggleMilestone = useCallback(
    async (goalId: string, milestoneId: string) => {
      const targetGoal = goals.find(g => g.id === goalId);
      if (!targetGoal) return;

      const updatedMilestones = targetGoal.milestones.map(m => {
        if (m.id === milestoneId) {
          const nextCompleted = !m.completed;
          return {
            ...m,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return m;
      });

      const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.completed);
      const updatedGoal: Goal = {
        ...targetGoal,
        status: allDone ? 'completed' : 'active',
        milestones: updatedMilestones,
        updatedAt: new Date().toISOString(),
      };
      await updateGoal(updatedGoal);
    },
    [goals, updateGoal]
  );

  // Study Sessions
  const logStudySession = useCallback(async (sessionInput: Omit<StudySession, 'id'>) => {
    const newSession: StudySession = {
      ...sessionInput,
      id: `ses-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const localDb = await getDB();
    await localDb.put('studySessions', newSession);
    setStudySessions(prev => [newSession, ...prev]);

    if (newSession.taskId) {
      const task = tasks.find(t => t.id === newSession.taskId);
      if (task) {
        const actual = (task.actualMinutes || 0) + newSession.durationMinutes;
        await updateTask({ ...task, actualMinutes: actual });
      }
    }

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/studySessions`, newSession.id), {
          ...newSession,
          userId: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/studySessions/${newSession.id}`);
      }
    }
    return newSession;
  }, [tasks, updateTask, currentUser, shouldSyncToCloud]);

  // Reflections & Reviews
  const saveReflection = useCallback(async (refInput: Omit<DailyReflection, 'id' | 'createdAt'>) => {
    const newRef: DailyReflection = {
      ...refInput,
      id: `ref-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const localDb = await getDB();
    await localDb.put('reflections', newRef);
    setReflections(prev => {
      const filtered = prev.filter(r => r.date !== newRef.date);
      return [newRef, ...filtered];
    });

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/reflections`, newRef.id), {
          ...newRef,
          userId: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/reflections/${newRef.id}`);
      }
    }
    return newRef;
  }, [currentUser, shouldSyncToCloud]);

  const saveWeeklyReview = useCallback(async (revInput: Omit<WeeklyReview, 'id' | 'createdAt'>) => {
    const newRev: WeeklyReview = {
      ...revInput,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const localDb = await getDB();
    await localDb.put('weeklyReviews', newRev);
    setWeeklyReviews(prev => [newRev, ...prev]);

    if (shouldSyncToCloud() && currentUser) {
      try {
        await setDoc(doc(db, `users/${currentUser.uid}/weeklyReviews`, newRev.id), {
          ...newRev,
          userId: currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/weeklyReviews/${newRev.id}`);
      }
    }
    return newRev;
  }, [currentUser, shouldSyncToCloud]);

  // Mentor Chat History
  const addMentorMessage = useCallback(async (msgInput: Omit<MentorMessage, 'id' | 'timestamp'>) => {
    const newMsg: MentorMessage = {
      ...msgInput,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    const localDb = await getDB();
    await localDb.put('mentorChat', newMsg);
    setMentorMessages(prev => [...prev, newMsg]);
  }, []);

  const clearMentorHistory = useCallback(async () => {
    const localDb = await getDB();
    await localDb.clear('mentorChat');
    setMentorMessages([]);
  }, []);

  // Settings
  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      getDB().then(localDb => localDb.put('settings', { key: 'appSettings', data: updated }));
      return updated;
    });
  }, []);

  // Backups & Data Management
  const exportBackup = useCallback(async () => {
    return await exportAllData();
  }, []);

  const exportEncryptedBackupAction = useCallback(async (passphrase: string): Promise<string> => {
    return await exportEncryptedBackup(passphrase);
  }, []);

  const validateBackup = useCallback((jsonStr: string): BackupValidationResult => {
    return validateBackupPayload(jsonStr);
  }, []);

  const decryptAndValidateBackupAction = useCallback(
    async (encryptedJsonStr: string, passphrase: string): Promise<BackupValidationResult> => {
      return await decryptAndValidateBackup(encryptedJsonStr, passphrase);
    },
    []
  );

  const importBackup = useCallback(async (jsonStr: string) => {
    const result = await importAllData(jsonStr);
    if (result.success) {
      await loadData();
    }
    return result;
  }, [loadData]);

  const clearAllPersonalRecordsAndReset = useCallback(async () => {
    await clearAllPersonalRecords();
    setSubjects([]);
    setTimetable([]);
    setDeadlines([]);
    setTasks([]);
    setGoals([]);
    setStudySessions([]);
    setReflections([]);
    setWeeklyReviews([]);
    setMentorMessages([]);
    showNotification('All personal records cleared. Database is clean for your own information.', 'success');
  }, [showNotification]);

  const resetAllData = useCallback(async () => {
    await clearAllPersonalRecords();
    const localDb = await getDB();
    await localDb.put('settings', { key: 'appSettings', data: INITIAL_SETTINGS });
    setSettings(INITIAL_SETTINGS);
    setSubjects([]);
    setTimetable([]);
    setDeadlines([]);
    setTasks([]);
    setGoals([]);
    setStudySessions([]);
    setReflections([]);
    setWeeklyReviews([]);
    setMentorMessages([]);
    setIsOnboardingOpen(true);
    showNotification('System reset to clean profile. Starting fresh from zero.', 'info');
  }, [showNotification]);

  const syncLocalDataToCloud = useCallback(async (): Promise<{ success: boolean; error?: string; count?: number }> => {
    if (!currentUser) {
      return { success: false, error: 'Please sign in with Google first before syncing.' };
    }
    try {
      let count = 0;
      const uid = currentUser.uid;

      for (const s of subjects) {
        await setDoc(doc(db, `users/${uid}/subjects`, s.id), { ...s, userId: uid }, { merge: true });
        count++;
      }
      for (const t of timetable) {
        await setDoc(doc(db, `users/${uid}/timetable`, t.id), { ...t, userId: uid }, { merge: true });
        count++;
      }
      for (const d of deadlines) {
        await setDoc(doc(db, `users/${uid}/deadlines`, d.id), { ...d, userId: uid }, { merge: true });
        count++;
      }
      for (const t of tasks) {
        await setDoc(doc(db, `users/${uid}/tasks`, t.id), { ...t, userId: uid }, { merge: true });
        count++;
      }
      for (const g of goals) {
        await setDoc(doc(db, `users/${uid}/goals`, g.id), { ...g, userId: uid }, { merge: true });
        count++;
      }
      for (const ses of studySessions) {
        await setDoc(doc(db, `users/${uid}/studySessions`, ses.id), { ...ses, userId: uid }, { merge: true });
        count++;
      }
      for (const r of reflections) {
        await setDoc(doc(db, `users/${uid}/reflections`, r.id), { ...r, userId: uid }, { merge: true });
        count++;
      }
      for (const w of weeklyReviews) {
        await setDoc(doc(db, `users/${uid}/weeklyReviews`, w.id), { ...w, userId: uid }, { merge: true });
        count++;
      }

      return { success: true, count };
    } catch (err: any) {
      console.error('Cloud sync failed:', err);
      return { success: false, error: err?.message || 'Sync failed.' };
    }
  }, [currentUser, subjects, timetable, deadlines, tasks, goals, studySessions, reflections, weeklyReviews]);

  const pullCloudDataToLocal = useCallback(async (): Promise<{ success: boolean; error?: string; count?: number }> => {
    if (!currentUser) {
      return { success: false, error: 'Please sign in with Google first to pull cloud records.' };
    }
    try {
      const uid = currentUser.uid;
      const [
        subSnap,
        ttSnap,
        dlSnap,
        taskSnap,
        goalSnap,
        sesSnap,
        refSnap,
        revSnap,
      ] = await Promise.all([
        getDocs(collection(db, `users/${uid}/subjects`)),
        getDocs(collection(db, `users/${uid}/timetable`)),
        getDocs(collection(db, `users/${uid}/deadlines`)),
        getDocs(collection(db, `users/${uid}/tasks`)),
        getDocs(collection(db, `users/${uid}/goals`)),
        getDocs(collection(db, `users/${uid}/studySessions`)),
        getDocs(collection(db, `users/${uid}/reflections`)),
        getDocs(collection(db, `users/${uid}/weeklyReviews`)),
      ]);

      const localDb = await getDB();
      const tx = localDb.transaction(
        ['subjects', 'timetable', 'deadlines', 'tasks', 'goals', 'studySessions', 'reflections', 'weeklyReviews'],
        'readwrite'
      );

      let count = 0;
      subSnap.forEach(docSnap => {
        tx.objectStore('subjects').put(docSnap.data() as UniversitySubject);
        count++;
      });
      ttSnap.forEach(docSnap => {
        tx.objectStore('timetable').put(docSnap.data() as TimetableClass);
        count++;
      });
      dlSnap.forEach(docSnap => {
        tx.objectStore('deadlines').put(docSnap.data() as Deadline);
        count++;
      });
      taskSnap.forEach(docSnap => {
        tx.objectStore('tasks').put(docSnap.data() as Task);
        count++;
      });
      goalSnap.forEach(docSnap => {
        tx.objectStore('goals').put(docSnap.data() as Goal);
        count++;
      });
      sesSnap.forEach(docSnap => {
        tx.objectStore('studySessions').put(docSnap.data() as StudySession);
        count++;
      });
      refSnap.forEach(docSnap => {
        tx.objectStore('reflections').put(docSnap.data() as DailyReflection);
        count++;
      });
      revSnap.forEach(docSnap => {
        tx.objectStore('weeklyReviews').put(docSnap.data() as WeeklyReview);
        count++;
      });

      await tx.done;
      await loadData();
      return { success: true, count };
    } catch (err: any) {
      console.error('Failed to pull from cloud:', err);
      return { success: false, error: err?.message || 'Failed to pull cloud records.' };
    }
  }, [currentUser, loadData]);

  // COMPUTED REAL DATA (Calculated using local timezone to prevent UTC offset drift)
  const todayStr = useMemo(() => getLocalDateString(), []);
  const tomorrowStr = useMemo(() => getTomorrowDateString(), []);
  const todayDayName = useMemo(() => getLocalDayName(), []);

  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.plannedDate === todayStr || (!t.plannedDate && t.status !== 'completed'));
  }, [tasks, todayStr]);

  const tomorrowTasks = useMemo(() => {
    return tasks.filter(t => t.plannedDate === tomorrowStr);
  }, [tasks, tomorrowStr]);

  const todaySchedule = useMemo(() => {
    const slots = timetable.filter(t => t.day === todayDayName);
    return slots
      .map(slot => ({
        slot,
        subject: subjects.find(s => s.id === slot.subjectId) || {
          id: slot.subjectId,
          code: 'Course',
          name: 'Course Name',
          instructor: 'TBD',
          creditHours: 3,
          color: '#64748b',
        },
      }))
      .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
  }, [timetable, subjects, todayDayName]);

  const nextClass = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const item of todaySchedule) {
      const [h, m] = item.slot.startTime.split(':').map(Number);
      const startMin = h * 60 + m;
      if (startMin >= currentMinutes) {
        return {
          ...item,
          startsInMinutes: startMin - currentMinutes,
        };
      }
    }
    return null;
  }, [todaySchedule]);

  const todayStudyMinutes = useMemo(() => {
    return studySessions
      .filter(s => s.startTime.startsWith(todayStr))
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [studySessions, todayStr]);

  const weekStudyMinutes = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    return studySessions
      .filter(s => s.startTime >= sevenDaysAgo)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [studySessions]);

  const upcomingDeadlines = useMemo(() => {
    return deadlines
      .filter(d => d.status !== 'graded')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [deadlines]);

  const value = {
    activeView,
    setActiveView,
    isLoading,
    theme,
    toggleTheme,
    currentUser,
    signInWithGoogle,
    signOut,
    isFirestoreConnected,
    isVoiceModalOpen,
    setIsVoiceModalOpen,
    isLocked,
    lockApp,
    unlockApp,
    enablePinLock,
    disablePinLock,
    emergencyResetWithPhrase,
    lockSettings: settings.security,
    subjects,
    timetable,
    deadlines,
    tasks,
    goals,
    studySessions,
    reflections,
    weeklyReviews,
    mentorMessages,
    settings,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    addSubject,
    updateSubject,
    deleteSubject,
    addClassSlot,
    updateClassSlot,
    deleteClassSlot,
    addDeadline,
    updateDeadline,
    deleteDeadline,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleMilestone,
    logStudySession,
    saveReflection,
    saveWeeklyReview,
    addMentorMessage,
    clearMentorHistory,
    notification,
    showNotification,
    dismissNotification,
    isOnboardingOpen,
    setIsOnboardingOpen,
    updateSettings,
    exportBackup,
    exportEncryptedBackupAction,
    validateBackup,
    decryptAndValidateBackupAction,
    importBackup,
    resetAllData,
    clearAllPersonalRecordsAndReset,
    syncLocalDataToCloud,
    pullCloudDataToLocal,
    todayTasks,
    tomorrowTasks,
    todaySchedule,
    nextClass,
    todayStudyMinutes,
    weekStudyMinutes,
    upcomingDeadlines,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
