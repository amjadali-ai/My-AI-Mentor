/**
 * My AI Mentor - Domain Types
 * BS Artificial Intelligence Student Study, Productivity & Life Management System
 */

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'postponed' | 'skipped';

export type TaskCategory =
  | 'University'
  | 'Programming'
  | 'AI & ML'
  | 'DSA & OOP'
  | 'Project'
  | 'Career Prep'
  | 'Personal Habit'
  | 'Revision';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  subjectId?: string; // Optional link to university subject
  goalId?: string; // Optional link to active goal
  milestoneId?: string; // Optional link to specific goal milestone
  priority: Priority;
  deadline?: string; // YYYY-MM-DD or ISO
  plannedDate?: string; // YYYY-MM-DD
  plannedTime?: string; // HH:mm
  estimatedMinutes: number;
  actualMinutes?: number;
  status: TaskStatus;
  missedReason?: string; // Tracked if postponed or skipped
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface UniversitySubject {
  id: string;
  code: string; // e.g. "CS-301", "AI-204"
  name: string; // e.g. "Data Structures & Algorithms"
  instructor: string;
  room?: string;
  creditHours: number;
  color: string; // Hex or Tailwind color token
  notes?: string;
  targetGrade?: string; // e.g. "A", "4.0"
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type ActivityType = 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Study Session' | 'Assignment Work' | 'Revision' | 'Break' | 'Personal';

export interface TimetableClass {
  id: string;
  subjectId: string; // Subject ID or "personal" / empty for non-subject activities
  title?: string; // Optional custom title for personal study/activity
  day: DayOfWeek;
  startTime: string; // HH:mm (24-hour)
  endTime: string; // HH:mm
  room?: string;
  classType: 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | ActivityType;
  isRecurring: boolean;
  notes?: string;
}

export type AssessmentType = 'Assignment' | 'Quiz' | 'Lab Report' | 'Midterm Exam' | 'Final Exam' | 'Term Project';

export interface Deadline {
  id: string;
  subjectId: string;
  title: string;
  type: AssessmentType;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  weightPercent?: number; // e.g. 15%
  maxScore?: number;
  obtainedScore?: number;
  status: 'pending' | 'submitted' | 'graded';
  notes?: string;
}

export type GoalCategory =
  | 'academic'
  | 'cpp_python'
  | 'oop_dsa'
  | 'ai_ml_data'
  | 'projects_research'
  | 'career'
  | 'personal'
  | 'ambition';

export interface Milestone {
  id: string;
  title: string;
  targetDate?: string;
  completed: boolean;
  completedAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  milestones: Milestone[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  subjectId?: string;
  taskId?: string;
  goalId?: string;
  title: string;
  startTime: string; // ISO
  endTime: string; // ISO
  durationMinutes: number;
  sessionType: 'pomodoro' | 'stopwatch' | 'manual';
  isMeasured: boolean; // true = timed by app; false = manual estimate
  reflection?: {
    whatStudied: string;
    whatLearned: string;
    whatUnclear: string;
    whatToPracticeNext: string;
  };
}

export interface DailyReflection {
  id: string;
  date: string; // YYYY-MM-DD
  wellDone: string;
  mistakes: string;
  learnedConcept: string;
  distractions: string[]; // e.g. ["social media", "fatigue", "unclear instructions"]
  missedTasksAnalysis?: string;
  tomorrowImprovement: string;
  gratitudeOrPride: string;
  energyScore?: number; // 1-5
  focusScore?: number; // 1-5
  createdAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  summary: string;
  totalStudyMinutes: number;
  plannedTasksCount: number;
  completedTasksCount: number;
  skippedOrPostponedCount: number;
  wins: string[];
  recurringFriction: string[];
  nextWeekPriorities: string[];
  aiSynthesized: boolean;
  studentNotes?: string;
  createdAt: string;
}

export type MentorMode = 'mentor' | 'coach' | 'strict' | 'support';

export interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: MentorMode;
  timestamp: string;
  suggestedTasks?: Array<{
    title: string;
    category: TaskCategory;
    estimatedMinutes: number;
    priority: Priority;
    subjectId?: string;
  }>;
}

export interface AppSettings {
  studentProfile: {
    name: string;
    university: string;
    degree: string;
    semester: string;
    focusAreas: string[];
  };
  security: {
    isLockEnabled: boolean;
    pinHash?: string;
    salt?: string;
    autoLockMinutes: number; // 0 = never, 5, 10, 15, 30
    failedAttempts: number;
    lockoutUntil?: number; // timestamp ms
    recoveryPhraseHash?: string;
    pinVaultPackage?: { ciphertext: string; iv: string; salt: string };
    recoveryVaultPackage?: { ciphertext: string; iv: string; salt: string };
  };
  privacy: {
    shareReflectionsWithAi: boolean;
    shareTasksWithAi: boolean;
    shareTimetableWithAi: boolean;
    cloudSyncEnabled: boolean; // Explicit opt-in: false by default = pure local-first IndexedDB
  };
  theme: 'light' | 'dark' | 'system';
  onboardingCompleted?: boolean;
}

declare global {
  interface Window {
    desktopAPI?: {
      isDesktop: boolean;
      platform: string;
      getAppVersion: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      openDataFolder: () => Promise<void>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      openExternal: (url: string) => Promise<void>;
    };
  }
}
