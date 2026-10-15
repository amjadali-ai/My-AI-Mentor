# My AI Mentor
> Personal AI Study Mentor, Productivity, Self-Improvement and Life Management System for BS Artificial Intelligence Students.

## Overview
**My AI Mentor** is a laptop-first, local-first intelligent management application designed for undergraduate Artificial Intelligence and Computer Science students. It unifies:
1. **University Coursework & Timetable**: Manage subjects, daily/weekly class schedules, and deadlines (assignments, quizzes, labs, exams).
2. **Tasks & Tomorrow Planning**: Prioritized task tracking, time estimation vs. actual duration, and an evening tomorrow planner that prevents schedule overload.
3. **Goals & Milestones Roadmap**: Long-term progress tracking across 8 key domains (Academic, C++/Python, OOP & DSA, AI & ML, Projects & Research, Career, Personal, Ambition) with mathematically calculated progress.
4. **Study Timer & Session History**: Pomodoro and stopwatch timers with structured post-study reflections ("What did I study? What did I learn? What is unclear? What to practice next?").
5. **Daily Evening Reflection & Weakness Tracking**: Reflection questionnaire capturing daily wins, concept learnings, distraction patterns, and root-cause analysis of missed tasks.
6. **Weekly Sunday Progress Review**: Objective 7-day performance reports synthesizing completion rates, study distributions, and upcoming priorities.
7. **AI Mentor powered by Google Gemini**: 4 distinct mentor personas (Mentor, Coach, Strict Mentor, Support) with privacy controls and 1-click task conversion.
8. **Security & PIN Lock**: Salted PBKDF2 hash-based app locking, rate limiting (5 attempts per 10 minutes), inactivity auto-lock, and emergency recovery phrase.

## Architecture & Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion, Lucide icons.
- **Backend**: Express server with Vite middleware integration in development.
- **AI Integration**: Official `@google/genai` TypeScript SDK using `gemini-3.8-flash`. All AI calls are server-proxied (`/api/gemini/*`) to ensure API keys are never exposed to client bundles.
- **Storage**: Browser IndexedDB (`idb`) ensuring zero cloud data leakage, offline operation, and survival across laptop restarts and browser refreshes.
- **Security**: Web Crypto API (`crypto.subtle`) with PBKDF2 (100,000 iterations), unique cryptographic salt, and emergency SHA-256 recovery verification.

## Running the Application
```bash
# Install dependencies
npm install

# Start development server (serves on port 3000)
npm run dev

# Build production bundle
npm run build
```

## Backup & Restore
In the **Settings & Security** panel:
- Click **Export Full JSON Backup** to download your complete study records.
- Click **Restore from JSON** to reload records onto any device.
