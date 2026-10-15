import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  BookOpen,
  Shield,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, addSubject, showNotification } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Profile Form
  const [name, setName] = useState(settings.studentProfile.name || 'Amjad Roghani');
  const [university, setUniversity] = useState(settings.studentProfile.university || 'UMT Lahore');
  const [degree, setDegree] = useState(settings.studentProfile.degree || 'BS Artificial Intelligence');
  const [semester, setSemester] = useState(settings.studentProfile.semester || '3rd Semester');
  const [focusAreas, setFocusAreas] = useState<string[]>(
    settings.studentProfile.focusAreas || ['C++', 'Python', 'Algorithms', 'AI/ML', 'OOP']
  );
  const [newFocus, setNewFocus] = useState('');

  // Starter subjects state
  const [starterSubjects, setStarterSubjects] = useState<
    Array<{ code: string; name: string; creditHours: number; color: string }>
  >([
    { code: 'CS-301', name: 'Data Structures & Algorithms', creditHours: 4, color: '#3b82f6' },
    { code: 'CS-302', name: 'Computer Architecture & Org', creditHours: 3, color: '#8b5cf6' },
    { code: 'MATH-203', name: 'Linear Algebra & Probability', creditHours: 3, color: '#10b981' },
  ]);

  const [customSubjectCode, setCustomSubjectCode] = useState('');
  const [customSubjectName, setCustomSubjectName] = useState('');

  if (!isOpen) return null;

  const handleAddFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFocus.trim()) return;
    if (!focusAreas.includes(newFocus.trim())) {
      setFocusAreas([...focusAreas, newFocus.trim()]);
    }
    setNewFocus('');
  };

  const handleRemoveFocus = (item: string) => {
    setFocusAreas(focusAreas.filter(f => f !== item));
  };

  const handleAddCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSubjectCode.trim() || !customSubjectName.trim()) return;
    setStarterSubjects([
      ...starterSubjects,
      {
        code: customSubjectCode.trim().toUpperCase(),
        name: customSubjectName.trim(),
        creditHours: 3,
        color: '#6366f1',
      },
    ]);
    setCustomSubjectCode('');
    setCustomSubjectName('');
  };

  const handleRemoveStarterSubject = (code: string) => {
    setStarterSubjects(starterSubjects.filter(s => s.code !== code));
  };

  const handleCompleteOnboarding = async () => {
    // 1. Save updated profile
    await updateSettings({
      studentProfile: {
        name: name.trim(),
        university: university.trim(),
        degree: degree.trim(),
        semester: semester.trim(),
        focusAreas,
      },
      onboardingCompleted: true,
    });

    // 2. Insert any confirmed starter subjects
    for (const sub of starterSubjects) {
      await addSubject({
        code: sub.code,
        name: sub.name,
        instructor: 'Faculty Instructor',
        creditHours: sub.creditHours,
        color: sub.color,
        targetGrade: 'A',
      });
    }

    showNotification(
      `Welcome to My AI Mentor! Your ${semester} profile at ${university} is active.`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
              M
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Set Up My AI Mentor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tailored for your academic journey at UMT Lahore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-400">
            <span className={step >= 1 ? 'text-indigo-600 font-bold' : ''}>1</span>
            <span>·</span>
            <span className={step >= 2 ? 'text-indigo-600 font-bold' : ''}>2</span>
            <span>·</span>
            <span className={step >= 3 ? 'text-indigo-600 font-bold' : ''}>3</span>
          </div>
        </div>

        {/* Step 1: Academic Profile */}
        {step === 1 && (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <GraduationCap className="w-4 h-4" />
              <span>Step 1 of 3: University Profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  University
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={e => setUniversity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Degree Program
                </label>
                <input
                  type="text"
                  value={degree}
                  onChange={e => setDegree(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Semester
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                  placeholder="e.g. 3rd Semester"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Focus areas */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Technical Focus & Interests
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {focusAreas.map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFocus(item)}
                      className="hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddFocus} className="flex gap-2">
                <input
                  type="text"
                  value={newFocus}
                  onChange={e => setNewFocus(e.target.value)}
                  placeholder="Add skill or topic (e.g. PyTorch, Discrete Math)"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Add
                </button>
              </form>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
              >
                <span>Continue to Subjects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Starting Courses */}
        {step === 2 && (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <BookOpen className="w-4 h-4" />
              <span>Step 2 of 3: University Subjects</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Review or customize your current semester subjects. You can freely edit teachers,
              rooms, and timetable schedules later in the University tab.
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {starterSubjects.map(sub => (
                <div
                  key={sub.code}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-6 rounded-full"
                      style={{ backgroundColor: sub.color }}
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                        {sub.code}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">{sub.name}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStarterSubject(sub.code)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCustomSubject} className="grid grid-cols-5 gap-2 pt-2">
              <input
                type="text"
                placeholder="Code (e.g. AI-301)"
                value={customSubjectCode}
                onChange={e => setCustomSubjectCode(e.target.value)}
                className="col-span-2 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="Subject Title"
                value={customSubjectName}
                onChange={e => setCustomSubjectName(e.target.value)}
                className="col-span-2 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
              >
                <span>Continue to Privacy & Security</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Privacy, Security & Confirmation */}
        {step === 3 && (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <Shield className="w-4 h-4" />
              <span>Step 3 of 3: Privacy & Persistence Guarantee</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Local-First & Zero Data Loss Guarantee</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>Your records are stored securely in your laptop's local IndexedDB.</li>
                <li>Data survives browser refreshes, application closes, and computer restarts.</li>
                <li>
                  Daily reflections are private by default and never sent to AI models without your
                  explicit approval.
                </li>
                <li>
                  You can export and restore full encrypted backups at any time in Settings.
                </li>
              </ul>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Launch My AI Mentor</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
