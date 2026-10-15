# Security Model & Threat Assessment: My AI Mentor

## 1. Threat Model
### Assets to Protect
1. Personal academic records, grades, and coursework scores.
2. Evening reflections, emotional ratings, and self-reported weaknesses.
3. API credentials (`GEMINI_API_KEY`).
4. Access to application state on shared or unattended laptops.

### Non-Goals (First Phase)
- Multi-user concurrent cloud collaboration (the app is strictly single-user for personal use).
- Multi-device distributed key management (postponed until user explicitly requests cloud sync).

## 2. PIN / Password Derivation & Lock Protection
- **No Plaintext Storage**: PINs are never stored in plain text in memory or IndexedDB.
- **Salted Key Derivation**: When a PIN is created, a cryptographically secure 16-byte random salt is generated via `window.crypto.getRandomValues`.
- **PBKDF2**: The PIN and salt are derived using PBKDF2 with 100,000 iterations and SHA-256 via the standard Web Crypto API (`crypto.subtle`).
- **Rate-Limiting & Lockout**:
  - Failed attempt counter is stored persistently in the security settings store.
  - Policy: A maximum of 5 consecutive failed attempts results in an automatic 10-minute lockout timestamp (`lockoutUntil`).
  - Brute-force guessing attacks are mitigated by both iteration cost and persistent lockout cooldown.
- **Emergency Recovery Phrase**:
  - An emergency recovery phrase is hashed via SHA-256 and stored alongside security settings.
  - If a student forgets their numeric PIN, supplying the exact recovery phrase resets the PIN lock.

## 3. API Key & Data Leakage Prevention
- `GEMINI_API_KEY` is loaded strictly on the Node.js server via `process.env.GEMINI_API_KEY`.
- No client-side code imports `@google/genai` or accesses `process.env.GEMINI_API_KEY`.
- The frontend never prompts for API keys in UI forms.
- Data sent to Gemini is sanitized and respects the student's context toggles (tasks, timetable, and reflections can be withheld).

## 4. Limitations
- Client-side browser storage (IndexedDB) is protected within the user's OS user profile. If another person has root or administrative access to the user's laptop OS account, they can inspect local browser storage.
- Full-disk encryption (e.g. BitLocker or FileVault) is recommended at the OS level for defense-in-depth.
