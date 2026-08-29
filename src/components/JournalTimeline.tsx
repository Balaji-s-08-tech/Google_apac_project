import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Conversation, JournalMode, NavigationTab } from '../types.js';
import { MODES_CONFIG } from './ModeSelector.js';
import { fetchUserConversations, deleteUserConversation } from '../lib/apiClient.js';
import {
  Search,
  Filter,
  Trash2,
  ArrowRight,
  MessageSquare,
  Clock,
  Loader2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface JournalTimelineProps {
  onSelectConversation: (conversation: Conversation) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const JournalTimeline: React.FC<JournalTimelineProps> = ({
  onSelectConversation,
  onNavigate,
}) => {
  const { user, getAuthHeaders } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadConversations = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const headers = getAuthHeaders();
      const list = await fetchUserConversations(headers);
      setConversations(list);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load timeline entries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this journal entry? This cannot be undone.')) {
      return;
    }
    setDeletingId(conversationId);
    try {
      const headers = getAuthHeaders();
      await deleteUserConversation(conversationId, headers);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete conversation.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMode =
      selectedModeFilter === 'all' || conv.mode === selectedModeFilter;

    return matchesSearch && matchesMode;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-stone-100 font-normal">
            Journal Timeline
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Chronological history of your private thinking sessions and conversations with Gemini.
          </p>
        </div>

        <button
          onClick={() => {
            onNavigate('chat');
          }}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <MessageSquare className="w-4 h-4" />
          <span>New Journal Entry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search thoughts, keywords, or topics..."
              className="w-full bg-stone-950/60 border border-stone-800 text-stone-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          {/* Mode Selector Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedModeFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedModeFilter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700'
              }`}
            >
              All Modes ({conversations.length})
            </button>
            {(Object.keys(MODES_CONFIG) as JournalMode[]).map((mKey) => (
              <button
                key={mKey}
                onClick={() => setSelectedModeFilter(mKey)}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedModeFilter === mKey
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700'
                }`}
              >
                {MODES_CONFIG[mKey].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Entries List */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
          <p className="text-xs text-stone-400">Loading your private journal vault...</p>
        </div>
      ) : errorMessage ? (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-6 text-center text-rose-300 text-xs space-y-3">
          <AlertTriangle className="w-5 h-5 mx-auto text-rose-400" />
          <p>{errorMessage}</p>
          <button
            onClick={loadConversations}
            className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 rounded-lg text-rose-200 text-xs"
          >
            Retry
          </button>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-500 mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="font-medium text-stone-200 text-sm">No entries match your filter</h3>
            <p className="text-xs text-stone-400">
              {searchQuery ? 'Try clearing your search query' : 'Begin a new thinking session with Gemini.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('chat')}
            className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs hover:bg-amber-500/30 transition-colors"
          >
            Start New Journal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConversations.map((conv) => {
            const modeConfig = MODES_CONFIG[conv.mode] || MODES_CONFIG.free_journal;
            const Icon = modeConfig.icon;
            const isDeleting = deletingId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  onSelectConversation(conv);
                  onNavigate('chat');
                }}
                className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-5 cursor-pointer transition-all hover:bg-stone-850 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-stone-800 border border-stone-700 text-amber-300">
                      <Icon className="w-3 h-3" />
                      <span>{modeConfig.label}</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500">
                      • {conv.messages.length} messages
                    </span>
                  </div>

                  <h3 className="font-serif font-medium text-stone-100 text-base group-hover:text-amber-300 transition-colors">
                    {conv.title}
                  </h3>

                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {conv.summary || conv.messages[0]?.content || 'Empty entry'}
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={isDeleting}
                    title="Delete entry"
                    className="p-2 rounded-xl text-stone-500 hover:text-rose-400 hover:bg-stone-800 transition-colors"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-xs font-medium text-amber-300 group-hover:bg-amber-500 group-hover:text-stone-950 transition-all">
                    <span>Resume</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
