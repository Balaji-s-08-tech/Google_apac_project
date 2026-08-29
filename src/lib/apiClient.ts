import {
  ChatMessage,
  Conversation,
  JournalMode,
  ReflectionInsight,
  SystemStatus,
} from '../types.js';

export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await fetch('/api/system/status');
  if (!res.ok) {
    throw new ApiError('Failed to fetch system diagnostic status', 'SYSTEM_STATUS_ERROR', res.status);
  }
  return res.json();
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  mode: JournalMode,
  conversationId: string | null,
  headers: Record<string, string>
): Promise<{ reply: string; mode: JournalMode; timestamp: string }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      history,
      mode,
      conversationId,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to generate AI response.', data.code, res.status);
  }
  return data;
}

export async function generateReflectionInsight(
  messages: ChatMessage[],
  mode: JournalMode,
  conversationId: string,
  conversationTitle: string,
  headers: Record<string, string>
): Promise<{ insight: ReflectionInsight; message: string }> {
  const res = await fetch('/api/reflection', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      mode,
      conversationId,
      conversationTitle,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to synthesize reflection intelligence.', data.code, res.status);
  }
  return data;
}

export async function fetchUserConversations(
  headers: Record<string, string>
): Promise<Conversation[]> {
  const res = await fetch('/api/conversations', {
    method: 'GET',
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to load conversations.', data.code, res.status);
  }
  return data.conversations || [];
}

export async function saveUserConversation(
  conversation: Partial<Conversation> & { id: string; title: string; messages: ChatMessage[] },
  headers: Record<string, string>
): Promise<Conversation> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers,
    body: JSON.stringify(conversation),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to save conversation.', data.code, res.status);
  }
  return data.conversation;
}

export async function deleteUserConversation(
  conversationId: string,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || 'Failed to delete conversation.', data.code, res.status);
  }
}

export async function fetchUserInsights(
  headers: Record<string, string>
): Promise<ReflectionInsight[]> {
  const res = await fetch('/api/insights', {
    method: 'GET',
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to load insights.', data.code, res.status);
  }
  return data.insights || [];
}

export async function deleteAllUserData(
  headers: Record<string, string>
): Promise<{ deletedConversations: number; deletedInsights: number }> {
  const res = await fetch('/api/user/delete-data', {
    method: 'POST',
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to delete all user data.', data.code, res.status);
  }
  return data.details;
}
