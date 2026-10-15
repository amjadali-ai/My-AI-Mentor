import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MentorMode, MentorMessage, Priority, TaskCategory } from '../../types';
import {
  Bot,
  Send,
  Sparkles,
  Shield,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  User,
  Zap,
  Mic,
} from 'lucide-react';
import { VoiceMentorModal } from '../voice/VoiceMentorModal';

const MODES: { id: MentorMode; name: string; tag: string; description: string }[] = [
  {
    id: 'mentor',
    name: 'Mentor',
    tag: 'Default',
    description: 'Explains complex concepts, guides computer science learning, and advises on AI career paths.',
  },
  {
    id: 'coach',
    name: 'Coach',
    tag: 'Action',
    description: 'Breaks goals into concrete milestones and holds you accountable with daily momentum.',
  },
  {
    id: 'strict',
    name: 'Strict Mentor',
    tag: 'Direct',
    description: 'Delivers honest, unvarnished reality checks on execution vs ambitions—without shaming or insults.',
  },
  {
    id: 'support',
    name: 'Support',
    tag: 'Recovery',
    description: 'Helps you de-stress after exhausting days, avoids burnout, and builds a gentle next step.',
  },
];

const QUICK_PROMPTS = [
  'Explain Red-Black tree rotations in simple English with an analogy',
  'Audit my recorded study hours this week—am I on track for my GPA goal?',
  'Why am I falling behind on Linear Algebra and how do I catch up?',
  'Break down my Neural Network from scratch goal into 3 weekly steps',
  'I feel overwhelmed by assignments today. Help me prioritize the top 2.',
];

