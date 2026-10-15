import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskCategory, Priority } from '../../types';
import {
  Plus,
  Send,
  Sparkles,
  Calendar,
  Clock,
  Tag,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  X,
  BookOpen,
} from 'lucide-react';

export const QuickTaskCapture: React.FC = () => {
  const { subjects, addTask } = useApp();

  const [isOpen, setIsOpen] = useState(true);
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('DSA & OOP');
  const [priority, setPriority] = useState<Priority>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [subjectId, setSubjectId] = useState<string>('');
  const [targetDay, setTargetDay] = useState<'today' | 'tomorrow'>('today');
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Global hotkey: 'q' or 'n' or '/' when not typing in an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'q' || e.key === 'Q') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskTitle.trim()) return;

    const plannedDate = targetDay === 'today' ? todayStr : tomorrowStr;

    await addTask({
      title: taskTitle.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      estimatedMinutes,
      subjectId: subjectId || undefined,
      plannedDate,
      status: 'not_started',
    });

    const addedTitle = taskTitle.trim();
    setTaskTitle('');
    setDescription('');
    setShowAdvanced(false);

    setToastMessage(`"${addedTitle.length > 25 ? addedTitle.slice(0, 22) + '...' : addedTitle}" added to ${targetDay === 'today' ? "today's plan" : "tomorrow"}!`);
    setTimeout(() => setToastMessage(null), 3000);

    inputRef.current?.focus();
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-8 z-50 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-xl text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Action Button (Always available to toggle/focus quick capture) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="fixed bottom-6 right-6 z-40 p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-xl hover:shadow-indigo-500/25 transition-all flex items-center gap-2 group"
          title="Quick capture task (Press 'Q')"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
          <span className="text-xs font-bold tracking-tight pr-1">Quick Task</span>
        </button>
      )}

      {/* Persistent Bottom Input Bar */}
      {isOpen && (
        <div className="sticky bottom-0 z-30 -mx-6 -mb-6 lg:-mx-8 lg:-mb-8 mt-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 py-4 shadow-2xl">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Quick Task Capture</span>
                </span>
                <span className="hidden sm:inline text-slate-400">·</span>
                <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Enter</kbd> to save immediately
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs flex items-center gap-1 font-medium transition-colors"
                >
                  <span>{showAdvanced ? 'Simple' : 'More Options'}</span>
                  {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Minimize bar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Single-Line Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Title Input */}
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    required
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Capture a task (e.g. Implement Dijkstra's algorithm, Review Linear Algebra proofs)..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner font-medium"
                  />
                </div>

                {/* Target Day Selector */}
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setTargetDay('today')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      targetDay === 'today'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDay('tomorrow')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      targetDay === 'tomorrow'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>

                {/* Category Selector */}
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as TaskCategory)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium shrink-0"
                >
                  <option value="DSA & OOP">DSA & OOP</option>
                  <option value="AI & ML">AI & ML</option>
                  <option value="Programming">Programming</option>
                  <option value="University">University</option>
                  <option value="Project">Project</option>
                  <option value="Career Prep">Career Prep</option>
                  <option value="Revision">Revision</option>
                  <option value="Personal Habit">Personal Habit</option>
                </select>

                {/* Priority Selector */}
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                  className={`border rounded-xl px-3 py-2 text-xs font-semibold shrink-0 uppercase tracking-wider ${
                    priority === 'urgent'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                      : priority === 'high'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                      : 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Med</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!taskTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Quick Duration Chips & Linked Subject */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    <span>Duration:</span>
                  </span>
                  {[15, 30, 45, 60, 90].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setEstimatedMinutes(mins)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
                        estimatedMinutes === mins
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-300 dark:border-indigo-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                {subjects.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-500" />
                      <span>Link Subject:</span>
                    </span>
                    <select
                      value={subjectId}
                      onChange={e => setSubjectId(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-300"
                    >
                      <option value="">None</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Advanced details (optional description) */}
              {showAdvanced && (
                <div className="pt-2 animate-fadeIn">
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Additional notes, sub-tasks, or documentation links (optional)..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};
