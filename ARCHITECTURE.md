# Architecture Decisions: My AI Mentor

## 1. Storage Strategy: Local-First IndexedDB
### Context & Evaluation
The user specified a laptop-first personal application with strict privacy:
- The app must survive laptop restarts, browser closes, and refreshes.
- No remote database or Docker should be introduced without explicit approval.
- Future Android installation (PWA) must be supported without rewriting storage.

### Decision
We use browser **IndexedDB** via the official `idb` Promise library as the single source of truth:
- **Zero Cloud Leakage**: Personal notes, reflections, and grades never leave the student's laptop unless explicitly requested.
- **Offline Reliability**: The entire planner, timetable, and study timer work 100% offline.
- **Portability**: Full JSON export and restore capabilities allow manual backups and simple migration.
- **Future Mobile Path**: IndexedDB is supported natively in Android Chrome/Firefox/PWA, allowing seamless future mobile usage.

## 2. Server Architecture: Express with Vite Middleware
- We use a full-stack `server.ts` entry point running Express.
- In development, `vite.middlewares` is mounted directly, serving on port 3000.
- All Gemini AI requests route through server endpoints (`/api/gemini/mentor`, `/api/gemini/plan-tomorrow`, `/api/gemini/weekly-review`).
- **Secret Safety**: `GEMINI_API_KEY` is strictly accessed on the server via `process.env.GEMINI_API_KEY` and is never bundled in frontend assets.

## 3. Gemini AI Integration & Persona Modes
The AI mentor is decoupled behind dedicated server routes and provides 4 modes:
1. **Mentor (Default)**: Clarifies academic and STEM concepts, guides learning pathways, and advises on AI career preparation.
2. **Coach**: Action-oriented accountability partner; turns ambitions into achievable milestones.
3. **Strict Mentor**: Provides direct, honest feedback on execution vs. ambitions without insults, sarcasm, or shaming.
4. **Support**: De-stresses the student after overwhelming days and crafts minimum-viable recovery steps.

## 4. Privacy Boundary
- The student controls what context is shared with Google Gemini via opt-in toggles in the AI Mentor and Settings views.
- Reflection notes and private diary entries can be excluded from AI prompts at any time.
- All recommendations require student approval before creating tasks or modifying schedules.
