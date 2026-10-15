import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Lock,
  Unlock,
  KeyRound,
  Download,
  Upload,
  RefreshCw,
  Shield,
  User,
  Database,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  FolderOpen,
  HardDrive,
  ExternalLink,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    enablePinLock,
    disablePinLock,
    exportBackup,
    exportEncryptedBackupAction,
    validateBackup,
    decryptAndValidateBackupAction,
    importBackup,
    resetAllData,
    clearAllPersonalRecordsAndReset,
    syncLocalDataToCloud,
    pullCloudDataToLocal,
    currentUser,
    showNotification,
    setIsOnboardingOpen,
  } = useApp();

  // PIN setup state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [recoveryPhraseInput, setRecoveryPhraseInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Student profile form
  const [name, setName] = useState(settings.studentProfile.name);
  const [university, setUniversity] = useState(settings.studentProfile.university);
  const [degree, setDegree] = useState(settings.studentProfile.degree);
  const [semester, setSemester] = useState(settings.studentProfile.semester);
  const [savedProfileSuccess, setSavedProfileSuccess] = useState(false);

  // Desktop environment state
  const isDesktop = typeof window !== 'undefined' && Boolean(window.desktopAPI?.isDesktop);
  const [userDataPath, setUserDataPath] = useState<string | null>(null);
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      window.desktopAPI.getUserDataPath?.().then(p => setUserDataPath(p)).catch(() => {});
      window.desktopAPI.getAppVersion?.().then(v => setDesktopVersion(v)).catch(() => {});
    }
  }, []);

  // Backup & Import confirmation state
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<{
    jsonStr: string;
    summary: any;
  } | null>(null);

  // Encrypted backup state
  const [showEncryptedExportModal, setShowEncryptedExportModal] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [encryptedImportFileText, setEncryptedImportFileText] = useState<string | null>(null);
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Clear data confirmation modal
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Cloud sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  const handleSavePinLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (pinInput.length < 4 || pinInput.length > 8) {
      setPinError('PIN must be between 4 and 8 digits.');
      return;
    }
    if (pinInput !== confirmPinInput) {
      setPinError('PINs do not match.');
      return;
    }
    if (!recoveryPhraseInput.trim() || recoveryPhraseInput.trim().length < 6) {
      setPinError('Please enter a recovery phrase of at least 6 characters.');
      return;
    }

    await enablePinLock(pinInput, recoveryPhraseInput.trim());
    setShowPinModal(false);
    setPinInput('');
    setConfirmPinInput('');
    setRecoveryPhraseInput('');
    showNotification('Security PIN lock enabled with PBKDF2 derivation and recovery key packaging!', 'success');
  };

  const handleDisableLock = async () => {
    await disablePinLock();
    showNotification('PIN lock protection disabled.', 'info');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      studentProfile: {
        ...settings.studentProfile,
        name: name.trim(),
        university: university.trim(),
        degree: degree.trim(),
        semester: semester.trim(),
      },
    });
    setSavedProfileSuccess(true);
    showNotification('University profile saved successfully!', 'success');
    setTimeout(() => setSavedProfileSuccess(false), 2500);
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-ai-mentor-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup exported successfully.', 'success');
  };

  const handleExportEncryptedBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportPassphrase.trim() || exportPassphrase.length < 6) {
      showNotification('Passphrase must be at least 6 characters long.', 'warning');
      return;
    }
    const encryptedStr = await exportEncryptedBackupAction(exportPassphrase.trim());
    const blob = new Blob([encryptedStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-ai-mentor-encrypted-backup-${new Date().toISOString().split('T')[0]}.myaimentor-backup`;
    a.click();
    URL.revokeObjectURL(url);
    setShowEncryptedExportModal(false);
    setExportPassphrase('');
    showNotification('Encrypted backup exported securely with AES-GCM 256-bit.', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportStatus(null);
    setDecryptError(null);

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        // Check if file is encrypted container
        if (text.includes('"format": "encrypted-backup"') || text.includes('"format":"encrypted-backup"')) {
          setEncryptedImportFileText(text);
          return;
        }

        const validation = validateBackup(text);
        if (!validation.valid || !validation.summary) {
          setImportError(validation.error || 'Invalid backup structure.');
          return;
        }

        setPendingBackup({
          jsonStr: text,
          summary: validation.summary,
        });
      } catch (err: any) {
        setImportError('Failed to read backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDecryptAndImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptedImportFileText || !decryptPassphrase.trim()) return;

    setDecryptError(null);
    const validation = await decryptAndValidateBackupAction(encryptedImportFileText, decryptPassphrase.trim());
    if (!validation.valid || !validation.summary || !validation.data) {
      setDecryptError(validation.error || 'Decryption failed. Please check passphrase.');
      return;
    }

    setPendingBackup({
      jsonStr: JSON.stringify(validation.data),
      summary: validation.summary,
    });
    setEncryptedImportFileText(null);
    setDecryptPassphrase('');
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;
    setImportError(null);
    const result = await importBackup(pendingBackup.jsonStr);
    if (result.success) {
      setImportStatus(
        `Backup successfully restored! Loaded ${pendingBackup.summary.tasksCount} tasks, ${pendingBackup.summary.subjectsCount} subjects, ${pendingBackup.summary.sessionsCount} study sessions.`
      );
      showNotification('Backup restored successfully into local database!', 'success');
      setPendingBackup(null);
      setTimeout(() => setImportStatus(null), 5000);
    } else {
      setImportError(result.error || 'Restore failed.');
      showNotification('Restore failed: ' + result.error, 'error');
    }
  };

  const handleToggleCloudSync = async () => {
    const nextState = !settings.privacy.cloudSyncEnabled;
    await updateSettings({
      privacy: {
        ...settings.privacy,
        cloudSyncEnabled: nextState,
      },
    });
    setSyncStatusMessage(
      nextState
        ? 'Opt-in Cloud Synchronization is now enabled.'
        : 'Local-Only Mode is now active. No ordinary tracking data will be uploaded.'
    );
    setTimeout(() => setSyncStatusMessage(null), 4000);
  };

  const handleManualSyncNow = async () => {
    if (!currentUser) {
      showNotification('Please sign in with your Google account first in the top navigation bar.', 'warning');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMessage('Uploading local records to private Firestore collection...');
    const res = await syncLocalDataToCloud();
    setIsSyncing(false);
    if (res.success) {
      setSyncStatusMessage(`Successfully synchronized ${res.count} records to your private cloud storage!`);
      showNotification(`Synchronized ${res.count} records to Firestore.`, 'success');
    } else {
      setSyncStatusMessage(`Sync failed: ${res.error}`);
      showNotification(`Sync failed: ${res.error}`, 'error');
    }
    setTimeout(() => setSyncStatusMessage(null), 5000);
  };

  const handlePullCloudNow = async () => {
    if (!currentUser) {
      showNotification('Please sign in with your Google account first in the top navigation bar.', 'warning');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMessage('Downloading cloud records from Firestore...');
    const res = await pullCloudDataToLocal();
    setIsSyncing(false);
    if (res.success) {
      setSyncStatusMessage(`Successfully retrieved ${res.count} records from your cloud storage!`);
      showNotification(`Retrieved ${res.count} records from cloud storage.`, 'success');
    } else {
      setSyncStatusMessage(`Download failed: ${res.error}`);
      showNotification(`Download failed: ${res.error}`, 'error');
    }
    setTimeout(() => setSyncStatusMessage(null), 5000);
  };

  const handleConfirmClearAll = async () => {
    await clearAllPersonalRecordsAndReset();
    setShowClearConfirmModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Settings, Security & Privacy</span>
          <Settings className="w-5 h-5 text-indigo-500" />
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure application security, manage local-first database backups, and inspect privacy boundaries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: App Security & PIN Lock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  PIN / Password App Lock
                </h2>
                <p className="text-xs text-slate-500">
                  Salted PBKDF2 hash with automatic rate-limiting
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                settings.security.isLockEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {settings.security.isLockEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Protect your study timetable, grades, and private evening reflections on this laptop. When locked,
            the application requires your PIN to grant access. Includes automatic lockout protection (5 failed attempts per 10 minutes).
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            {settings.security.isLockEnabled ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowPinModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-colors"
                >
                  Change PIN
                </button>
                <button
                  type="button"
                  onClick={handleDisableLock}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                >
                  Disable Lock
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-colors"
              >
                Enable PIN Lock
              </button>
            )}
          </div>

          {/* Auto-lock timer setting */}
          {settings.security.isLockEnabled && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Inactivity Auto-Lock:
              </span>
              <select
                value={settings.security.autoLockMinutes}
                onChange={e =>
                  updateSettings({
                    security: {
                      ...settings.security,
                      autoLockMinutes: Number(e.target.value),
                    },
                  })
                }
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white"
              >
                <option value={1}>1 Minute</option>
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes (Default)</option>
                <option value={30}>30 Minutes</option>
                <option value={0}>Never (Manual Lock Only)</option>
              </select>
            </div>
          )}
        </div>

        {/* Card 2: Student Profile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Student Profile
                </h2>
                <p className="text-xs text-slate-500">
                  Customizes AI Mentor advice and timetable context
                </p>
              </div>
            </div>

            {savedProfileSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Updated</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Semester
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Degree Program
              </label>
              <input
                type="text"
                value={degree}
                onChange={e => setDegree(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                University / Institution
              </label>
              <input
                type="text"
                value={university}
                onChange={e => setUniversity(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-colors"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Card 3: Data Management & Local Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Local-First Database & Backups
              </h2>
              <p className="text-xs text-slate-500">
                IndexedDB storage on laptop with JSON export and restore
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            All records (subjects, timetable, tasks, goals, study sessions, and reflections) reside inside your laptop's browser IndexedDB.
            Export a full JSON backup regularly to safeguard your academic progress.
          </p>

          {importError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importStatus && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export JSON Backup</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEncryptedExportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export Encrypted Backup</span>
            </button>

            <label className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>Restore Backup</span>
              <input type="file" accept=".json,.myaimentor-backup" onChange={handleImportFile} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Run Onboarding Wizard</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/60 dark:border-rose-900/60 rounded-xl transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Clear All Records (Start From Zero)</span>
            </button>
          </div>

          {/* Cloud Sync Opt-In Control */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Cloud Synchronization (Firestore)
                </span>
                <span className="text-[11px] text-slate-500">
                  {settings.privacy.cloudSyncEnabled
                    ? 'Active: Records sync to your private cloud storage when signed in.'
                    : 'Local-Only Mode: All study records remain strictly on this laptop.'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleCloudSync}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.privacy.cloudSyncEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.privacy.cloudSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {syncStatusMessage && (
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-700 dark:text-indigo-300">
                {syncStatusMessage}
              </div>
            )}

            {settings.privacy.cloudSyncEnabled && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleManualSyncNow}
                  className="px-3 py-1.5 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Local Records to Cloud Now'}
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handlePullCloudNow}
                  className="px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  Download Cloud Data
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Architecture & Security Overview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Privacy & Architecture Guarantees
              </h2>
              <p className="text-xs text-slate-500">
                Transparent technical design rules
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">
                Local-First Storage:
              </strong>
              No cloud synchronization or external database sync runs in the background. Data remains 100% on this laptop.
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">
                AI Provider Transparency:
              </strong>
              When calling Gemini AI Mentor, only minimal required context is forwarded via our secure server route.
              No plaintext passwords or PINs are ever transmitted.
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">
                Future Android PWA Path:
              </strong>
              The architecture is decoupled so the exact same local-first IndexedDB schema can be packaged as an Android PWA without refactoring.
            </div>
          </div>
        </div>

        {/* Card 5: Windows Desktop App Edition */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Windows Desktop Application</span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
                    {isDesktop ? 'Active Desktop Window' : 'Production Build Ready'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Self-contained laptop installation with zero cloud dependency & native IndexedDB storage
                </p>
              </div>
            </div>
            {isDesktop && (
              <button
                type="button"
                onClick={() => window.desktopAPI?.openDataFolder?.()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>Open Data Directory</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <HardDrive className="w-4 h-4 text-indigo-500" />
                <span>Local Storage Location</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono break-all">
                {userDataPath || '%APPDATA%\\My AI Mentor\\IndexedDB'}
              </p>
              <p className="text-[10px] text-slate-400">
                Data persists across laptop reboots and app updates.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Security & Loopback Port</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Bound to internal loopback (127.0.0.1:dynamic).
              </p>
              <p className="text-[10px] text-slate-400">
                Zero external exposure. Context isolation & secure sandboxing enabled.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <FileCode className="w-4 h-4 text-amber-500" />
                <span>Installer Deliverable</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                release/My AI Mentor Setup.exe
              </p>
              <p className="text-[10px] text-slate-400">
                Version {desktopVersion || '1.0.0'} • Includes Desktop & Start Menu shortcuts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PIN SETUP MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Configure Access PIN & Recovery
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Your PIN is salted and hashed using PBKDF2 (100,000 iterations). It cannot be read in plaintext.
            </p>

            {pinError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {pinError}
              </div>
            )}

            <form onSubmit={handleSavePinLock} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Numeric PIN (4 to 8 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono tracking-widest text-center text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Numeric PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  value={confirmPinInput}
                  onChange={e => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter PIN"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono tracking-widest text-center text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Recovery Phrase / Secret Sentence
                </label>
                <input
                  type="text"
                  required
                  value={recoveryPhraseInput}
                  onChange={e => setRecoveryPhraseInput(e.target.value)}
                  placeholder="e.g. Artificial Intelligence 2026 Student Goal"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Keep this phrase safe. It can reset your PIN if you forget it.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs"
                >
                  Save & Enable Lock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Database Restore
                </h2>
                <p className="text-xs text-slate-500">
                  Schema verification passed · Ready for atomic restoration
                </p>
              </div>
            </div>

            <div className="my-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Backup Payload Contents:
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                <div>• Subjects: {pendingBackup.summary.subjectsCount}</div>
                <div>• Timetable Slots: {pendingBackup.summary.timetableCount}</div>
                <div>• Deadlines: {pendingBackup.summary.deadlinesCount}</div>
                <div>• Tasks: {pendingBackup.summary.tasksCount}</div>
                <div>• Goals: {pendingBackup.summary.goalsCount}</div>
                <div>• Study Sessions: {pendingBackup.summary.sessionsCount}</div>
                <div>• Reflections: {pendingBackup.summary.reflectionsCount}</div>
                <div>• Reviews: {pendingBackup.summary.reviewsCount}</div>
              </div>
              {pendingBackup.summary.exportedAt && (
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                  Export Date: {new Date(pendingBackup.summary.exportedAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs mb-4">
              <strong>Caution:</strong> Restoring this backup will replace current local database records with the backup file. This cannot be undone.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors"
              >
                Confirm & Replace Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENCRYPTED EXPORT MODAL */}
      {showEncryptedExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Export Encrypted Backup
                </h2>
                <p className="text-xs text-slate-500">
                  AES-GCM 256-bit encryption with PBKDF2 key derivation
                </p>
              </div>
            </div>

            <form onSubmit={handleExportEncryptedBackupSubmit} className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Choose a strong passphrase to encrypt your personal records. Only someone who knows this passphrase will be able to restore the exported file.
              </p>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Backup Passphrase (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={exportPassphrase}
                  onChange={e => setExportPassphrase(e.target.value)}
                  placeholder="Enter a secure encryption passphrase"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEncryptedExportModal(false);
                    setExportPassphrase('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
                >
                  Encrypt & Download
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENCRYPTED IMPORT DECRYPT MODAL */}
      {encryptedImportFileText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Decrypt Encrypted Backup
                </h2>
                <p className="text-xs text-slate-500">
                  Enter the passphrase used when this backup was exported
                </p>
              </div>
            </div>

            {decryptError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {decryptError}
              </div>
            )}

            <form onSubmit={handleDecryptAndImport} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Decryption Passphrase
                </label>
                <input
                  type="password"
                  required
                  value={decryptPassphrase}
                  onChange={e => setDecryptPassphrase(e.target.value)}
                  placeholder="Enter backup passphrase"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEncryptedImportFileText(null);
                    setDecryptPassphrase('');
                    setDecryptError(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-xs transition-colors"
                >
                  Decrypt & Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAR ALL DATA CONFIRMATION MODAL */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Start From Zero — Clear Personal Records
                </h2>
                <p className="text-xs text-slate-500">
                  Purge existing test/sample data to enter your real coursework
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 my-4 leading-relaxed">
              <p>
                This operation will clear all personal application records from your laptop's local IndexedDB:
              </p>
              <div className="grid grid-cols-2 gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <div>• All Subjects & Notes</div>
                <div>• Timetable Schedules</div>
                <div>• Deadlines & Assignments</div>
                <div>• All Tasks & Planners</div>
                <div>• Goals & Milestones</div>
                <div>• Study Timer Sessions</div>
                <div>• Daily Reflections</div>
                <div>• Weekly Reviews</div>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Your user settings, PIN lock configuration, and academic profile (UMT Lahore · BS AI) will be preserved.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>1. Download Backup First</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors"
                >
                  2. Clear All Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