export const MentorView: React.FC = () => {
  const {
    mentorMessages,
    addMentorMessage,
    clearMentorHistory,
    settings,
    updateSettings,
    todaySchedule,
    upcomingDeadlines,
    todayTasks,
    todayStudyMinutes,
    goals,
    reflections,
    addTask,
    showNotification,
  } = useApp();

  const [activeMode, setActiveMode] = useState<MentorMode>('mentor');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mentorMessages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    setInputPrompt('');
    setOfflineNotice(null);

    // Save student message locally
    await addMentorMessage({
      role: 'user',
      content: text,
      mode: activeMode,
    });

    setIsLoading(true);

    try {
      // Assemble privacy-filtered context
      const contextPayload: any = {};

      if (settings.privacy.shareTimetableWithAi) {
        contextPayload.timetableToday = todaySchedule
          .map(t => `${t.subject.code} (${t.slot.startTime}-${t.slot.endTime})`)
          .join(', ');
      }

      if (settings.privacy.shareTasksWithAi) {
        contextPayload.upcomingDeadlines = upcomingDeadlines
          .map(d => `${d.title} (due ${d.dueDate})`)
          .join('; ');
        contextPayload.tasksSummary = `${todayTasks.filter(t => t.status === 'completed').length}/${todayTasks.length} completed today`;
        contextPayload.studyTimeSummary = `${todayStudyMinutes} minutes timed today`;
        contextPayload.activeGoals = goals.map(g => g.title).join('; ');
      }

      if (settings.privacy.shareReflectionsWithAi && reflections.length > 0) {
        const latest = reflections[0];
        contextPayload.recentReflections = `Wins: ${latest.wellDone} | Mistakes: ${latest.mistakes} | Distractions: ${latest.distractions.join(', ')}`;
      }

      // Format previous history
      const history = mentorMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/gemini/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeMode,
          prompt: text,
          context: contextPayload,
          history,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 503) {
          setOfflineNotice(
            'GEMINI_API_KEY is not configured on the server. Offline fallback advice provided.'
          );
          await addMentorMessage({
            role: 'assistant',
            content: `[Offline Mentor Mode Active]
Here is your structured guidance:
1. Ground truth check: Review your ${todayTasks.filter(t => t.status !== 'completed').length} pending tasks and prioritize highest impact coursework first.
2. Technical approach: For complex concepts like trees or matrix proofs, draw out the state transitions on paper before coding.
3. Next step: Configure your GEMINI_API_KEY in the server environment (or Settings > Secrets) to enable full live AI intelligence.`,
            mode: activeMode,
          });
          return;
        }
        throw new Error(errData.error || 'Failed to reach AI mentor.');
      }

      const data = await res.json();
      await addMentorMessage({
        role: 'assistant',
        content: data.reply,
        mode: activeMode,
      });
    } catch (err: any) {
      console.error('Mentor chat error:', err);
      await addMentorMessage({
        role: 'assistant',
        content:
          'I encountered a communication issue connecting to the AI model. Your core study planner and database remain 100% operational offline. Please try again or check network connectivity.',
        mode: activeMode,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTask = async (taskSuggestion: {
    title: string;
    category: TaskCategory;
    estimatedMinutes: number;
    priority: Priority;
  }) => {
    await addTask({
      title: taskSuggestion.title,
      category: taskSuggestion.category || 'DSA & OOP',
      priority: taskSuggestion.priority || 'medium',
      estimatedMinutes: taskSuggestion.estimatedMinutes || 45,
      plannedDate: new Date().toISOString().split('T')[0],
      status: 'not_started',
    });
    showNotification(`Task "${taskSuggestion.title}" added to your today planner!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>My AI Mentor</span>
            <Bot className="w-5 h-5 text-indigo-500" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your personal AI study advisor, technical coach, and accountability partner powered by Google Gemini
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 rounded-xl shadow-xs transition-opacity"
          >
            <Mic className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>Live Voice Conversation</span>
          </button>
          <button
            onClick={clearMentorHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* 4 Mode Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODES.map(m => {
          const isActive = activeMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isActive
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {m.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {m.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Privacy & Context Controls Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong className="font-semibold text-slate-900 dark:text-white">Privacy Controls:</strong>{' '}
            Only selected context is sent to the Gemini API on request. Data never leaves your laptop automatically.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={settings.privacy.shareTasksWithAi}
              onChange={e =>
                updateSettings({
                  privacy: { ...settings.privacy, shareTasksWithAi: e.target.checked },
                })
              }
              className="rounded text-indigo-600"
            />
            <span className="text-[11px]">Include Tasks</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={settings.privacy.shareReflectionsWithAi}
              onChange={e =>
                updateSettings({
                  privacy: { ...settings.privacy, shareReflectionsWithAi: e.target.checked },
                })
              }
              className="rounded text-indigo-600"
            />
            <span className="text-[11px]">Include Reflections</span>
          </label>
        </div>
      </div>

      {/* Offline Notice if applicable */}
      {offlineNotice && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{offlineNotice}</span>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs min-h-[420px] max-h-[550px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {mentorMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                How can I assist your AI studies today?
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
                Ask about algorithm proofs, code debugging, weekly schedule balancing, or exam revision strategies.
              </p>

              {/* Quick Prompts */}
              <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(qp)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-300 text-xs text-left transition-colors"
                  >
                    "{qp}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            mentorMessages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                      AI
                    </div>
                  )}

                  <div
                    className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-1.5 text-[10px] font-mono font-semibold uppercase text-indigo-600 dark:text-indigo-400">
                        <span>Mode: {msg.mode}</span>
                        <span>·</span>
                        <span className="text-slate-400">{msg.timestamp.split('T')[1].slice(0, 5)}</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Quick Accept Task Pill if suggested */}
                    {msg.suggestedTasks && msg.suggestedTasks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                          Suggested Action Items:
                        </span>
                        {msg.suggestedTasks.map((st, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {st.title}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-2">
                                {st.estimatedMinutes}m · {st.priority}
                              </span>
                            </div>
                            <button
                              onClick={() => handleAcceptTask(st)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
                            >
                              Add to Tasks
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 text-xs font-semibold">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold animate-pulse">
                AI
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
                <span>My AI Mentor is reasoning and formulating advice...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            placeholder={`Ask My AI Mentor (${activeMode} mode)...`}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Real-time Voice Mentor Conversation Modal */}
      <VoiceMentorModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />
    </div>
  );
};
