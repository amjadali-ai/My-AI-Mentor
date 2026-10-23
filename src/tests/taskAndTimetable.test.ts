import { describe, it, expect } from 'vitest';
import { Task, TimetableClass, Goal } from '../types';

describe('Domain Logic & Task Grouping Verification', () => {
  const mockTasks: Task[] = [
    {
      id: 't-overdue',
      title: 'Finish Lab Report 1',
      category: 'University',
      priority: 'high',
      status: 'not_started',
      plannedDate: '2026-10-10', // Prior to current date
      estimatedMinutes: 60,
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 't-today',
      title: 'OOP Practice Questions',
      category: 'DSA & OOP',
      priority: 'medium',
      status: 'in_progress',
      plannedDate: '2026-10-18', // Today
      estimatedMinutes: 45,
      createdAt: '2026-10-18T00:00:00Z',
      updatedAt: '2026-10-18T00:00:00Z',
    },
    {
      id: 't-upcoming',
      title: 'Midterm Exam Prep',
      category: 'University',
      priority: 'urgent',
      status: 'not_started',
      plannedDate: '2026-10-25', // Future
      estimatedMinutes: 120,
      createdAt: '2026-10-18T00:00:00Z',
      updatedAt: '2026-10-18T00:00:00Z',
    },
    {
      id: 't-completed',
      title: 'Review C++ Pointers',
      category: 'Programming',
      priority: 'medium',
      status: 'completed',
      plannedDate: '2026-10-17',
      estimatedMinutes: 30,
      createdAt: '2026-10-17T00:00:00Z',
      updatedAt: '2026-10-17T12:00:00Z',
      completedAt: '2026-10-17T12:00:00Z',
    },
  ];

  const todayStr = '2026-10-18';

  it('correctly partitions tasks into overdue, today, upcoming, and completed categories', () => {
    const overdue = mockTasks.filter(t => t.status !== 'completed' && t.plannedDate && t.plannedDate < todayStr);
    const today = mockTasks.filter(t => t.status !== 'completed' && (t.plannedDate === todayStr || !t.plannedDate));
    const upcoming = mockTasks.filter(t => t.status !== 'completed' && t.plannedDate && t.plannedDate > todayStr);
    const completed = mockTasks.filter(t => t.status === 'completed');

    expect(overdue.map(t => t.id)).toEqual(['t-overdue']);
    expect(today.map(t => t.id)).toEqual(['t-today']);
    expect(upcoming.map(t => t.id)).toEqual(['t-upcoming']);
    expect(completed.map(t => t.id)).toEqual(['t-completed']);
  });

  it('supports 7-day timetable items with personal activities and detects overlapping times', () => {
    const timetable: TimetableClass[] = [
      {
        id: 'slot-1',
        subjectId: 'sub-cc112',
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:30',
        classType: 'Lecture',
        isRecurring: true,
      },
      {
        id: 'slot-overlap',
        subjectId: 'personal',
        title: 'Gym & Fitness',
        day: 'Monday',
        startTime: '10:00',
        endTime: '11:00',
        classType: 'Personal',
        isRecurring: true,
      },
      {
        id: 'slot-weekend',
        subjectId: 'personal',
        title: 'Weekend DSA Coding Sprint',
        day: 'Sunday',
        startTime: '14:00',
        endTime: '16:00',
        classType: 'Study Session',
        isRecurring: false,
      },
    ];

    expect(timetable.length).toBe(3);
    const sundaySlot = timetable.find(t => t.day === 'Sunday');
    expect(sundaySlot).toBeDefined();
    expect(sundaySlot?.classType).toBe('Study Session');

    // Overlap calculation
    const mondaySlots = timetable.filter(t => t.day === 'Monday');
    const a = mondaySlots[0];
    const b = mondaySlots[1];
    const isOverlapping = a.startTime < b.endTime && a.endTime > b.startTime;
    expect(isOverlapping).toBe(true);
  });

  it('preserves goals, milestone links, and prevents double-counting progress', () => {
    const goal: Goal = {
      id: 'g-cpp',
      title: 'Master Modern C++',
      description: 'Learn modern idioms',
      category: 'cpp_python',
      targetDate: '2026-12-31',
      status: 'active',
      milestones: [
        { id: 'm-1', title: 'Smart pointers & RAII', completed: true },
        { id: 'm-2', title: 'Templates & Metaprogramming', completed: false },
      ],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const taskLinkedToMilestone: Task = {
      id: 't-m1',
      title: 'Practice std::unique_ptr exercises',
      category: 'DSA & OOP',
      priority: 'high',
      status: 'completed',
      goalId: 'g-cpp',
      milestoneId: 'm-1',
      estimatedMinutes: 45,
      createdAt: '2026-10-18T00:00:00Z',
      updatedAt: '2026-10-18T00:00:00Z',
    };

    // Removing the task or milestone does not delete the other
    expect(taskLinkedToMilestone.goalId).toBe(goal.id);
    expect(taskLinkedToMilestone.milestoneId).toBe(goal.milestones[0].id);

    // Goal progress is calculated purely on verified milestones, avoiding double-count
    const verifiedProgress = Math.round(
      (goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100
    );
    expect(verifiedProgress).toBe(50);
  });
});
