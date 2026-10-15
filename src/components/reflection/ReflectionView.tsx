import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DailyReflection } from '../../types';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ThumbsUp,
  Heart,
  TrendingDown,
  History,
  Lightbulb,
} from 'lucide-react';

const COMMON_DISTRACTIONS = [
  'Phone notifications / Social media',
  'Too many open browser tabs',
  'Context switching between subjects',
  'Underestimating difficulty / fatigue',
  'Late night sleeping / grogginess',
  'Unclear assignment instructions',
  'Procrastination before starting code',
];

export const ReflectionView: React.FC = () => {
  const { reflections, saveReflection, tasks } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const existingToday = reflections.find(r => r.date === todayStr);

  const [wellDone, setWellDone] = useState(existingToday?.wellDone || '');
  const [mistakes, setMistakes] = useState(existingToday?.mistakes || '');
  const [learnedConcept, setLearnedConcept] = useState(existingToday?.learnedConcept || '');
  const [distractions, setDistractions] = useState<string[]>(existingToday?.distractions || []);
  const [missedTasksAnalysis, setMissedTasksAnalysis] = useState(
    existingToday?.missedTasksAnalysis || ''
  );
  const [tomorrowImprovement, setTomorrowImprovement] = useState(
    existingToday?.tomorrowImprovement || ''
  );
  const [gratitudeOrPride, setGratitudeOrPride] = useState(
    existingToday?.gratitudeOrPride || ''
  );
  const [focusScore, setFocusScore] = useState<number>(existingToday?.focusScore || 4);
  const [energyScore, setEnergyScore] = useState<number>(existingToday?.energyScore || 4);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Distraction selector toggle
  const toggleDistraction = (tag: string) => {
    setDistractions(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveReflection({
      date: todayStr,
      wellDone,
      mistakes,
      learnedConcept,
      distractions,
      missedTasksAnalysis,
      tomorrowImprovement,
      gratitudeOrPride,
      focusScore,
      energyScore,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Weakness & Friction Pattern Analysis computed strictly from saved historical records
  const distractionFrequencyMap: Record<string, number> = {};
  reflections.forEach(r => {
    r.distractions?.forEach(d => {
      distractionFrequencyMap[d] = (distractionFrequencyMap[d] || 0) + 1;
    });
  });

  const topDistractions = Object.entries(distractionFrequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Missed tasks recorded in tasks store
  const missedTasksList = tasks.filter(t => t.missedReason);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Daily Evening Reflection & Weakness Tracking</span>
          <Brain className="w-5 h-5 text-indigo-500" />
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          A core discipline: review today's wins, analyze friction patterns, and cement learning before sleeping
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Daily Reflection Questionnaire */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Evening Review · {todayStr}
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                {existingToday ? 'Update Today\'s Reflection' : 'Complete Today\'s Reflection'}
              </h2>
            </div>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved locally</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* 1. What went well */}
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>1. What did I do well today? (Wins, discipline & breakthroughs)</span>
              </label>
              <textarea
                rows={2}
                required
                value={wellDone}
                onChange={e => setWellDone(e.target.value)}
                placeholder="e.g. Attended 9 AM lecture without delay; solved 2 recursive tree problems in C++ without checking solutions..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 2. Concept Learned */}
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>2. What technical or academic concept did I learn today?</span>
              </label>
              <textarea
                rows={2}
                required
                value={learnedConcept}
                onChange={e => setLearnedConcept(e.target.value)}
                placeholder="e.g. Understood why smart pointers prevent memory leaks via RAII in C++; studied A* Manhattan heuristic admissibility..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 3. Mistakes & Friction */}
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>3. What mistakes did I make & what distracted me?</span>
              </label>
              <textarea
                rows={2}
                required
                value={mistakes}
                onChange={e => setMistakes(e.target.value)}
                placeholder="e.g. Started Linear Algebra proof derivation too late in the evening; spent 25 minutes scrolling phone after dinner..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Distraction tags selector */}
            <div>
              <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
                Select observed distractions today:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_DISTRACTIONS.map(dist => {
                  const isSelected = distractions.includes(dist);
                  return (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => toggleDistraction(dist)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                        isSelected
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-medium'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {dist}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Missed tasks analysis */}
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                4. Which tasks did I miss or postpone, and why?
              </label>
              <textarea
                rows={2}
                value={missedTasksAnalysis}
                onChange={e => setMissedTasksAnalysis(e.target.value)}
                placeholder="e.g. Postponed SQL query practice because C++ assignment required 90 minutes instead of the estimated 45..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 5. Tomorrow improvement & Gratitude */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  5. One concrete improvement for tomorrow
                </label>
                <textarea
                  rows={2}
                  required
                  value={tomorrowImprovement}
                  onChange={e => setTomorrowImprovement(e.target.value)}
                  placeholder="e.g. Put phone in drawer from 4 PM - 7 PM; plan 15 min buffer between tasks..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-pink-500" />
                  <span>6. What am I grateful for or proud of?</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={gratitudeOrPride}
                  onChange={e => setGratitudeOrPride(e.target.value)}
                  placeholder="e.g. Grateful for clarity on DSA trees; proud that I stuck to the Pomodoro timer..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Focus & Energy Rating */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Focus Rating (1 - 5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setFocusScore(score)}
                      className={`w-8 h-8 rounded-lg font-mono font-semibold transition-colors ${
                        focusScore === score
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Energy Level (1 - 5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setEnergyScore(score)}
                      className={`w-8 h-8 rounded-lg font-mono font-semibold transition-colors ${
                        energyScore === score
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
              >
                Save Daily Reflection
              </button>
            </div>
          </form>
        </div>

        {/* Right 4 Columns: Weakness & Friction Pattern Analyzer */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pattern Tracker Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <span>Recurring Distraction Patterns</span>
            </h2>
            <p className="text-[11px] text-slate-500 mb-4">
              Objectively derived from your recorded reflection entries
            </p>

            {topDistractions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No recurring distraction tags recorded yet. Keep logging your daily reflections!
              </div>
            ) : (
              <div className="space-y-3">
                {topDistractions.map(([name, count]) => (
                  <div key={name} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      <span className="truncate max-w-[180px]">{name}</span>
                      <span className="font-mono text-rose-500 tabular-nums">{count} days</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Recommendation: Pre-commit to physical phone separation during study blocks.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Reflections Archive */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>Past Reflection Entries</span>
              <History className="w-4 h-4 text-slate-400" />
            </h2>

            {reflections.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No past reflections yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {reflections.map(r => (
                  <div key={r.id} className="py-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white mb-1">
                      <span>{r.date}</span>
                      <span className="font-mono text-[10px] text-indigo-500">
                        Focus: {r.focusScore || 4}/5 · Energy: {r.energyScore || 4}/5
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Learned:</span>{' '}
                      {r.learnedConcept}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
