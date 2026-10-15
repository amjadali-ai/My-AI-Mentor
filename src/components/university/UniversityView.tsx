import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UniversitySubject, TimetableClass, Deadline, DayOfWeek, AssessmentType } from '../../types';
import {
  GraduationCap,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  BookOpen,
} from 'lucide-react';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const UniversityView: React.FC = () => {
  const {
    subjects,
    timetable,
    deadlines,
    addSubject,
    updateSubject,
    deleteSubject,
    addClassSlot,
    updateClassSlot,
    deleteClassSlot,
    addDeadline,
    updateDeadline,
    deleteDeadline,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'timetable' | 'subjects' | 'deadlines'>('timetable');

  // Modals state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<UniversitySubject | null>(null);

  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<TimetableClass | null>(null);

  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);

  // Subject Form State
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subInstructor, setSubInstructor] = useState('');
  const [subRoom, setSubRoom] = useState('');
  const [subCredits, setSubCredits] = useState(3);
  const [subColor, setSubColor] = useState('#3b82f6');
  const [subNotes, setSubNotes] = useState('');
  const [subTargetGrade, setSubTargetGrade] = useState('A');

  // Class Form State
  const [classSubjectId, setClassSubjectId] = useState(subjects[0]?.id || '');
  const [classDay, setClassDay] = useState<DayOfWeek>('Monday');
  const [classStart, setClassStart] = useState('09:00');
  const [classEnd, setClassEnd] = useState('10:30');
  const [classRoom, setClassRoom] = useState('');
  const [classType, setClassType] = useState<'Lecture' | 'Lab' | 'Tutorial'>('Lecture');

  // Deadline Form State
  const [dlSubjectId, setDlSubjectId] = useState(subjects[0]?.id || '');
  const [dlTitle, setDlTitle] = useState('');
  const [dlType, setDlType] = useState<AssessmentType>('Assignment');
  const [dlDueDate, setDlDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dlDueTime, setDlDueTime] = useState('23:59');
  const [dlWeight, setDlWeight] = useState<number | undefined>(10);
  const [dlMaxScore, setDlMaxScore] = useState<number | undefined>(100);
  const [dlObtainedScore, setDlObtainedScore] = useState<number | undefined>(undefined);
  const [dlStatus, setDlStatus] = useState<'pending' | 'submitted' | 'graded'>('pending');
  const [dlNotes, setDlNotes] = useState('');

  // Handlers
  const handleOpenSubjectModal = (sub?: UniversitySubject) => {
    if (sub) {
      setEditingSubject(sub);
      setSubCode(sub.code);
      setSubName(sub.name);
      setSubInstructor(sub.instructor);
      setSubRoom(sub.room || '');
      setSubCredits(sub.creditHours);
      setSubColor(sub.color);
      setSubNotes(sub.notes || '');
      setSubTargetGrade(sub.targetGrade || 'A');
    } else {
      setEditingSubject(null);
      setSubCode('');
      setSubName('');
      setSubInstructor('');
      setSubRoom('');
      setSubCredits(3);
      setSubColor('#3b82f6');
      setSubNotes('');
      setSubTargetGrade('A');
    }
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCode.trim() || !subName.trim()) return;

    if (editingSubject) {
      await updateSubject({
        ...editingSubject,
        code: subCode.trim(),
        name: subName.trim(),
        instructor: subInstructor.trim(),
        room: subRoom.trim(),
        creditHours: subCredits,
        color: subColor,
        notes: subNotes.trim(),
        targetGrade: subTargetGrade,
      });
    } else {
      await addSubject({
        code: subCode.trim(),
        name: subName.trim(),
        instructor: subInstructor.trim(),
        room: subRoom.trim(),
        creditHours: subCredits,
        color: subColor,
        notes: subNotes.trim(),
        targetGrade: subTargetGrade,
      });
    }
    setShowSubjectModal(false);
  };

  const handleOpenClassModal = (cls?: TimetableClass) => {
    if (cls) {
      setEditingClass(cls);
      setClassSubjectId(cls.subjectId);
      setClassDay(cls.day);
      setClassStart(cls.startTime);
      setClassEnd(cls.endTime);
      setClassRoom(cls.room || '');
      setClassType(cls.classType as any);
    } else {
      setEditingClass(null);
      setClassSubjectId(subjects[0]?.id || '');
      setClassDay('Monday');
      setClassStart('09:00');
      setClassEnd('10:30');
      setClassRoom('');
      setClassType('Lecture');
    }
    setShowClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classSubjectId) return;

    if (editingClass) {
      await updateClassSlot({
        ...editingClass,
        subjectId: classSubjectId,
        day: classDay,
        startTime: classStart,
        endTime: classEnd,
        room: classRoom.trim(),
        classType,
        isRecurring: true,
      });
    } else {
      await addClassSlot({
        subjectId: classSubjectId,
        day: classDay,
        startTime: classStart,
        endTime: classEnd,
        room: classRoom.trim(),
        classType,
        isRecurring: true,
      });
    }
    setShowClassModal(false);
  };

  const handleOpenDeadlineModal = (dl?: Deadline) => {
    if (dl) {
      setEditingDeadline(dl);
      setDlSubjectId(dl.subjectId);
      setDlTitle(dl.title);
      setDlType(dl.type);
      setDlDueDate(dl.dueDate);
      setDlDueTime(dl.dueTime || '23:59');
      setDlWeight(dl.weightPercent);
      setDlMaxScore(dl.maxScore);
      setDlObtainedScore(dl.obtainedScore);
      setDlStatus(dl.status);
      setDlNotes(dl.notes || '');
    } else {
      setEditingDeadline(null);
      setDlSubjectId(subjects[0]?.id || '');
      setDlTitle('');
      setDlType('Assignment');
      setDlDueDate(new Date().toISOString().split('T')[0]);
      setDlDueTime('23:59');
      setDlWeight(10);
      setDlMaxScore(100);
      setDlObtainedScore(undefined);
      setDlStatus('pending');
      setDlNotes('');
    }
    setShowDeadlineModal(true);
  };

  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dlTitle.trim() || !dlSubjectId) return;

    if (editingDeadline) {
      await updateDeadline({
        ...editingDeadline,
        subjectId: dlSubjectId,
        title: dlTitle.trim(),
        type: dlType,
        dueDate: dlDueDate,
        dueTime: dlDueTime,
        weightPercent: dlWeight,
        maxScore: dlMaxScore,
        obtainedScore: dlObtainedScore,
        status: dlStatus,
        notes: dlNotes.trim(),
      });
    } else {
      await addDeadline({
        subjectId: dlSubjectId,
        title: dlTitle.trim(),
        type: dlType,
        dueDate: dlDueDate,
        dueTime: dlDueTime,
        weightPercent: dlWeight,
        maxScore: dlMaxScore,
        obtainedScore: dlObtainedScore,
        status: dlStatus,
        notes: dlNotes.trim(),
      });
    }
    setShowDeadlineModal(false);
  };

  const totalCredits = subjects.reduce((sum, s) => sum + s.creditHours, 0);

  return (
    <div className="space-y-6">
      {/* View Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            University Study Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your courses, weekly timetable, lab classes, and assessment deadlines
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'timetable'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Weekly Timetable
          </button>
          <button
            onClick={() => setActiveTab('deadlines')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'deadlines'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Deadlines & Exams ({deadlines.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'subjects'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Subjects ({subjects.length})
          </button>
        </div>
      </div>

      {/* TAB 1: WEEKLY TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Total Course Load: {totalCredits} Credit Hours · Monday to Friday
            </span>
            <button
              onClick={() => handleOpenClassModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class Slot</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {DAYS.slice(0, 5).map(day => {
              const dayClasses = timetable
                .filter(t => t.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              const isToday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === day;

              return (
                <div
                  key={day}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs flex flex-col ${
                    isToday
                      ? 'border-indigo-500/50 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {dayClasses.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-slate-400">
                        No classes
                      </div>
                    ) : (
                      dayClasses.map(cls => {
                        const sub = subjects.find(s => s.id === cls.subjectId);
                        return (
                          <div
                            key={cls.id}
                            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 group relative hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className="text-xs font-bold truncate max-w-[110px]"
                                style={{ color: sub?.color || '#3b82f6' }}
                              >
                                {sub?.code || 'Course'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {cls.classType}
                              </span>
                            </div>

                            <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                              {sub?.name || 'Class'}
                            </div>

                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono flex items-center justify-between">
                              <span>
                                {cls.startTime}–{cls.endTime}
                              </span>
                              <span>{cls.room || 'Room TBD'}</span>
                            </div>

                            {/* Hover Edit/Delete */}
                            <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-md shadow-xs border border-slate-200 dark:border-slate-700">
                              <button
                                onClick={() => handleOpenClassModal(cls)}
                                className="p-1 text-slate-400 hover:text-indigo-500"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteClassSlot(cls.id)}
                                className="p-1 text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DEADLINES & ASSESSMENTS */}
      {activeTab === 'deadlines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Tracking {deadlines.length} Coursework Deadlines & Exams
            </span>
            <button
              onClick={() => handleOpenDeadlineModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Deadline / Exam</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Title & Type</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Weight</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {deadlines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No deadlines added yet.
                      </td>
                    </tr>
                  ) : (
                    deadlines.map(dl => {
                      const sub = subjects.find(s => s.id === dl.subjectId);
                      const isGraded = dl.status === 'graded';
                      const isSubmitted = dl.status === 'submitted';
                      return (
                        <tr key={dl.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                          <td className="py-3 px-4 font-medium whitespace-nowrap">
                            <span
                              className="font-bold mr-1.5"
                              style={{ color: sub?.color || '#3b82f6' }}
                            >
                              {sub?.code || 'CS'}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {sub?.name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {dl.title}
                            </div>
                            <div className="text-[11px] text-slate-500">{dl.type}</div>
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div className="text-slate-800 dark:text-slate-200">{dl.dueDate}</div>
                            {dl.dueTime && (
                              <div className="text-[10px] text-slate-400">{dl.dueTime}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {dl.weightPercent ? `${dl.weightPercent}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {dl.obtainedScore !== undefined ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {dl.obtainedScore}/{dl.maxScore || 100}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                isGraded
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : isSubmitted
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              }`}
                            >
                              {dl.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenDeadlineModal(dl)}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteDeadline(dl.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBJECTS MANAGER */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {subjects.length} Enrolled Courses · {totalCredits} Total Credits
            </span>
            <button
              onClick={() => handleOpenSubjectModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(sub => (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {sub.code}
                      </span>
                    </div>
                    <span className="text-xs font-semibold font-mono text-indigo-600 dark:text-indigo-400">
                      Target: {sub.targetGrade || 'A'}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {sub.name}
                  </h3>

                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 mt-2">
                    <div>Instructor: {sub.instructor}</div>
                    <div>Room: {sub.room || 'Campus Hall'}</div>
                    <div className="font-mono">Credits: {sub.creditHours} CH</div>
                  </div>

                  {sub.notes && (
                    <div className="mt-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400">
                      {sub.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenSubjectModal(sub)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => deleteSubject(sub.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: SUBJECT */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingSubject ? 'Edit Subject' : 'Add University Subject'}
              </h2>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Course Code (e.g. CS-301)
                </label>
                <input
                  type="text"
                  required
                  value={subCode}
                  onChange={e => setSubCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Instructor
                  </label>
                  <input
                    type="text"
                    value={subInstructor}
                    onChange={e => setSubInstructor(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    value={subRoom}
                    onChange={e => setSubRoom(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={subCredits}
                    onChange={e => setSubCredits(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Color Accent
                  </label>
                  <input
                    type="color"
                    value={subColor}
                    onChange={e => setSubColor(e.target.value)}
                    className="w-full h-8 bg-transparent rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Grade
                  </label>
                  <input
                    type="text"
                    value={subTargetGrade}
                    onChange={e => setSubTargetGrade(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Course Notes & Key Focus
                </label>
                <textarea
                  rows={2}
                  value={subNotes}
                  onChange={e => setSubNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CLASS SLOT */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingClass ? 'Edit Timetable Slot' : 'Add Class to Timetable'}
              </h2>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={classSubjectId}
                  onChange={e => setClassSubjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={classDay}
                    onChange={e => setClassDay(e.target.value as DayOfWeek)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  >
                    {DAYS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Class Type
                  </label>
                  <select
                    value={classType}
                    onChange={e => setClassType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Lab Session</option>
                    <option value="Tutorial">Tutorial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Time (24h)
                  </label>
                  <input
                    type="time"
                    required
                    value={classStart}
                    onChange={e => setClassStart(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End Time (24h)
                  </label>
                  <input
                    type="time"
                    required
                    value={classEnd}
                    onChange={e => setClassEnd(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Classroom / Lab Number
                </label>
                <input
                  type="text"
                  value={classRoom}
                  onChange={e => setClassRoom(e.target.value)}
                  placeholder="e.g. Hall B-204"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DEADLINE */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingDeadline ? 'Edit Assessment' : 'Add Deadline / Exam'}
              </h2>
              <button
                onClick={() => setShowDeadlineModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeadline} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={dlSubjectId}
                  onChange={e => setDlSubjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={dlTitle}
                  onChange={e => setDlTitle(e.target.value)}
                  placeholder="e.g. Assignment 2: Red-Black Trees"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assessment Type
                  </label>
                  <select
                    value={dlType}
                    onChange={e => setDlType(e.target.value as AssessmentType)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  >
                    <option value="Assignment">Assignment</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="Midterm Exam">Midterm Exam</option>
                    <option value="Final Exam">Final Exam</option>
                    <option value="Term Project">Term Project</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={dlStatus}
                    onChange={e => setDlStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="graded">Graded</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dlDueDate}
                    onChange={e => setDlDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={dlDueTime}
                    onChange={e => setDlDueTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Weight %
                  </label>
                  <input
                    type="number"
                    value={dlWeight || ''}
                    onChange={e => setDlWeight(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 15"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Max Score
                  </label>
                  <input
                    type="number"
                    value={dlMaxScore || ''}
                    onChange={e => setDlMaxScore(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 100"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Obtained
                  </label>
                  <input
                    type="number"
                    value={dlObtainedScore !== undefined ? dlObtainedScore : ''}
                    onChange={e => setDlObtainedScore(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 92"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeadlineModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
                >
                  Save Deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
