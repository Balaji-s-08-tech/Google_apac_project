import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Conversation, JournalMode, NavigationTab, ReflectionInsight } from '../types.js';
import { MODES_CONFIG } from './ModeSelector.js';
import { fetchUserConversations, fetchUserInsights } from '../lib/apiClient.js';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  Clock,
  BookOpen,
  Compass,
  MessageSquare,
  Shield,
  Layers,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onStartMode: (mode: JournalMode) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectConversation,
  onStartMode,
}) => {
  const { user, getAuthHeaders } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [insights, setInsights] = useState<ReflectionInsight[]>([]);
  const [completedActions, setCompletedActions] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`gemini_journal_actions_${user?.uid}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const headers = getAuthHeaders();
        const [convs, ins] = await Promise.all([
          fetchUserConversations(headers).catch(() => []),
          fetchUserInsights(headers).catch(() => []),
        ]);
        setConversations(convs);
        setInsights(ins);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, [user]);

  const toggleActionItem = (itemText: string) => {
    setCompletedActions((prev) => {
      const next = new Set(prev);
      if (next.has(itemText)) {
        next.delete(itemText);
      } else {
        next.add(itemText);
      }
      if (user) {
        localStorage.setItem(`gemini_journal_actions_${user.uid}`, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const latestInsight = insights[0] || null;
  const recentConversations = conversations.slice(0, 4);

  // Aggregate action items across latest 3 insights
  const allActionItems: Array<{ text: string; sourceTitle: string }> = [];
  insights.slice(0, 3).forEach((ins) => {
    ins.actionItems.forEach((action) => {
      if (!allActionItems.some((a) => a.text === action)) {
        allActionItems.push({ text: action, sourceTitle: ins.conversationTitle });
      }
    });
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Welcome Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-stone-800 border border-stone-700/60 text-[11px] font-mono text-stone-300">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Zero-Trust UID Isolation Active</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-100 font-normal tracking-tight">
              Good to see you, {user?.displayName || 'Friend'}.
            </h1>
            <p className="text-sm text-stone-400 max-w-xl leading-relaxed">
              Your private AI thinking space — helping you turn thoughts into clarity and action. What would you like to explore today?
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="dashboard-new-journal-btn"
              onClick={() => {
                onStartMode('free_journal');
                onNavigate('chat');
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-all shadow-md"
            >
              <BookOpen className="w-4 h-4" />
              <span>Start Journaling</span>
            </button>
            <button
              id="dashboard-view-insights-btn"
              onClick={() => onNavigate('reflection')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Reflection Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Launch Modes Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-stone-100 font-medium">
            Choose Your Thinking Mode
          </h2>
          <span className="text-xs font-mono text-stone-500">Gemini 3.7 Flash</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(Object.keys(MODES_CONFIG) as JournalMode[]).map((modeKey) => {
            const modeInfo = MODES_CONFIG[modeKey];
            const Icon = modeInfo.icon;
            return (
              <div
                key={modeKey}
                onClick={() => {
                  onStartMode(modeKey);
                  onNavigate('chat');
                }}
                className="bg-stone-900 border border-stone-800 hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer group transition-all hover:bg-stone-850 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-stone-800/80 text-stone-400 border border-stone-700">
                      {modeInfo.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-stone-200 text-sm group-hover:text-amber-300 transition-colors">
                      {modeInfo.label}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      {modeInfo.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800/60 flex items-center text-xs text-amber-400/90 font-medium space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Begin Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Split: Action Items + Reflection Highlight + Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Action Items & Recent Conversations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Items from Reflection Intelligence */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-medium text-stone-100 text-base">
                    Active Action Items
                  </h3>
                  <p className="text-xs text-stone-400">
                    Distilled automatically by Reflection Intelligence from your journal sessions
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-stone-500">
                {allActionItems.filter((a) => completedActions.has(a.text)).length} / {allActionItems.length} Done
              </span>
            </div>

            {allActionItems.length === 0 ? (
              <div className="bg-stone-950/40 border border-stone-800/60 rounded-2xl p-5 text-center text-xs text-stone-400 space-y-1">
                <p>No active action items yet.</p>
                <p className="text-stone-500">
                  Have a conversation with Gemini and click "Reflection Intelligence" to extract clear next steps.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allActionItems.map((item, idx) => {
                  const isDone = completedActions.has(item.text);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleActionItem(item.text)}
                      className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isDone
                          ? 'bg-stone-950/40 border-stone-850 text-stone-500 line-through'
                          : 'bg-stone-850/70 border-stone-800 text-stone-200 hover:border-stone-700'
                      }`}
                    >
                      <button className="mt-0.5 flex-shrink-0 text-amber-400 hover:text-amber-300">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-stone-500" />
                        )}
                      </button>
                      <div className="flex-1 text-xs leading-relaxed">
                        <span>{item.text}</span>
                        <span className="block text-[10px] font-mono text-stone-500 mt-0.5">
                          From: {item.sourceTitle}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Journal Entries */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-medium text-stone-100 text-base">
                    Recent Conversations
                  </h3>
                  <p className="text-xs text-stone-400">
                    Pick up right where you left off
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-medium"
              >
                <span>View Timeline</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentConversations.length === 0 ? (
              <div className="bg-stone-950/40 border border-stone-800/60 rounded-2xl p-6 text-center text-xs text-stone-400 space-y-2">
                <p>No journal entries yet.</p>
                <button
                  onClick={() => {
                    onStartMode('free_journal');
                    onNavigate('chat');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs hover:bg-amber-500/30 transition-colors"
                >
                  Write First Entry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation(conv);
                      onNavigate('chat');
                    }}
                    className="p-4 rounded-2xl bg-stone-850 border border-stone-800 hover:border-stone-700 cursor-pointer transition-all hover:bg-stone-800 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-amber-300 border border-stone-700">
                          {MODES_CONFIG[conv.mode]?.label || 'Journal'}
                        </span>
                        <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-stone-200 text-sm line-clamp-1">
                        {conv.title}
                      </h4>
                      <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                        {conv.summary || conv.messages[0]?.content || 'Empty entry'}
                      </p>
                    </div>

                    <div className="pt-2 text-[11px] font-medium text-amber-400 flex items-center space-x-1">
                      <span>Resume Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Latest Reflection Intelligence Summary */}
        <div className="space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-950/60 border border-teal-800/60 flex items-center justify-center text-teal-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-medium text-stone-100 text-base">
                  Latest Reflection
                </h3>
                <p className="text-xs text-stone-400">
                  AI-synthesized personal takeaway
                </p>
              </div>
            </div>

            {latestInsight ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                    Emotional Tone
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-950/70 border border-teal-800 text-teal-300">
                    {latestInsight.emotionalTone}
                  </span>
                </div>

                <div className="bg-stone-950/50 border border-stone-800/70 rounded-2xl p-4 text-xs text-stone-300 leading-relaxed italic">
                  "{latestInsight.reflection.slice(0, 300)}..."
                </div>

                {latestInsight.themes.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">
                      Core Themes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {latestInsight.themes.map((theme, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-[11px] text-stone-300"
                        >
                          #{theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {latestInsight.questionsToRevisit.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-800">
                    <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">
                      Question to Revisit
                    </span>
                    <p className="text-xs text-amber-200/90 font-medium">
                      "{latestInsight.questionsToRevisit[0]}"
                    </p>
                  </div>
                )}

                <button
                  onClick={() => onNavigate('reflection')}
                  className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
                >
                  Open Full Reflection Hub
                </button>
              </div>
            ) : (
              <div className="bg-stone-950/40 border border-stone-800/60 rounded-2xl p-6 text-center text-xs text-stone-400 space-y-2">
                <p>No reflections generated yet.</p>
                <p className="text-stone-500">
                  After chatting with Gemini in any mode, generate structured reflections to extract themes and decisions.
                </p>
              </div>
            )}
          </div>

          {/* Privacy Trust Card */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-mono font-medium">Zero-Leakage Guarantee</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Your journal records are anchored strictly to your verified Firebase UID. No global collections, no client-side authorization spoofing.
            </p>
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
            >
              <span>Inspect Security Architecture</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
