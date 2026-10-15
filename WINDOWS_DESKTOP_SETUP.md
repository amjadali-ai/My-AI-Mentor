# My AI Mentor — Windows Desktop Application Guide

## 1. Overview & Deliverable

My AI Mentor has been converted and packaged into a native Windows desktop application. You no longer need to open VS Code, run `npm run dev`, or open a browser every day.

- **Primary Deliverable**: `release/My AI Mentor Setup.exe` (Standalone Windows NSIS Installer)
- **Pre-Extracted Application**: `release/win-unpacked/My AI Mentor.exe` (Runs directly without installation)
- **Application Icon**: Custom graduation cap + AI neural network icon (`build/icon.ico`)
- **Architecture**: Secure Electron desktop shell with an in-process local loopback backend (`127.0.0.1:dynamic`) and high-performance IndexedDB database.

---

## 2. How to Install on Your Windows Laptop

1. Copy or download `My AI Mentor Setup.exe` from the `release/` directory to your laptop (e.g., your Downloads folder or Desktop).
2. **Double-click `My AI Mentor Setup.exe`**.
3. The standard Windows installer will launch:
   - Choose your installation location (default: `C:\Users\<YourUser>\AppData\Local\Programs\My AI Mentor`).
   - Check the box for **"Create Desktop Shortcut"**.
   - Click **Install**.
4. The installer creates:
   - A **Desktop Shortcut** with the custom icon.
   - A **Start Menu Entry** under "My AI Mentor".
   - An entry in Windows **Installed Apps / Control Panel** for standard uninstallation.
5. Once installation finishes, check **"Run My AI Mentor"** and click **Finish**.

---

## 3. Daily Usage

- **Everyday Startup**: Double-click the desktop shortcut **"My AI Mentor"**.
- **No Terminal Required**: The app runs automatically as a standalone desktop window without browser URL bars or dev tools.
- **Window Controls**:
  - Full maximize, minimize, and clean close buttons.
  - Native Windows menu (`File`, `Edit`, `View`, `Help`).
  - Shortcut `Ctrl + Shift + I` or `F12` to inspect console/DevTools when needed.
  - Shortcut `F11` to toggle fullscreen.

---

## 4. Local Data & Privacy Storage

Your data is stored 100% locally on your laptop:
- **IndexedDB Storage**: Windows stores your IndexedDB records in:
  `C:\Users\<YourUsername>\AppData\Roaming\My AI Mentor\IndexedDB`
- **Persistence**: All subjects, timetable classes, deadlines, study timer logs, daily reflections, and weekly reviews survive app restarts and laptop reboots.
- **Backups**:
  - Open **Settings** in the app to export a full JSON backup (`my-ai-mentor-backup-YYYY-MM-DD.json`).
  - Click **"Open Data Directory"** in Settings to view your local application folder in Windows File Explorer.
  - Standard JSON restore validates all schema versions and allows 1-click restore.

---

## 5. Offline Capabilities & Gemini AI Configuration

- **100% Offline Core**: Timetable, Pomodoro study timer, task tracker, milestones, reflections, and analytics run completely offline without an internet connection.
- **Gemini AI Features**:
  - To enable the AI Mentor, AI Coach, and AI Voice Mentor on your laptop, create a `.env` file containing your key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
  - Place this `.env` file either:
    1. In `C:\Users\<YourUsername>\AppData\Roaming\My AI Mentor\.env`, OR
    2. In the installation folder alongside `My AI Mentor.exe`.
  - When no key is provided or when offline, the app gives a clear offline banner and keeps all study and planning tools fully accessible.

---

## 6. How to Rebuild or Package Updates

If you make modifications to the code in the future:
```bash
# 1. Run full test suite
npm run test

# 2. Build icons, frontend, and backend
npm run build

# 3. Package the Windows installer
npm run dist:win
```
The installer will be generated in `release/My AI Mentor Setup.exe`.
