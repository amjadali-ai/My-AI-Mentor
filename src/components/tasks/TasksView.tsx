import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskCategory, Priority, TaskStatus } from '../../types';
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Circle,
  MoreVertical,
  X,
  Trash2,
  Edit2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const {
    tasks,
    subjects,
    goals,
    timetable,
    deadlines,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    showNotification,
  } = useApp();

  const [filterTab, setFilterTab] = useState<'today' | 'tomorrow' | 'overdue' | 'upcoming' | 'all' | 'completed'>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Missed reason modal
  const [missedTaskId, setMissedTaskId] = useState<string | null>(null);
  const [missedStatus, setMissedStatus] = useState<'postponed' | 'skipped'>('postponed');
  const [missedReason, setMissedReason] = useState('');

  // Tomorrow Planner Drawer / Workflow
  const [showTomorrowPlanner, setShowTomorrowPlanner] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<{
    rationale: string;
    topPriorities: string[];
    suggestedTasks: Array<{
      title: string;
      category: string;
      estimatedMinutes: number;
      priority: string;
      selected?: boolean;
    }>;
    caution?: string;
  } | null>(null);

  // Task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('DSA & OOP');
  const [subjectId, setSubjectId] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedTime, setPlannedTime] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const handleOpenTaskModal = (t?: Task) => {
    if (t) {
      setEditingTask(t);
      setTitle(t.title);
      setDescription(t.description || '');
      setCategory(t.category);
      setSubjectId(t.subjectId || '');
      setGoalId(t.goalId || '');
      setMilestoneId(t.milestoneId || '');
      setPriority(t.priority);
      setPlannedDate(t.plannedDate || todayStr);
      setPlannedTime(t.plannedTime || '');
      setEstimatedMinutes(t.estimatedMinutes);
    } else {
      setEditingTask(null);
      setTitle('');
      setDescription('');
      setCategory('DSA & OOP');
      setSubjectId(subjects[0]?.id || '');
      setGoalId(goals[0]?.id || '');
      setMilestoneId('');
      setPriority('medium');
      setPlannedDate(filterTab === 'tomorrow' ? tomorrowStr : todayStr);
      setPlannedTime('');
      setEstimatedMinutes(45);
    }
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      await updateTask({
        ...editingTask,
        title: title.trim(),
        description: description.trim(),
        category,
        subjectId: subjectId || undefined,
        goalId: goalId || undefined,
        milestoneId: milestoneId || undefined,
        priority,
        plannedDate,
        plannedTime: plannedTime || undefined,
        estimatedMinutes,
      });
    } else {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        category,
        subjectId: subjectId || undefined,
        goalId: goalId || undefined,
        milestoneId: milestoneId || undefined,
        priority,
        plannedDate,
        plannedTime: plannedTime || undefined,
        estimatedMinutes,
        status: 'not_started',
      });
    }
    setShowTaskModal(false);
  };

  const handleStatusChange = async (task: Task, nextStatus: TaskStatus) => {
    if (nextStatus === 'postponed' || nextStatus === 'skipped') {
      setMissedTaskId(task.id);
      setMissedStatus(nextStatus);
      setMissedReason('');
    } else {
      await setTaskStatus(task.id, nextStatus);
    }
  };

  const handleSaveMissedReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missedTaskId) return;
    await setTaskStatus(missedTaskId, missedStatus, missedReason.trim());
    setMissedTaskId(null);
    setMissedReason('');
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (filterTab === 'today') {
      if (t.plannedDate !== todayStr && t.plannedDate) return false;
      if (t.status === 'completed') return false;
    } else if (filterTab === 'tomorrow') {
      if (t.plannedDate !== tomorrowStr) return false;
      if (t.status === 'completed') return false;
    } else if (filterTab === 'overdue') {
      if (!t.plannedDate || t.plannedDate >= todayStr) return false;
      if (t.status === 'completed') return false;
    } else if (filterTab === 'upcoming') {
      if (!t.plannedDate || t.plannedDate <= todayStr) return false;
      if (t.status === 'completed') return false;
    } else if (filterTab === 'completed') {
      if (t.status !== 'completed') return false;
    }

    if (selectedCategory !== 'All' && t.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  // Calculate planned hours for tomorrow
  const tomorrowTasksList = tasks.filter(t => t.plannedDate === tomorrowStr);
  const tomorrowTotalMinutes = tomorrowTasksList.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const isOverloaded = tomorrowTotalMinutes > 330; // > 5.5 hours

  // Call Server-Side Gemini to generate tomorrow plan
  const handleGenerateAiTomorrowPlan = async () => {
    setIsGeneratingPlan(true);
    setAiPlanResult(null);
    try {
      const tomorrowDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        new Date(Date.now() + 86400000).getDay()
      ];
      const tomorrowClasses = timetable.filter(t => t.day === tomorrowDayName);
      const pendingToday = tasks.filter(t => t.plannedDate === todayStr && t.status !== 'completed');

      const res = await fetch('/api/gemini/plan-tomorrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule: tomorrowClasses,
          unfinishedTasks: pendingToday.map(t => ({ title: t.title, priority: t.priority })),
          deadlines: deadlines.map(d => ({ title: d.title, dueDate: d.dueDate })),
          goals: goals.map(g => g.title),
          maxHours: 5,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate AI plan.');
      }

      const data = await res.json();
      if (data.suggestedTasks) {
        setAiPlanResult({
          ...data,
          suggestedTasks: data.suggestedTasks.map((t: any) => ({ ...t, selected: true })),
        });
      }
    } catch (err: any) {
      showNotification(
        err.message || 'Could not connect to Gemini API. Ensure server has GEMINI_API_KEY.',
        'warning'
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAcceptAiPlanTasks = async () => {
    if (!aiPlanResult) return;
    for (const st of aiPlanResult.suggestedTasks) {
      if (st.selected) {
        await addTask({
          title: st.title,
          category: (st.category as TaskCategory) || 'University',
          priority: (st.priority.toLowerCase() as Priority) || 'medium',
          estimatedMinutes: st.estimatedMinutes || 45,
          plannedDate: tomorrowStr,
          status: 'not_started',
        });
      }
    }
    setAiPlanResult(null);
    setShowTomorrowPlanner(false);
    setFilterTab('tomorrow');
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Tasks & Tomorrow Planning
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize daily tasks, track duration, and plan tomorrow evening with balance control
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTomorrowPlanner(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Plan Tomorrow Evening</span>
          </button>
          <button
            onClick={() => handleOpenTaskModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Main Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl w-fit overflow-x-auto">
          <button
            onClick={() => setFilterTab('today')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterTab === 'today'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Today's Focus
          </button>
          <button
            onClick={() => setFilterTab('tomorrow')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterTab === 'tomorrow'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tomorrow Planned ({tomorrowTasksList.length})
          </button>
          {tasks.some(t => t.status !== 'completed' && t.plannedDate && t.plannedDate < todayStr) && (
            <button
              onClick={() => setFilterTab('overdue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filterTab === 'overdue'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
              }`}
            >
              Overdue ({tasks.filter(t => t.status !== 'completed' && t.plannedDate && t.plannedDate < todayStr).length})
            </button>
          )}
          <button
            onClick={() => setFilterTab('upcoming')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterTab === 'upcoming'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Pending
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterTab === 'completed'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium"
        >
          <option value="All">All Categories</option>
          <option value="University">University</option>
          <option value="Programming">Programming</option>
          <option value="AI & ML">AI & ML</option>
          <option value="DSA & OOP">DSA & OOP</option>
          <option value="Project">Project</option>
          <option value="Career Prep">Career Prep</option>
          <option value="Personal Habit">Personal Habit</option>
          <option value="Revision">Revision</option>
        </select>
      </div>

      {/* Tasks List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No tasks found matching your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTasks.map(task => {
              const isCompleted = task.status === 'completed';
              const isPostponed = task.status === 'postponed';
              const isSkipped = task.status === 'skipped';
              const isInProgress = task.status === 'in_progress';
              const linkedSub = subjects.find(s => s.id === task.subjectId);
              const linkedGoal = goals.find(g => g.id === task.goalId);

              return (
                <div
                  key={task.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleStatusChange(task, isCompleted ? 'not_started' : 'completed')}
                      className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold ${
                          isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {task.category}
                        </span>

                        {linkedSub && (
                          <>
                            <span>·</span>
                            <span style={{ color: linkedSub.color }}>{linkedSub.code}</span>
                          </>
                        )}

                        {linkedGoal && (
                          <>
                            <span>·</span>
                            <span className="text-violet-500 truncate max-w-[150px]">{linkedGoal.title}</span>
                            {task.milestoneId && (() => {
                              const foundMilestone = linkedGoal.milestones.find(m => m.id === task.milestoneId);
                              if (!foundMilestone) return null;
                              return (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 truncate max-w-[120px]">
                                  Milestone: {foundMilestone.title}
                                </span>
                              );
                            })()}
                          </>
                        )}

                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          Est: {task.estimatedMinutes}m
                          {task.actualMinutes ? ` (Spent: ${task.actualMinutes}m)` : ''}
                        </span>

                        {task.plannedTime && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{task.plannedTime}</span>
                          </>
                        )}

                        {task.missedReason && (
                          <>
                            <span>·</span>
                            <span className="text-amber-500 italic">
                              Reason: {task.missedReason}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Pill */}
                  <div className="flex items-center gap-3 shrink-0 ml-8 sm:ml-0">
                    {/* Status dropdown */}
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task, e.target.value as TaskStatus)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : isInProgress
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                          : isPostponed
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                          : isSkipped
                          ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="postponed">Postponed</option>
                      <option value="skipped">Skipped</option>
                    </select>

                    <button
                      onClick={() => handleOpenTaskModal(task)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOMORROW PLANNER WORKFLOW DRAWER / MODAL */}
      {showTomorrowPlanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Tomorrow Evening Planner
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Plan tomorrow without schedule overloading
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTomorrowPlanner(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Tomorrow Load Status */}
            <div
              className={`p-4 rounded-xl border my-4 text-xs ${
                isOverloaded
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1 font-semibold">
                <div className="flex items-center gap-1.5">
                  {isOverloaded && <AlertCircle className="w-4 h-4 text-rose-500" />}
                  <span>Tomorrow's Current Workload:</span>
                </div>
                <span className="font-mono tabular-nums">
                  {Math.floor(tomorrowTotalMinutes / 60)}h {tomorrowTotalMinutes % 60}m across{' '}
                  {tomorrowTasksList.length} tasks
                </span>
              </div>
              {isOverloaded && (
                <p className="text-[11px] mt-1 text-rose-600 dark:text-rose-400">
                  Overload warning: More than 5.5 hours planned. Recommended study limit is 4-5 hours to prevent burnout.
                </p>
              )}
            </div>

            {/* AI Generation Step */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  AI Planning Assistant
                </span>
                <button
                  type="button"
                  onClick={handleGenerateAiTomorrowPlan}
                  disabled={isGeneratingPlan}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingPlan ? 'Synthesizing Plan...' : 'Generate Balanced Plan'}</span>
                </button>
              </div>

              {aiPlanResult && (
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-1">
                      Mentor Rationale:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {aiPlanResult.rationale}
                    </p>
                  </div>

                  {aiPlanResult.topPriorities?.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Top 3 Priorities:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                        {aiPlanResult.topPriorities.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiPlanResult.caution && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{aiPlanResult.caution}</span>
                    </div>
                  )}

                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                      Suggested Tasks (Uncheck any you reject):
                    </span>
                    <div className="space-y-2">
                      {aiPlanResult.suggestedTasks.map((st, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={st.selected}
                            onChange={() => {
                              const updated = [...aiPlanResult.suggestedTasks];
                              updated[idx].selected = !updated[idx].selected;
                              setAiPlanResult({ ...aiPlanResult, suggestedTasks: updated });
                            }}
                            className="rounded text-indigo-600"
                          />
                          <span className="flex-1 font-medium text-slate-900 dark:text-white">
                            {st.title}
                          </span>
                          <span className="font-mono text-slate-400">{st.estimatedMinutes}m</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleAcceptAiPlanTasks}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
                    >
                      Approve & Add Selected to Tomorrow
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowTomorrowPlanner(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Close Planner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MISSED REASON MODAL */}
      {missedTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Record Reason for {missedStatus === 'postponed' ? 'Postponing' : 'Skipping'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Tracking why tasks get missed helps My AI Mentor detect friction patterns and optimize your schedule.
            </p>

            <form onSubmit={handleSaveMissedReason} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Why was this task {missedStatus}?
                </label>
                <textarea
                  rows={3}
                  required
                  value={missedReason}
                  onChange={e => setMissedReason(e.target.value)}
                  placeholder="e.g. Underestimated lab prep time; urgent university quiz took priority; fatigue..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMissedTaskId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Save & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Implement Dijkstra's algorithm in modern C++"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Sub-steps
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Specific details, notes, or code links..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as TaskCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  >
                    <option value="DSA & OOP">DSA & OOP</option>
                    <option value="AI & ML">AI & ML</option>
                    <option value="Programming">Programming</option>
                    <option value="University">University</option>
                    <option value="Project">Project</option>
                    <option value="Career Prep">Career Prep</option>
                    <option value="Personal Habit">Personal Habit</option>
                    <option value="Revision">Revision</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as Priority)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Related Subject (Optional)
                  </label>
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
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

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Related Goal (Optional)
                  </label>
                  <select
                    value={goalId}
                    onChange={e => {
                      setGoalId(e.target.value);
                      setMilestoneId('');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
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

              {goalId && (() => {
                const targetGoal = goals.find(g => g.id === goalId);
                if (!targetGoal || targetGoal.milestones.length === 0) return null;
                return (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Link to Specific Milestone (Optional)
                    </label>
                    <select
                      value={milestoneId}
                      onChange={e => setMilestoneId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                    >
                      <option value="">General Goal Task (No specific milestone)</option>
                      {targetGoal.milestones.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.title} {m.completed ? '✓ (Completed)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Planned Date
                  </label>
                  <input
                    type="date"
                    value={plannedDate}
                    onChange={e => setPlannedDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={plannedTime}
                    onChange={e => setPlannedTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Est. Minutes
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={estimatedMinutes}
                    onChange={e => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
