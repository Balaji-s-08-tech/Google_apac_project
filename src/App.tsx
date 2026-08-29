import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navigation } from './components/Navigation.js';
import { DashboardView } from './components/DashboardView.js';
import { ChatWorkspace } from './components/ChatWorkspace.js';
import { JournalTimeline } from './components/JournalTimeline.js';
import { ReflectionView } from './components/ReflectionView.js';
import { SettingsView } from './components/SettingsView.js';
import { LandingView } from './components/LandingView.js';
import { Conversation, JournalMode, NavigationTab, ReflectionInsight } from './types.js';

const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<ReflectionInsight | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
          <span className="font-serif text-lg font-bold">G</span>
        </div>
        <p className="text-xs font-mono text-stone-400">Opening secure journal workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingView />;
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setActiveTab('chat');
  };

  const handleStartMode = (mode: JournalMode) => {
    setActiveConversation({
      id: `conv_${Date.now()}`,
      userId: user.uid,
      title: 'New Journal Entry',
      mode,
      summary: '',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setActiveTab('chat');
  };

  const handleReflectionGenerated = (insight: ReflectionInsight) => {
    setSelectedInsight(insight);
    setActiveTab('reflection');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950 font-sans">
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'chat') {
            setActiveConversation(null);
          }
        }}
      />

      <main className="flex-1 pb-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={setActiveTab}
            onSelectConversation={handleSelectConversation}
            onStartMode={handleStartMode}
          />
        )}

        {activeTab === 'chat' && (
          <ChatWorkspace
            initialConversation={activeConversation}
            onReflectionGenerated={handleReflectionGenerated}
            onNewSession={() => setActiveConversation(null)}
          />
        )}

        {activeTab === 'history' && (
          <JournalTimeline
            onSelectConversation={handleSelectConversation}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'reflection' && (
          <ReflectionView
            onNavigate={setActiveTab}
            selectedInsight={selectedInsight}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView onNavigate={setActiveTab} />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
