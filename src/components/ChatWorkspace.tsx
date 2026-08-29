import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext.js';
import { ChatMessage, Conversation, JournalMode, ReflectionInsight } from '../types.js';
import { ModeSelector, MODES_CONFIG } from './ModeSelector.js';
import {
  sendChatMessage,
  generateReflectionInsight,
  saveUserConversation,
} from '../lib/apiClient.js';
import {
  Send,
  Sparkles,
  Save,
  PlusCircle,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Bot,
  User as UserIcon,
  RefreshCw,
  Clock,
  Shield,
} from 'lucide-react';

interface ChatWorkspaceProps {
  initialConversation?: Conversation | null;
  onSaved?: (conversation: Conversation) => void;
  onReflectionGenerated?: (insight: ReflectionInsight) => void;
  onNewSession?: () => void;
}

const STARTER_PROMPTS: Record<JournalMode, string[]> = {
  free_journal: [
    "What is occupying most of my mental energy right now?",
    "A moment from today that felt heavy or unclear...",
    "Free-form check-in: how am I truly feeling in my body and mind?",
  ],
  brainstorm: [
    "I want to explore 3 distinct angles to approach my next project...",
    "How can I turn my current bottleneck into a competitive advantage?",
    "Brainstorming creative possibilities for my personal growth this month...",
  ],
  reflection: [
    "Looking back on a recent difficult decision and what it taught me...",
    "What patterns am I noticing in how I react to uncertainty?",
    "What core values mattered most to me in my work this week?",
  ],
  planning: [
    "I need to break down my goal into 3 clear weekly milestones...",
    "What is the single highest-leverage action I can take in the next 48 hours?",
    "Anticipating friction points in my routine and designing safeguards...",
  ],
};

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  initialConversation,
  onSaved,
  onReflectionGenerated,
  onNewSession,
}) => {
  const { user, getAuthHeaders } = useAuth();

  const [conversationId, setConversationId] = useState<string>(
    initialConversation?.id || `conv_${Date.now()}`
  );
  const [title, setTitle] = useState<string>(
    initialConversation?.title || 'New Journal Entry'
  );
  const [mode, setMode] = useState<JournalMode>(
    initialConversation?.mode || 'free_journal'
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialConversation?.messages || []
  );

  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (initialConversation) {
      setConversationId(initialConversation.id);
      setTitle(initialConversation.title);
      setMode(initialConversation.mode);
      setMessages(initialConversation.messages);
    }
  }, [initialConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isSending) return;

    // Reset error state
    setErrorMessage(null);
    setLastFailedInput(null);

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsSending(true);

    try {
      const headers = getAuthHeaders();
      const response = await sendChatMessage(
        text,
        messages, // Send previous turns as context
        mode,
        conversationId,
        headers
      );

      const aiMessage: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        createdAt: response.timestamp || new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Auto-generate title if it is still default
      if (title === 'New Journal Entry' && finalMessages.length >= 2) {
        const generatedTitle = text.slice(0, 45) + (text.length > 45 ? '...' : '');
        setTitle(generatedTitle);
      }

      // Auto-save silently in background
      if (user) {
        saveUserConversation(
          {
            id: conversationId,
            userId: user.uid,
            title: title === 'New Journal Entry' ? text.slice(0, 45) : title,
            mode,
            summary: text.slice(0, 150),
            messages: finalMessages,
          },
          headers
        ).catch(() => {});
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(
        err?.message || 'Could not reach Gemini. Your typed thought has been preserved.'
      );
      setLastFailedInput(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedInput) {
      handleSendMessage(lastFailedInput);
    }
  };

  const handleManualSave = async () => {
    if (!user || messages.length === 0 || isSaving) return;
    setIsSaving(true);
    setSaveNotice(null);
    try {
      const headers = getAuthHeaders();
      const saved = await saveUserConversation(
        {
          id: conversationId,
          userId: user.uid,
          title,
          mode,
          summary: messages[0]?.content.slice(0, 150) || '',
          messages,
        },
        headers
      );
      setSaveNotice('Conversation saved securely to your private vault.');
      if (onSaved) onSaved(saved);
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save conversation.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateReflection = async () => {
    if (messages.length === 0 || isSynthesizing) return;
    setIsSynthesizing(true);
    setErrorMessage(null);
    try {
      const headers = getAuthHeaders();
      const result = await generateReflectionInsight(
        messages,
        mode,
        conversationId,
        title,
        headers
      );
      setSaveNotice('Reflection Intelligence synthesized and stored in your vault!');
      if (onReflectionGenerated) {
        onReflectionGenerated(result.insight);
      }
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not synthesize reflection. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleStartNew = () => {
    setConversationId(`conv_${Date.now()}`);
    setTitle('New Journal Entry');
    setMessages([]);
    setInputText('');
    setErrorMessage(null);
    setSaveNotice(null);
    if (onNewSession) onNewSession();
  };

  const currentModeConfig = MODES_CONFIG[mode];

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-5xl mx-auto px-2 sm:px-4 py-2 space-y-3">
      {/* Top Controls Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
          <div className="flex items-center space-x-3">
            <input
              id="conversation-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent font-serif font-medium text-lg text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1.5 py-0.5 border border-transparent hover:border-stone-700 w-full sm:w-auto"
              placeholder="Entry Title..."
            />
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" />
              UID Isolated
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="chat-save-btn"
              onClick={handleManualSave}
              disabled={isSaving || messages.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </button>

            <button
              id="chat-synthesize-reflection-btn"
              onClick={handleGenerateReflection}
              disabled={isSynthesizing || messages.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {isSynthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Reflection Intelligence</span>
            </button>

            <button
              id="chat-new-entry-btn"
              onClick={handleStartNew}
              title="Start a fresh conversation"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="pt-3">
          <ModeSelector
            selectedMode={mode}
            onSelectMode={(newMode) => setMode(newMode)}
            disabled={isSending}
          />
        </div>
      </div>

      {/* Notifications / Alerts */}
      {saveNotice && (
        <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs px-4 py-2 rounded-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between bg-rose-950/60 border border-rose-800 text-rose-300 text-xs px-4 py-2.5 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {lastFailedInput && (
            <button
              onClick={handleRetry}
              className="flex items-center space-x-1 px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded-md transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Message History Stream */}
      <div className="flex-1 overflow-y-auto bg-stone-900/40 border border-stone-800/80 rounded-2xl p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-amber-400">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="font-serif font-medium text-stone-100 text-lg">
                {currentModeConfig.label} Workspace
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                {currentModeConfig.description} Everything you write is strictly isolated to your authenticated account.
              </p>
            </div>

            {/* Prompt Starters */}
            <div className="w-full max-w-lg space-y-2 pt-2 text-left">
              <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider block">
                Suggested Prompts
              </span>
              <div className="grid gap-2">
                {STARTER_PROMPTS[mode].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left text-xs text-stone-300 hover:text-amber-200 bg-stone-850 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/40 p-3 rounded-xl transition-all"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-amber-600/20 text-stone-100 border border-amber-500/30 rounded-tr-sm shadow-sm'
                      : 'bg-stone-850 text-stone-200 border border-stone-800 rounded-tl-sm prose prose-invert prose-sm max-w-none'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                  <div className="flex items-center justify-end space-x-1.5 mt-2 text-[10px] font-mono text-stone-500">
                    <Clock className="w-2.5 h-2.5" />
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 flex-shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isSending && (
          <div className="flex items-start space-x-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-stone-850 border border-stone-800 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-stone-400 flex items-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Gemini is reflecting thoughtfully...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative"
        >
          <textarea
            id="chat-input-textarea"
            ref={textareaRef}
            rows={3}
            value={inputText}
            maxLength={10000}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Share your thoughts with Gemini (${currentModeConfig.label})...`}
            className="w-full bg-stone-950/60 text-stone-100 text-sm placeholder-stone-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-amber-500/60 border border-stone-800 resize-none pr-24"
          />

          <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-800/60 text-[11px] text-stone-500 px-1">
            <div className="flex items-center space-x-2">
              <span>Shift + Enter for new line</span>
              <span>•</span>
              <span className="font-mono">{inputText.length} / 10,000 chars</span>
            </div>

            <button
              id="chat-send-message-btn"
              type="submit"
              disabled={isSending || inputText.trim().length === 0}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
