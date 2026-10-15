import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Goal, GoalCategory, Milestone } from '../../types';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  Award,
} from 'lucide-react';

const CATEGORIES: { id: GoalCategory; label: string }[] = [
  { id: 'academic', label: 'Academic Excellence' },
  { id: 'cpp_python', label: 'C++ & Python Mastery' },
  { id: 'oop_dsa', label: 'OOP & DSA' },
  { id: 'ai_ml_data', label: 'AI & Machine Learning' },
  { id: 'projects_research', label: 'Projects & Research' },
  { id: 'career', label: 'Career Development' },
  { id: 'personal', label: 'Personal Development' },
  { id: 'ambition', label: 'Long-term Ambitions' },
];

export const GoalsView: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal, toggleMilestone } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('oop_dsa');
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
  );
  const [milestonesText, setMilestonesText] = useState('');

  const handleOpenGoalModal = (g?: Goal) => {
    if (g) {
      setEditingGoal(g);
      setTitle(g.title);
      setDescription(g.description);
      setCategory(g.category);
      setTargetDate(g.targetDate);
      setMilestonesText(g.milestones.map(m => m.title).join('\n'));
    } else {
      setEditingGoal(null);
      setTitle('');
      setDescription('');
      setCategory('oop_dsa');
      setTargetDate(new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]);
      setMilestonesText('');
    }
    setShowGoalModal(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const rawMilestones = milestonesText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    if (editingGoal) {
      // Preserve existing milestone completion states where titles match
      const updatedMilestones: Milestone[] = rawMilestones.map((t, idx) => {
        const existing = editingGoal.milestones.find(m => m.title === t);
        return {
          id: existing ? existing.id : `m-${Date.now()}-${idx}`,
          title: t,
          completed: existing ? existing.completed : false,
          completedAt: existing ? existing.completedAt : undefined,
        };
      });

      await updateGoal({
        ...editingGoal,
        title: title.trim(),
        description: description.trim(),
        category,
        targetDate,
        milestones: updatedMilestones,
      });
    } else {
      const newMilestones: Milestone[] = rawMilestones.map((t, idx) => ({
        id: `m-${Date.now()}-${idx}`,
        title: t,
        completed: false,
      }));

      await addGoal({
        title: title.trim(),
        description: description.trim(),
        category,
        targetDate,
        status: 'active',
        milestones: newMilestones,
      });
    }
    setShowGoalModal(false);
  };

  const filteredGoals = goals.filter(g => {
    if (selectedCategory !== 'all' && g.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Goals & Long-Term Milestones
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track measurable progress across university studies, C++ & Python coding, and AI career ambitions
          </p>
        </div>

        <button
          onClick={() => handleOpenGoalModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Category Pills Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          All Goals ({goals.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = goals.filter(g => g.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {cat.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredGoals.length === 0 ? (
          <div className="lg:col-span-2 py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No goals found in this category. Click "New Goal" to create your first milestone path!
          </div>
        ) : (
          filteredGoals.map(goal => {
            const completedCount = goal.milestones.filter(m => m.completed).length;
            const progress =
              goal.milestones.length > 0
                ? Math.round((completedCount / goal.milestones.length) * 100)
                : 0;

            const categoryLabel = CATEGORIES.find(c => c.id === goal.category)?.label || goal.category;

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {categoryLabel}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Target: {goal.targetDate}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                    {goal.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {goal.description}
                  </p>

                  {/* Progress Bar & Calculated Ratio */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Verified Progress:</span>
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {completedCount} of {goal.milestones.length} milestones ({progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestones Checklist */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Milestone Roadmap:
                    </span>
                    {goal.milestones.map(m => (
                      <div
                        key={m.id}
                        onClick={() => toggleMilestone(goal.id, m.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          m.completed
                            ? 'bg-slate-50/60 dark:bg-slate-800/20 text-slate-500'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <button type="button" className="mt-0.5 shrink-0 text-slate-400">
                          {m.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-xs block ${
                              m.completed ? 'line-through text-slate-400' : 'font-medium'
                            }`}
                          >
                            {m.title}
                          </span>
                          {m.completedAt && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Completed {m.completedAt.split('T')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 font-mono">
                    Created {goal.createdAt}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenGoalModal(goal)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* GOAL MODAL */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingGoal ? 'Edit Goal' : 'Define New Goal & Milestones'}
              </h2>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Master C++ Pointers and Memory Management"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Concrete Standard
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does success look like? State concrete standards..."
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
                    onChange={e => setCategory(e.target.value as GoalCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Milestones (One per line)
                </label>
                <textarea
                  rows={4}
                  required
                  value={milestonesText}
                  onChange={e => setMilestonesText(e.target.value)}
                  placeholder="Milestone 1: Read Chapter 3 and take notes&#10;Milestone 2: Solve 10 LeetCode Mediums&#10;Milestone 3: Build sample custom vector in C++"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono text-[11px]"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Progress is mathematically calculated from checked milestones.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
