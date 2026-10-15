import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Play,
  ArrowRight,
  Target,
  Sparkles,
  BookOpen,
  Brain,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { QuickTaskCapture } from './QuickTaskCapture';

export const DashboardView: React.FC = () => {
  const {
    settings,
    subjects,
    todaySchedule,
    nextClass,
    upcomingDeadlines,
    todayTasks,
    setTaskStatus,
    todayStudyMinutes,
    goals,
    setActiveView,
    addTask,
    showNotification,
  } = useApp();

  const completedTasks = todayTasks.filter(t => t.status === 'completed');
  const taskCompletionRate = todayTasks.length > 0 ? Math.round((completedTasks.length / todayTasks.length) * 100) : 0;

  // Calculate dynamic recommendation grounded in real student data
  const dynamicRecommendation = React.useMemo(() => {
    if (subjects.length === 0) {
      return {
        text: 'Add your university courses in the University tab to receive customized study recommendations and sync your class timetable for UMT Lahore.',
        taskTitle: 'Add 3rd Semester Coursework & Labs',
        category: 'University' as const,
      };
    }
    if (upcomingDeadlines.length > 0) {
      const topDl = upcomingDeadlines[0];
      return {
        text: `Based on your upcoming deadline "${topDl.title}" due ${topDl.dueDate}, prioritize 45-60 minutes of focused practice today. Avoid leaving preparation to the night before.`,
        taskTitle: `Prepare: ${topDl.title}`,
        category: 'University' as const,
      };
    }
    const pendingTasks = todayTasks.filter(t => t.status !== 'completed');
    if (pendingTasks.length > 0) {
      const highest = pendingTasks.find(t => t.priority === 'urgent' || t.priority === 'high') || pendingTasks[0];
      return {
        text: `You have ${pendingTasks.length} pending task(s) today. Tackle "${highest.title}" during your peak cognitive window. Use the Study Timer for uninterrupted focus.`,
        taskTitle: `Review & Finish: ${highest.title}`,
        category: highest.category,
      };
    }
    return {
      text: 'All planned tasks for today are completed! Take 10 minutes for your Daily Reflection, plan tomorrow\'s schedule, or do 30 minutes of light revision.',
      taskTitle: 'Complete Evening Reflection & Plan Tomorrow',
      category: 'Revision' as const,
    };
  }, [subjects, upcomingDeadlines, todayTasks]);

  const handleAcceptAiSuggestion = async () => {
    await addTask({
      title: dynamicRecommendation.taskTitle,
      category: dynamicRecommendation.category,
      priority: 'high',
      estimatedMinutes: 45,
      plannedDate: new Date().toISOString().split('T')[0],
      status: 'not_started',
    });
    showNotification('AI Mentor recommendation added to today\'s tasks!', 'success');
  };

  const totalMilestones = goals.reduce((acc, g) => acc + g.milestones.length, 0);
  const completedMilestones = goals.reduce(
    (acc, g) => acc + g.milestones.filter(m => m.completed).length,
    0
  );
  const milestoneRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const totalEstimatedMinutes = todayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

  const handleToggleTask = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'not_started' : 'completed';
    await setTaskStatus(id, nextStatus);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {settings.studentProfile.name.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {settings.studentProfile.degree} · {settings.studentProfile.semester}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('timer')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Study Session</span>
          </button>
          <button
            onClick={() => setActiveView('reflection')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            <span>Evening Reflection</span>
          </button>
        </div>
      </div>

      {/* 4 Core Quantitative Metrics (Tabular Numerals, Zero Vanity Hallucinations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Study Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Study Time Today</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {Math.floor(todayStudyMinutes / 60)}h {todayStudyMinutes % 60}m
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {Math.floor(totalEstimatedMinutes / 60)}h {totalEstimatedMinutes % 60}m planned
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalEstimatedMinutes > 0 ? Math.min(100, (todayStudyMinutes / totalEstimatedMinutes) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 2: Today Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Today's Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {completedTasks.length} / {todayTasks.length}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-medium">
              {taskCompletionRate}% done
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${taskCompletionRate}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Next Class */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Next University Class</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          {nextClass ? (
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                {nextClass.subject.code} · {nextClass.slot.classType}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between font-mono">
                <span>{nextClass.slot.room || 'Campus Room'}</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  in {nextClass.startsInMinutes} mins
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No more classes today
              </div>
              <div className="text-xs text-slate-500 mt-1">Free study window available</div>
            </div>
          )}
        </div>

        {/* Metric 4: Goal Milestones */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Milestone Progress</span>
            <Target className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {completedMilestones} / {totalMilestones}
            </span>
            <span className="text-xs text-violet-600 dark:text-violet-400 font-mono font-medium">
              {milestoneRate}% verified
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-violet-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${milestoneRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: University Timetable + Today Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Today's Schedule & Deadlines */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's University Schedule */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Today's Timetable
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Synchronized with your semester lecture & lab schedule
                </p>
              </div>
              <button
                onClick={() => setActiveView('university')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Full Timetable</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todaySchedule.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No classes scheduled for today. Great day for deep programming & algorithm practice!
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedule.map(item => (
                  <div
                    key={item.slot.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-2.5 h-10 rounded-full"
                        style={{ backgroundColor: item.subject.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.subject.code}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            · {item.subject.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.slot.room || 'Room TBD'} · Instructor: {item.subject.instructor}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                        {item.slot.startTime} – {item.slot.endTime}
                      </div>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        {item.slot.classType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines & Exams */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Upcoming Deadlines & Exams
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Assignments, quizzes, lab manuals, and midterms
                </p>
              </div>
              <button
                onClick={() => setActiveView('university')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No pending deadlines in the queue.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingDeadlines.map(dl => {
                  const daysLeft = Math.ceil(
                    (new Date(dl.dueDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
                  );
                  const isUrgent = daysLeft <= 3;
                  return (
                    <div key={dl.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {dl.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {dl.type} {dl.weightPercent ? `· Weight: ${dl.weightPercent}%` : ''}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-mono font-bold tabular-nums ${
                            isUrgent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {daysLeft < 0 ? 'Past Due' : daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{dl.dueDate}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Today's Tasks + AI Mentor Grounded Recommendation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Tasks Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Today's Planned Tasks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Action list for today's focused execution
                </p>
              </div>
              <button
                onClick={() => setActiveView('tasks')}
                className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No tasks planned for today. Click "Add Task" or use Tomorrow Planner.
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayTasks.map(task => {
                  const isDone = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border transition-colors flex items-start gap-3 ${
                        isDone
                          ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-medium ${
                            isDone
                              ? 'line-through text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span>{task.category}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                          {task.priority === 'urgent' && (
                            <>
                              <span>·</span>
                              <span className="text-rose-500 font-medium">Urgent</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Plan for tomorrow evening</span>
              <button
                onClick={() => setActiveView('tasks')}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Open Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Grounded AI Mentor Recommendation Card */}
          <div className="bg-gradient-to-br from-indigo-900/20 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold tracking-wide text-indigo-300 uppercase">
                AI Mentor Recommendation
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {dynamicRecommendation.text}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleAcceptAiSuggestion}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Recommended Task</span>
              </button>
              <button
                onClick={() => setActiveView('mentor')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Consult Mentor
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Quick Task Capture Bar & Floating Action Button */}
      <QuickTaskCapture />
    </div>
  );
};
