import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, ShieldCheck, KeyRound, AlertCircle, ArrowRight, Delete, Info } from 'lucide-react';

export const LockScreen: React.FC = () => {
  const { unlockApp, emergencyResetWithPhrase, lockSettings } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [lockoutMinutes, setLockoutMinutes] = useState<number | null>(null);

  // Check lockout status
  useEffect(() => {
    const checkLockout = () => {
      const until = lockSettings?.lockoutUntil;
      if (until && until > Date.now()) {
        const remaining = Math.ceil((until - Date.now()) / 60000);
        setLockoutMinutes(remaining);
      } else {
        setLockoutMinutes(null);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 10000);
    return () => clearInterval(interval);
  }, [lockSettings?.lockoutUntil]);

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 digits (supports up to 8 digits).');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await unlockApp(pin);
      if (!res.success) {
        setError(res.error || 'Incorrect PIN.');
        setPin('');
      }
    } catch {
      setError('An error occurred while verifying PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (lockoutMinutes !== null) return;
    if (pin.length < 8) {
      setPin(prev => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClearAll = () => {
    setPin('');
    setError(null);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    if (!recoveryPhrase.trim()) return;

    const ok = await emergencyResetWithPhrase(recoveryPhrase);
    if (ok) {
      setShowRecovery(false);
      setRecoveryPhrase('');
    } else {
      setRecoveryError('Recovery phrase does not match stored recovery verification hash.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e293b,transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-7 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">My AI Mentor Locked</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your configured access PIN (4 to 8 digits) to unlock
          </p>
        </div>

        {/* Lockout Warning */}
        {lockoutMinutes !== null && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Too many failed attempts. Device locked for security. Try again in {lockoutMinutes} minute(s).
            </span>
          </div>
        )}

        {/* Error message */}
        {error && lockoutMinutes === null && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePinSubmit} className="space-y-4">
          {/* PIN display dots - supports 4 to 8 digits */}
          <div className="flex justify-center items-center gap-2.5 my-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(index => (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  pin.length > index
                    ? 'bg-indigo-500 scale-110 shadow-[0_0_8px_rgba(99,102,241,0.6)]'
                    : 'border border-slate-700 bg-slate-800/40'
                }`}
              />
            ))}
          </div>

          <div className="text-center text-[11px] text-slate-400 font-mono">
            {pin.length > 0 ? `${pin.length} digits entered` : 'Supports 4 to 8 digits'}
          </div>

          {/* Direct keyboard input */}
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              disabled={lockoutMinutes !== null || isSubmitting}
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              placeholder="Or type PIN on keyboard and press Enter..."
              className="w-full text-center bg-slate-800/80 border border-slate-700 rounded-xl py-2 px-4 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono tracking-widest disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                disabled={lockoutMinutes !== null || isSubmitting}
                onClick={() => handleKeypadPress(num)}
                className="py-3 text-base font-medium rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 transition-colors text-white font-mono"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={lockoutMinutes !== null || isSubmitting || pin.length === 0}
              onClick={handleClearAll}
              className="py-3 text-[11px] font-medium rounded-xl bg-slate-800/60 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 text-slate-400 transition-colors uppercase tracking-wider"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={lockoutMinutes !== null || isSubmitting}
              onClick={() => handleKeypadPress('0')}
              className="py-3 text-base font-medium rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 text-white font-mono transition-colors"
            >
              0
            </button>
            <button
              type="button"
              disabled={lockoutMinutes !== null || isSubmitting || pin.length === 0}
              onClick={handleBackspace}
              className="py-3 text-xs font-medium rounded-xl bg-slate-800/60 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 text-slate-300 transition-colors flex items-center justify-center"
              title="Backspace"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Explicit Unlock Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || pin.length < 4 || lockoutMinutes !== null}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              <span>{isSubmitting ? 'Verifying PIN...' : 'Unlock Application'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>PBKDF2 Salted Hash (100k iter)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRecovery(true)}
            className="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            <KeyRound className="w-3 h-3" />
            <span>Emergency recovery</span>
          </button>
        </div>

        {/* Clear distinction of lock vs encryption */}
        <div className="mt-3 p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-[10px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
          <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Application Lock secures user interface access on this laptop. Data persists locally in browser IndexedDB.
          </span>
        </div>
      </div>

      {/* Emergency Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Emergency PIN Reset</h2>
                <p className="text-xs text-slate-400">Enter your saved recovery phrase to remove PIN lock</p>
              </div>
            </div>

            {recoveryError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {recoveryError}
              </div>
            )}

            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Recovery Phrase / Password
                </label>
                <textarea
                  rows={3}
                  value={recoveryPhrase}
                  onChange={e => setRecoveryPhrase(e.target.value)}
                  placeholder="Enter the exact secret recovery phrase you set during lock creation..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecovery(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  Verify & Reset Lock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
