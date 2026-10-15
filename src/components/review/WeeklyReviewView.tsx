import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WeeklyReview } from '../../types';
import {
  BarChart3,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Target,
  FileText,
  ThumbsUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const WeeklyReviewView: React.FC = () => {
  const {
    tasks,
    studySessions,
    goals,
    reflections,
    subjects,
    weeklyReviews,
    saveWeeklyReview,
  } = useApp();

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReview, setActiveReview] = useState<WeeklyReview | null>(
    weeklyReviews[0] || null
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // Aggregate past 7 days facts
  const past7DaysTasks = tasks.filter(
    t => t.createdAt >= sevenDaysAgoStr || (t.plannedDate ? t.plannedDate >= sevenDaysAgoStr : false)
  );
  const completedCount = past7DaysTasks.filter(t => t.status === 'completed').length;
  const skippedCount = past7DaysTasks.filter(t => t.status === 'skipped' || t.status === 'postponed').length;

  const past7DaysSessions = studySessions.filter(s => s.startTime >= sevenDaysAgoStr);
  const totalStudyMinutes = past7DaysSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const past7DaysReflections = reflections.filter(r => r.date >= sevenDaysAgoStr);
  const collectedWins = past7DaysReflections.map(r => r.wellDone).filter(Boolean);
  const collectedFrictions = past7DaysReflections.flatMap(r => r.distractions || []);

  const handleGenerateWeeklyReport = async () => {
    setIsGenerating(true);
    try {
      const statsPayload = {
        weekStart: sevenDaysAgoStr,
        weekEnd: todayStr,
        totalStudyMinutes,
        plannedTasksCount: past7DaysTasks.length,
        completedTasksCount: completedCount,
        skippedOrPostponedCount: skippedCount,
        dailyWinsSample: collectedWins.slice(0, 4),
        dailyFrictionsSample: collectedFrictions.slice(0, 5),
        goalsOverview: goals.map(g => ({ title: g.title, milestonesDone: g.milestones.filter(m => m.completed).length })),
      };

      const res = await fetch('/api/gemini/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyStats: statsPayload }),
      });

      if (!res.ok) {
        throw new Error('AI Weekly review generation unavailable.');
      }

      const data = await res.json();

      const newReview: WeeklyReview = await saveWeeklyReview({
        weekStartDate: sevenDaysAgoStr,
        weekEndDate: todayStr,
        summary: data.summary || `Synthesized weekly analysis for ${sevenDaysAgoStr} to ${todayStr}.`,
        totalStudyMinutes,
        plannedTasksCount: past7DaysTasks.length,
        completedTasksCount: completedCount,
        skippedOrPostponedCount: skippedCount,
        wins: data.wins || collectedWins.slice(0, 3),
        recurringFriction: data.frictionPoints || ['Context switching', 'Underestimating math prep'],
        nextWeekPriorities: data.nextWeekPriorities || ['Prepare for upcoming midterm', 'Complete DSA tree assignment'],
        aiSynthesized: true,
        studentNotes: data.mentorVerdict || '',
      });

      setActiveReview(newReview);
    } catch (err: any) {
      // Offline fallback: create structured manual report from recorded data
      const offlineReview: WeeklyReview = await saveWeeklyReview({
        weekStartDate: sevenDaysAgoStr,
        weekEndDate: todayStr,
        summary: `Weekly summary: Recorded ${Math.floor(totalStudyMinutes / 60)}h ${totalStudyMinutes % 60}m of study time across ${past7DaysSessions.length} sessions with ${completedCount} completed tasks.`,
        totalStudyMinutes,
        plannedTasksCount: past7DaysTasks.length,
        completedTasksCount: completedCount,
        skippedOrPostponedCount: skippedCount,
        wins: collectedWins.length > 0 ? collectedWins.slice(0, 3) : ['Maintained consistency in lecture attendance'],
        recurringFriction: collectedFrictions.length > 0 ? Array.from(new Set(collectedFrictions)).slice(0, 3) : ['Phone distractions during study'],
        nextWeekPriorities: ['Complete Red-Black Tree assignment', 'Revise Linear Algebra', 'Maintain 2h daily focus blocks'],
        aiSynthesized: false,
        studentNotes: 'Offline generated report. All statistics reflect actual recorded logs.',
      });
      setActiveReview(offlineReview);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Weekly Sunday Progress Review</span>
            <BarChart3 className="w-5 h-5 text-indigo-500" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluate past 7 days of performance, distinguish observed facts from interpretations, and lock in next week's priorities
          </p>
        </div>

        <button
          onClick={handleGenerateWeeklyReport}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isGenerating ? 'Synthesizing...' : 'Generate Weekly Report'}</span>
        </button>
      </div>

      {/* 4 Core Facts Strips (Grounded on Real Recorded History) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 block mb-1">Total Study Time (7d)</span>
          <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
            {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">across {past7DaysSessions.length} sessions</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 block mb-1">Tasks Completed</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {completedCount} / {past7DaysTasks.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            {past7DaysTasks.length > 0 ? Math.round((completedCount / past7DaysTasks.length) * 100) : 0}% completion
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 block mb-1">Postponed / Skipped</span>
          <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            {skippedCount}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">recorded with friction reason</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 block mb-1">Reflections Completed</span>
          <span className="text-2xl font-bold font-mono text-violet-600 dark:text-violet-400 tabular-nums">
            {past7DaysReflections.length} / 7
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">daily check-ins logged</span>
        </div>
      </div>

      {/* Active Report View */}
      {activeReview ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Weekly Evaluation Report
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Week of {activeReview.weekStartDate} to {activeReview.weekEndDate}
              </h2>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Mode: {activeReview.aiSynthesized ? 'Gemini AI Synthesized' : 'Offline Grounded Rule'}
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              1. Observed Facts & Performance Summary
            </h3>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              {activeReview.summary}
            </p>
          </div>

          {/* Section 2: Wins vs Friction Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-2">
                <ThumbsUp className="w-4 h-4 text-emerald-500" />
                <span>Recorded Wins & Breakthroughs</span>
              </span>
              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                {activeReview.wins.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs">
              <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Recurring Distractions & Weaknesses</span>
              </span>
              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                {activeReview.recurringFriction.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">⚠</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 3: Next Week Priorities */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              3. Recommended Priorities for Next Week
            </h3>
            <div className="space-y-2">
              {activeReview.nextWeekPriorities.map((pri, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-[11px] font-bold">
                    {idx + 1}
                  </span>
                  <span>{pri}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Mentor Verdict & Advice */}
          {activeReview.studentNotes && (
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-1">
                My AI Mentor Advice:
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                "{activeReview.studentNotes}"
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500 shadow-xs">
          No weekly report generated yet. Click "Generate Weekly Report" above to synthesize your recent 7-day performance.
        </div>
      )}
    </div>
  );
};
