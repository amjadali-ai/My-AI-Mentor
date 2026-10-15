# Project Plan: My AI Mentor

## Completed Milestones (Phase 1 & 2)

- [x] **Project Inspection & Architecture Setup**:
  - Validated repository and dependencies.
  - Selected local-first architecture using React 19 + TypeScript + Tailwind CSS + IndexedDB (`idb`).
  - Configured full-stack `server.ts` Express entry point for secure server-side Gemini API calls.
  - Configured metadata and fonts (`Plus Jakarta Sans` & `JetBrains Mono`).

- [x] **Persistent Storage Layer**:
  - Implemented IndexedDB schema with 10 object stores (`subjects`, `timetable`, `deadlines`, `tasks`, `goals`, `studySessions`, `reflections`, `weeklyReviews`, `mentorChat`, `settings`).
  - Implemented seed data generator for BS Artificial Intelligence curriculum (DSA, AI Search, C++ OOP, Linear Algebra, Databases).
  - Implemented full JSON database backup export and restoration.

- [x] **Security & App Locking**:
  - Built PBKDF2 salted password/PIN hashing with Web Crypto API.
  - Implemented 5-attempt rate-limiting and 10-minute lockout cooldown.
  - Implemented configurable inactivity auto-locking (1m, 5m, 15m, 30m, never).
  - Implemented emergency recovery phrase reset mechanism.

- [x] **Laptop-First Command Dashboard**:
  - Live clock & academic day/week display.
  - Today's university timetable with "Next class in X mins" alert badge.
  - Upcoming deadlines & assessment countdowns.
  - Today's task checklist with quick status transitions.
  - Planned vs actual study time tracking with progress rings.
  - Grounded AI Mentor daily recommendation card with 1-click task creation.

- [x] **University Coursework & Timetable Management**:
  - Full Subjects manager (code, name, teacher, room, credits, target grade, color).
  - Monday-Sunday interactive timetable schedule grid.
  - Assessment tracker for assignments, quizzes, labs, and exams with score tracking.

- [x] **Tasks & Tomorrow Planning**:
  - Priority and status management (Not started, In progress, Completed, Postponed, Skipped).
  - Missed-reason modal tracking why tasks were postponed or skipped.
  - **Quick Task Capture Bar & Floating Action Button (FAB)** on the Dashboard:
    - Persistent bottom input dock with keyboard shortcut (`Q` or `Enter` to submit).
    - Quick selectors for Today vs. Tomorrow, category, priority, and estimated duration chips (15m, 30m, 45m, 60m, 90m).
    - Collapsible floating action button with live toast notification.
  - Tomorrow evening planning workflow with overload detection (> 5.5 hours).
  - Gemini AI Tomorrow Assistant with student approval controls.

- [x] **Goals & Milestone Roadmaps**:
  - 8 BS AI categories (Academic, C++/Python, OOP & DSA, AI & ML, Projects & Research, Career, Personal, Ambition).
  - Mathematical milestone completion rate (strictly calculated from evidence).

- [x] **Study Timer & Session History**:
  - Pomodoro timer (25/5/15) & Stopwatch mode.
  - Subject, task, and goal linking.
  - Structured post-session reflection prompt ("What did I study? What did I learn? What is unclear? What to practice next?").
  - Subject distribution analytics.

- [x] **Daily Evening Reflection & Weakness Tracking**:
  - Evening reflection questionnaire (wins, concept learned, mistakes, tomorrow improvement, gratitude).
  - Distraction and weakness pattern analyzer.
  - Reflection archives.

- [x] **Weekly Sunday Review**:
  - 7-day performance report synthesizing actual recorded tasks, study time, and reflections.
  - AI review generator with offline rule fallback.

- [x] **AI Mentor Workspace (Gemini 3.8 Flash)**:
  - 4 Persona modes: Mentor, Coach, Strict Mentor, Support.
  - Context inspection and privacy toggles.
  - Suggested task converter with 1-click addition.

## Future Milestones (Later Phases)

- [ ] **Phase 7 — Android PWA & Responsive Touch Optimization**:
  - Configure Web App Manifest, icons, and service worker caching for static assets.
  - Test touch targets and mobile ergonomics.
- [ ] **Phase 8 — Voice Interaction (Opt-in)**:
  - Web Speech API integration for hands-free study check-in.
- [ ] **Phase 9 — Cross-Device Synchronization (Only when student requests)**:
  - Secure end-to-end encrypted sync mechanism between laptop and phone.
