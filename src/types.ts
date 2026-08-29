export type JournalMode = 'free_journal' | 'brainstorm' | 'reflection' | 'planning';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: JournalMode;
  summary: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ReflectionInsight {
  id: string;
  userId: string;
  conversationId: string;
  conversationTitle: string;
  mode: JournalMode;
  reflection: string;
  keyThoughts: string[];
  goals: string[];
  decisions: string[];
  actionItems: string[];
  themes: string[];
  emotionalTone: string;
  questionsToRevisit: string[];
  createdAt: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isDemo?: boolean;
}

export interface SystemStatus {
  status: string;
  service: string;
  version: string;
  runtime: string;
  timestamp: string;
  aiModel: string;
  secretManagement: {
    isReady: boolean;
    source: 'secret_manager' | 'environment_variable' | 'none';
    secretManagerConfigured: boolean;
    gcpProject: boolean;
  };
  security: {
    authMode: string;
    userIsolation: string;
    promptInjectionDefense: string;
  };
}

export type NavigationTab = 'dashboard' | 'chat' | 'history' | 'reflection' | 'settings';
