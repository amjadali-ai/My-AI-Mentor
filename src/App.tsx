/**
 * My AI Mentor
 * Personal AI Study Mentor, Productivity, Self-Improvement and Life Management System
 * Built for BS Artificial Intelligence Student
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { LockScreen } from './components/auth/LockScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { UniversityView } from './components/university/UniversityView';
import { TasksView } from './components/tasks/TasksView';
import { GoalsView } from './components/goals/GoalsView';
import { StudyTimerView } from './components/timer/StudyTimerView';
import { ReflectionView } from './components/reflection/ReflectionView';
import { WeeklyReviewView } from './components/review/WeeklyReviewView';
import { MentorView } from './components/mentor/MentorView';
import { SettingsView } from './components/settings/SettingsView';
import { VoiceMentorModal } from './components/voice/VoiceMentorModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainAppContent: React.FC = () => {
  const {
    activeView,
    isLoading,
    isLocked,
    isVoiceModalOpen,
    setIsVoiceModalOpen,
    isOnboardingOpen,
    setIsOnboardingOpen,
  } = useApp();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg animate-pulse">
            M
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Initializing local-first database...
          </span>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <AppLayout>
      <ErrorBoundary scope="Active View">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'university' && <UniversityView />}
        {activeView === 'tasks' && <TasksView />}
        {activeView === 'goals' && <GoalsView />}
        {activeView === 'timer' && <StudyTimerView />}
        {activeView === 'reflection' && <ReflectionView />}
        {activeView === 'review' && <WeeklyReviewView />}
        {activeView === 'mentor' && <MentorView />}
        {activeView === 'settings' && <SettingsView />}
      </ErrorBoundary>
      <VoiceMentorModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} />
      <OnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
    </AppLayout>
  );
};

export default function App() {
  return (
    <ErrorBoundary scope="Root Application">
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
