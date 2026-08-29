import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { NavigationTab, ReflectionInsight } from '../types.js';
import { fetchUserInsights } from '../lib/apiClient.js';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Lightbulb,
  Target,
  HelpCircle,
  Layers,
  ArrowRight,
  BookOpen,
  Loader2,
  Calendar,
  Check,
} from 'lucide-react';

interface ReflectionViewProps {
  onNavigate: (tab: NavigationTab) => void;
  selectedInsight?: ReflectionInsight | null;
}

export const ReflectionView: React.FC<ReflectionViewProps> = ({
  onNavigate,
  selectedInsight: initialSelected,
}) => {
  const { user, getAuthHeaders } = useAuth();
  const [insights, setInsights] = useState<ReflectionInsight[]>([]);
  const [activeInsightId, setActiveInsightId] = useState<string | null>(
    initialSelected?.id || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [completedActions, setCompletedActions] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`gemini_journal_actions_${user?.uid}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const loadInsights = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const headers = getAuthHeaders();
        const list = await fetchUserInsights(headers);
        setInsights(list);
        if (!activeInsightId && list.length > 0) {
          setActiveInsightId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load reflections:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInsights();
  }, [user]);

  const activeInsight =
    insights.find((i) => i.id === activeInsightId) || insights[0] || null;

  const toggleActionItem = (actionText: string) => {
    setCompletedActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionText)) {
        next.delete(actionText);
      } else {
        next.add(actionText);
      }
      if (user) {
        localStorage.setItem(`gemini_journal_actions_${user.uid}`, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const handleCopySummary = (insight: ReflectionInsight) => {
    const text = `Reflection Intelligence: ${insight.conversationTitle}\nDate: ${new Date(insight.createdAt).toLocaleDateString()}\n\nReflection:\n${insight.reflection}\n\nAction Items:\n${insight.actionItems.map(a => `- [ ] ${a}`).join('\n')}\n\nKey Thoughts:\n${insight.keyThoughts.map(k => `• ${k}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(insight.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-950/60 border border-teal-800/60 text-[11px] font-mono text-teal-300">
              <Sparkles className="w-3 h-3" />
              <span>Original Feature: Reflection Intelligence</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-100 font-normal">
              Structured Growth Insights
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-xl leading-relaxed">
              Gemini synthesizes your stream-of-consciousness journaling into structured personal insights, extracted decisions, high-leverage action items, and recurring themes.
            </p>
          </div>

          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-all self-start md:self-auto shadow-md"
          >
            <BookOpen className="w-4 h-4" />
            <span>Generate from New Chat</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
          <p className="text-xs text-stone-400">Synthesizing your reflection repository...</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-teal-400 mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-medium text-stone-200 text-sm">
              No Reflection Intelligence reports generated yet
            </h3>
            <p className="text-xs text-stone-400">
              Chat with Gemini in any mode (Free Journal, Brainstorm, Reflection, or Planning), then click "Reflection Intelligence" in the top right of the workspace.
            </p>
          </div>
          <button
            onClick={() => onNavigate('chat')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors"
          >
            Start Journaling Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Insight Sessions List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-stone-400 px-1">
              Reflection Sessions ({insights.length})
            </h3>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {insights.map((ins) => {
                const isSelected = activeInsight?.id === ins.id;
                return (
                  <div
                    key={ins.id}
                    onClick={() => setActiveInsightId(ins.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-850 border-teal-500/50 shadow-md ring-1 ring-teal-500/30'
                        : 'bg-stone-900 border-stone-800 hover:bg-stone-850 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mb-1">
                      <span className="text-teal-400 font-medium">
                        {ins.emotionalTone}
                      </span>
                      <span>
                        {new Date(ins.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-medium text-stone-200 text-xs line-clamp-1">
                      {ins.conversationTitle}
                    </h4>

                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {ins.reflection}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {ins.themes.slice(0, 2).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Structured Reflection Detail */}
          {activeInsight && (
            <div className="lg:col-span-8 space-y-6">
              {/* Insight Header Card */}
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
                  <div>
                    <div className="flex items-center space-x-2 text-[11px] font-mono text-stone-400 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(activeInsight.createdAt).toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <h2 className="font-serif text-xl text-stone-100 font-medium">
                      {activeInsight.conversationTitle}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopySummary(activeInsight)}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-700 transition-colors flex items-center space-x-1.5"
                    >
                      {copiedId === activeInsight.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <span>Export Markdown</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Emotional Tone & Themes */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-950/60 border border-teal-800 text-teal-300 text-xs font-medium">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Emotional Tone: {activeInsight.emotionalTone}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeInsight.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-300"
                      >
                        #{theme}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Synthesized Reflection Narrative */}
                <div className="bg-stone-950/60 border border-stone-800/80 rounded-2xl p-5 text-sm text-stone-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {activeInsight.reflection}
                </div>
              </div>

              {/* Action Items & Decisions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Action Items */}
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <h3 className="font-serif font-medium text-stone-100 text-base">
                      Action Items
                    </h3>
                  </div>

                  {activeInsight.actionItems.length === 0 ? (
                    <p className="text-xs text-stone-500">No action items detected.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeInsight.actionItems.map((action, idx) => {
                        const isDone = completedActions.has(action);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleActionItem(action)}
                            className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              isDone
                                ? 'bg-stone-950/40 border-stone-850 text-stone-500 line-through'
                                : 'bg-stone-850 border-stone-800 text-stone-200 hover:border-stone-700'
                            }`}
                          >
                            <button className="mt-0.5 flex-shrink-0 text-amber-400">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-stone-500" />
                              )}
                            </button>
                            <span className="text-xs leading-relaxed">{action}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Decisions Made */}
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-amber-400">
                    <Target className="w-4 h-4" />
                    <h3 className="font-serif font-medium text-stone-100 text-base">
                      Decisions & Resolutions
                    </h3>
                  </div>

                  {activeInsight.decisions.length === 0 ? (
                    <p className="text-xs text-stone-500">No explicit decisions logged.</p>
                  ) : (
                    <ul className="space-y-2 text-xs text-stone-300">
                      {activeInsight.decisions.map((decision, idx) => (
                        <li
                          key={idx}
                          className="bg-stone-850 border border-stone-800 p-3 rounded-xl leading-relaxed"
                        >
                          {decision}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Key Thoughts & Inquiry Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Thoughts */}
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2 text-amber-300">
                    <Lightbulb className="w-4 h-4" />
                    <h3 className="font-serif font-medium text-stone-100 text-base">
                      Key Thoughts & Beliefs
                    </h3>
                  </div>

                  <ul className="space-y-2 text-xs text-stone-300">
                    {activeInsight.keyThoughts.map((thought, idx) => (
                      <li
                        key={idx}
                        className="bg-stone-850/70 border border-stone-800 p-3 rounded-xl leading-relaxed"
                      >
                        • {thought}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Questions to Revisit */}
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <HelpCircle className="w-4 h-4" />
                    <h3 className="font-serif font-medium text-stone-100 text-base">
                      Questions for Next Time
                    </h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    {activeInsight.questionsToRevisit.map((q, idx) => (
                      <div
                        key={idx}
                        className="bg-indigo-950/30 border border-indigo-800/40 p-3 rounded-xl text-indigo-200 leading-relaxed italic"
                      >
                        "{q}"
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
