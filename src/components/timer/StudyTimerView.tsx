import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { StudySession } from '../../types';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  BookOpen,
  Target,
  FileText,
  Plus,
  X,
  History,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudyTimerView: React.FC = () => {
  const {
    subjects,
    tasks,
    goals,
    studySessions,
    logStudySession,
    todayStudyMinutes,
    weekStudyMinutes,
    showNotification,
  } = useApp();

  const [mode, setMode] = useState<'pomodoro' | 'stopwatch'>('pomodoro');
  const [pomodoroType, setPomodoroType] = useState<'work' | 'shortBreak' | 'longBreak'>('work');

  // Timers state
  const workDuration = 25 * 60;
  const shortBreakDuration = 5 * 60;
  const longBreakDuration = 15 * 60;

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Association targets
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');

  // Post-session reflection modal
  const [showPostReflectionModal, setShowPostReflectionModal] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState<{
    durationMinutes: number;
    startTime: string;
    endTime: string;
  } | null>(null);

  const [whatStudied, setWhatStudied] = useState('');
  const [whatLearned, setWhatLearned] = useState('');
  const [whatUnclear, setWhatUnclear] = useState('');
  const [whatToPracticeNext, setWhatToPracticeNext] = useState('');

  // Manual session modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualMinutes, setManualMinutes] = useState(45);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Interval timer ref
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning) {
      if (!sessionStartTime) setSessionStartTime(new Date());

      timerRef.current = setInterval(() => {
        if (mode === 'pomodoro') {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              setIsRunning(false);
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          });
        } else {
          // Stopwatch counts up
          setTimeLeft(prev => prev + 1);
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, mode, sessionStartTime]);

  const handleTimerComplete = () => {
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });

    const end = new Date();
    const start = sessionStartTime || new Date(end.getTime() - 25 * 60000);
    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

    setCompletedSessionData({
      durationMinutes,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
    setShowPostReflectionModal(true);
    setSessionStartTime(null);
  };

  const handleFinishStopwatch = () => {
    if (timeLeft < 60) {
      showNotification('Session was less than 1 minute and not recorded.', 'info');
      resetTimer();
      return;
    }
    setIsRunning(false);
    const end = new Date();
    const start = sessionStartTime || new Date(end.getTime() - timeLeft * 1000);
    const durationMinutes = Math.max(1, Math.round(timeLeft / 60));

    setCompletedSessionData({
      durationMinutes,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
    setShowPostReflectionModal(true);
    resetTimer();
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSessionStartTime(null);
    if (mode === 'pomodoro') {
      if (pomodoroType === 'work') setTimeLeft(workDuration);
      else if (pomodoroType === 'shortBreak') setTimeLeft(shortBreakDuration);
      else setTimeLeft(longBreakDuration);
    } else {
      setTimeLeft(0);
    }
  };

  const handleSwitchPomodoroType = (type: 'work' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    setPomodoroType(type);
    if (type === 'work') setTimeLeft(workDuration);
    else if (type === 'shortBreak') setTimeLeft(shortBreakDuration);
    else setTimeLeft(longBreakDuration);
  };

  const handleSavePostReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedSessionData || isSavingSession) return;
    setIsSavingSession(true);

    try {
      const sub = subjects.find(s => s.id === selectedSubjectId);
      const title = sub ? `${sub.code} Study Session` : 'Focused Study Session';

      await logStudySession({
        subjectId: selectedSubjectId || undefined,
        taskId: selectedTaskId || undefined,
        goalId: selectedGoalId || undefined,
        title,
        startTime: completedSessionData.startTime,
        endTime: completedSessionData.endTime,
        durationMinutes: completedSessionData.durationMinutes,
        sessionType: mode,
        isMeasured: true,
        reflection: {
          whatStudied,
          whatLearned,
          whatUnclear,
          whatToPracticeNext,
        },
      });

      // Reset reflection form
      setWhatStudied('');
      setWhatLearned('');
      setWhatUnclear('');
      setWhatToPracticeNext('');
      setShowPostReflectionModal(false);
      setCompletedSessionData(null);
      resetTimer();
    } finally {
      setIsSavingSession(false);
    }
  };

  const [isSavingSession, setIsSavingSession] = useState(false);

  const handleSaveManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSession) return;
    setIsSavingSession(true);

    try {
      const [y, m, d] = (manualDate || new Date().toISOString().split('T')[0]).split('-').map(Number);
      const startDate = new Date(y, (m || 1) - 1, d || 1, 10, 0, 0);
      const endDate = new Date(startDate.getTime() + Math.max(1, manualMinutes) * 60000);

      await logStudySession({
        subjectId: selectedSubjectId || undefined,
        taskId: selectedTaskId || undefined,
        goalId: selectedGoalId || undefined,
        title: manualTitle.trim() || 'Manual Study Entry',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationMinutes: manualMinutes,
        sessionType: 'manual',
        isMeasured: false, // distinguished from measured
      });

      setShowManualModal(false);
      setManualTitle('');
    } finally {
      setIsSavingSession(false);
    }
  };

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Subject distribution of study time
  const subjectTimeMap: Record<string, number> = {};
  studySessions.forEach(s => {
    const id = s.subjectId || 'unassigned';
    subjectTimeMap[id] = (subjectTimeMap[id] || 0) + s.durationMinutes;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Study Timer & Session History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pomodoro focus sessions, structured post-study reflection, and measured study time tracking
          </p>
        </div>

        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Manual Study Time</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Active Timer Card */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs flex flex-col items-center text-center">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
              <button
                onClick={() => {
                  setMode('pomodoro');
                  resetTimer();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'pomodoro'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Pomodoro (25m)
              </button>
              <button
                onClick={() => {
                  setMode('stopwatch');
                  setTimeLeft(0);
                  setIsRunning(false);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'stopwatch'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Stopwatch
              </button>
            </div>

            {/* Pomodoro Intervals */}
            {mode === 'pomodoro' && (
              <div className="flex items-center gap-2 mb-8 text-xs font-medium">
                <button
                  onClick={() => handleSwitchPomodoroType('work')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    pomodoroType === 'work'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400 font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Work (25m)
                </button>
                <button
                  onClick={() => handleSwitchPomodoroType('shortBreak')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    pomodoroType === 'shortBreak'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Short Break (5m)
                </button>
                <button
                  onClick={() => handleSwitchPomodoroType('longBreak')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    pomodoroType === 'longBreak'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-400 font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Long Break (15m)
                </button>
              </div>
            )}

            {/* Giant Digital Timer Display */}
            <div className="text-6xl sm:text-7xl font-bold font-mono tracking-tight text-slate-900 dark:text-white my-4 tabular-nums">
              {formatTime(timeLeft)}
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-8 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2.5 text-white shadow-sm transition-all ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105 active:scale-95'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Session</span>
                  </>
                )}
              </button>

              {mode === 'stopwatch' && isRunning && (
                <button
                  onClick={handleFinishStopwatch}
                  className="px-4 py-3 rounded-2xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finish & Save</span>
                </button>
              )}

              <button
                onClick={resetTimer}
                className="p-3 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Association Selectors */}
            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-left text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-white"
                >
                  <option value="">None</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Task
                </label>
                <select
                  value={selectedTaskId}
                  onChange={e => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-white truncate"
                >
                  <option value="">None</option>
                  {tasks
                    .filter(t => t.status !== 'completed')
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Goal
                </label>
                <select
                  value={selectedGoalId}
                  onChange={e => setSelectedGoalId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-white truncate"
                >
                  <option value="">None</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Quantitative Stats & Subject Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {/* Study Metrics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Recorded Study Time
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Today</span>
                <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {Math.floor(todayStudyMinutes / 60)}h {todayStudyMinutes % 60}m
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Past 7 Days</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {Math.floor(weekStudyMinutes / 60)}h {weekStudyMinutes % 60}m
                </span>
              </div>
            </div>

            {/* Subject Distribution */}
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-2">
                Study Time by Subject:
              </span>
              <div className="space-y-2">
                {subjects.map(sub => {
                  const minutes = subjectTimeMap[sub.id] || 0;
                  const percent =
                    weekStudyMinutes > 0 ? Math.round((minutes / weekStudyMinutes) * 100) : 0;
                  return (
                    <div key={sub.id} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {sub.code} · {sub.name}
                        </span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {Math.floor(minutes / 60)}h {minutes % 60}m
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, percent)}%`,
                            backgroundColor: sub.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Sessions List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>Recent Sessions Log</span>
              <History className="w-4 h-4 text-slate-400" />
            </h2>

            {studySessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No study sessions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-80 overflow-y-auto">
                {studySessions.slice(0, 6).map(ses => {
                  const sub = subjects.find(s => s.id === ses.subjectId);
                  return (
                    <div key={ses.id} className="py-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {ses.title}
                        </span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {ses.durationMinutes}m
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {sub && <span style={{ color: sub.color }}>{sub.code}</span>}
                        <span>·</span>
                        <span className="font-mono">{ses.startTime.split('T')[0]}</span>
                        <span>·</span>
                        <span className="capitalize text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
                          {ses.isMeasured ? 'Measured' : 'Manual'}
                        </span>
                      </div>

                      {ses.reflection?.whatLearned && (
                        <div className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 text-[11px] text-slate-600 dark:text-slate-400 italic">
                          "{ses.reflection.whatLearned}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POST-SESSION REFLECTION MODAL */}
      {showPostReflectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Study Session Completed! ({completedSessionData?.durationMinutes} mins)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Record what you learned to cement the knowledge in memory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPostReflectionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePostReflection} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  1. What did I study?
                </label>
                <input
                  type="text"
                  required
                  value={whatStudied}
                  onChange={e => setWhatStudied(e.target.value)}
                  placeholder="e.g. Red-Black tree deletion cases, Gram-Schmidt matrix math..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  2. What did I learn? (Key takeaway)
                </label>
                <textarea
                  rows={2}
                  required
                  value={whatLearned}
                  onChange={e => setWhatLearned(e.target.value)}
                  placeholder="e.g. Understood why coloring root black ensures property 2..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  3. What is still unclear or confusing?
                </label>
                <input
                  type="text"
                  value={whatUnclear}
                  onChange={e => setWhatUnclear(e.target.value)}
                  placeholder="e.g. Still hesitant on double black node propagation..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  4. What should I practice next?
                </label>
                <input
                  type="text"
                  value={whatToPracticeNext}
                  onChange={e => setWhatToPracticeNext(e.target.value)}
                  placeholder="e.g. Write test case for left-right rotation in C++..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPostReflectionModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  Skip Reflection
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs"
                >
                  Save Reflection & Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL LOG MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Log Manual Study Session
              </h2>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  placeholder="e.g. Offline Textbook Reading on Linear Algebra"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    required
                    value={manualMinutes}
                    onChange={e => setManualMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                >
                  <option value="">None</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Save Manual Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
