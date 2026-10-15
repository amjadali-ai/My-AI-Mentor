import React, { useState, useEffect } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import {
  LayoutDashboard,
  GraduationCap,
  CheckSquare,
  Target,
  Timer,
  Brain,
  BarChart3,
  Bot,
  Settings,
  Lock,
  Sun,
  Moon,
  Clock,
  Calendar,
  AlertCircle,
  Menu,
  X,
  Shield,
  Mic,
  LogIn,
  LogOut,
  Cloud,
  CheckCircle2,
} from 'lucide-react';

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeView,
    setActiveView,
    theme,
    toggleTheme,
    lockApp,
    lockSettings,
    settings,
    todayTasks,
    nextClass,
    upcomingDeadlines,
    currentUser,
    signInWithGoogle,
    signOut,
    isFirestoreConnected,
    setIsVoiceModalOpen,
    notification,
    dismissNotification,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingTasksCount = todayTasks.filter(t => t.status === 'not_started' || t.status === 'in_progress').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'university', label: 'University & Timetable', icon: GraduationCap },
    { id: 'tasks', label: 'Tasks & Tomorrow', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : undefined },
    { id: 'goals', label: 'Goals & Milestones', icon: Target },
    { id: 'timer', label: 'Study Timer', icon: Timer },
    { id: 'reflection', label: 'Daily Reflection', icon: Brain },
    { id: 'review', label: 'Weekly Review', icon: BarChart3 },
    { id: 'mentor', label: 'My AI Mentor', icon: Bot },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  const formattedDate = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Laptop-First Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-base">
              M
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base block">
                My AI Mentor
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                BS Artificial Intelligence
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Voice Conversation Action Tile */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:shadow-indigo-500/25 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold block">Live Voice Mentor</span>
                <span className="text-[10px] text-indigo-100 block">Gemini 3.8 Live API</span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
          </button>
        </div>

        {/* Student Profile Quick Snippet */}
        <div className="p-3 mx-3 mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {currentUser ? currentUser.displayName || currentUser.email : settings.studentProfile.name}
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
              {settings.studentProfile.semester}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {settings.studentProfile.degree}
            </span>
            {currentUser && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Cloud className="w-3 h-3" />
                <span>Cloud</span>
              </span>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info: Local storage assurance & Quick Lock */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {lockSettings.isLockEnabled ? (
            <button
              onClick={lockApp}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Lock App</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveView('settings')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Setup PIN Lock</span>
            </button>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 px-1">
            <span>{currentUser ? 'Firestore + IndexedDB' : 'Local-First DB'}</span>
            <span className="font-mono">v1.1</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Active view title */}
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                {activeView.replace('-', ' ')}
              </span>
              <span className="hidden sm:inline text-xs text-slate-400">·</span>
              <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
                {settings.studentProfile.university}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3.5">
            {/* Live Voice CTA in header */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors"
              title="Start real-time voice conversation with Gemini 3.8 Live"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Live Voice</span>
            </button>

            {/* Next Class Notification Pill */}
            {nextClass && (
              <div className="hidden xl:flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 py-1 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-medium">{nextClass.subject.code}</span>
                <span className="text-slate-400">in {nextClass.startsInMinutes}m</span>
              </div>
            )}

            {/* Live Clock Display */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                {formattedTime}
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">
                {formattedDate}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Google Authentication Button / User Profile */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-7 h-7 rounded-full object-cover border border-indigo-500"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden lg:inline text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                    {currentUser.displayName?.split(' ')[0] || 'Student'}
                  </span>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-semibold block text-slate-900 dark:text-white truncate">
                        {currentUser.displayName || 'Student'}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {currentUser.email}
                      </span>
                    </div>

                    <div className="px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Firestore Sync Active</span>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign in with Google</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
          {notification && (
            <div className="fixed top-20 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
              <div
                className={`flex items-start gap-3 p-4 rounded-2xl shadow-xl border text-xs font-medium backdrop-blur-md ${
                  notification.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-100'
                    : notification.type === 'error'
                    ? 'bg-rose-950/90 border-rose-700/80 text-rose-100'
                    : notification.type === 'warning'
                    ? 'bg-amber-950/90 border-amber-700/80 text-amber-100'
                    : 'bg-slate-900/90 border-slate-700/80 text-slate-100'
                }`}
              >
                <div className="flex-1 leading-relaxed">{notification.message}</div>
                <button
                  onClick={dismissNotification}
                  className="text-slate-400 hover:text-white p-0.5 rounded-lg"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
