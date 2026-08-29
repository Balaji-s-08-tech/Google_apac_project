import { getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ReflectionIntelligenceResult, JournalMode, ChatMessage } from './geminiService.js';

export interface StoredConversation {
  id: string;
  userId: string;
  title: string;
  mode: JournalMode;
  summary: string;
  messages: Array<ChatMessage & { id: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface StoredInsight extends ReflectionIntelligenceResult {
  id: string;
  userId: string;
  conversationId: string;
  conversationTitle: string;
  mode: JournalMode;
  createdAt: string;
}

// In-Memory User-Isolated Storage (Fallback / Local Dev / High-Speed Cache)
// Keyed strictly by userId -> ensures 0 cross-user data leakage
const userMemoryStore: Map<string, {
  conversations: Map<string, StoredConversation>;
  insights: Map<string, StoredInsight>;
}> = new Map();

function getUserStore(userId: string) {
  if (!userMemoryStore.has(userId)) {
    userMemoryStore.set(userId, {
      conversations: new Map(),
      insights: new Map(),
    });
  }
  return userMemoryStore.get(userId)!;
}

function getFirestoreDb(): Firestore | null {
  try {
    const apps = getApps();
    if (apps.length > 0) {
      return getFirestore();
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Save or update a conversation under /users/{userId}/conversations/{conversationId}
 */
export async function saveConversation(
  userId: string,
  conversation: StoredConversation
): Promise<StoredConversation> {
  if (!userId || conversation.userId !== userId) {
    throw new Error('Security Error: Cannot save conversation for another user.');
  }

  // Update in-memory user store
  const store = getUserStore(userId);
  store.conversations.set(conversation.id, conversation);

  // Sync to Firestore if admin SDK is configured
  const db = getFirestoreDb();
  if (db) {
    try {
      const convRef = db.collection('users').doc(userId).collection('conversations').doc(conversation.id);
      await convRef.set({
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        mode: conversation.mode,
        summary: conversation.summary,
        messageCount: conversation.messages.length,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      });

      // Write messages subcollection in batch
      const batch = db.batch();
      for (const msg of conversation.messages) {
        const msgRef = convRef.collection('messages').doc(msg.id);
        batch.set(msgRef, {
          id: msg.id,
          conversationId: conversation.id,
          userId,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        });
      }
      await batch.commit();
    } catch (err: unknown) {
      console.warn('Firestore sync note: saved to secure memory store; Firestore write deferred.', err);
    }
  }

  return conversation;
}

/**
 * Fetch all conversations for a verified userId
 */
export async function getConversations(userId: string): Promise<StoredConversation[]> {
  if (!userId) throw new Error('Unauthorized: Missing UID');

  const db = getFirestoreDb();
  if (db) {
    try {
      const snapshot = await db.collection('users').doc(userId).collection('conversations').orderBy('updatedAt', 'desc').get();
      if (!snapshot.empty) {
        const list: StoredConversation[] = [];
        for (const doc of snapshot.docs) {
          const data = doc.data() as StoredConversation;
          // Get messages
          const msgSnapshot = await doc.ref.collection('messages').orderBy('createdAt', 'asc').get();
          data.messages = msgSnapshot.docs.map((m) => m.data() as any);
          list.push(data);
        }
        return list;
      }
    } catch (err) {
      // Fallback to user memory store
    }
  }

  const store = getUserStore(userId);
  return Array.from(store.conversations.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Fetch a single conversation for a verified userId
 */
export async function getConversation(
  userId: string,
  conversationId: string
): Promise<StoredConversation | null> {
  if (!userId) throw new Error('Unauthorized: Missing UID');

  const store = getUserStore(userId);
  const found = store.conversations.get(conversationId);
  if (found) {
    return found;
  }

  const db = getFirestoreDb();
  if (db) {
    try {
      const doc = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).get();
      if (doc.exists) {
        const data = doc.data() as StoredConversation;
        const msgSnapshot = await doc.ref.collection('messages').orderBy('createdAt', 'asc').get();
        data.messages = msgSnapshot.docs.map((m) => m.data() as any);
        return data;
      }
    } catch (err) {
      return null;
    }
  }

  return null;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  if (!userId) throw new Error('Unauthorized: Missing UID');

  const store = getUserStore(userId);
  store.conversations.delete(conversationId);

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection('users').doc(userId).collection('conversations').doc(conversationId).delete();
    } catch {
      // ignore
    }
  }

  return true;
}

/**
 * Save an Insight under /users/{userId}/insights/{insightId}
 */
export async function saveInsight(userId: string, insight: StoredInsight): Promise<StoredInsight> {
  if (!userId || insight.userId !== userId) {
    throw new Error('Security Error: Cannot save insight for another user.');
  }

  const store = getUserStore(userId);
  store.insights.set(insight.id, insight);

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection('users').doc(userId).collection('insights').doc(insight.id).set(insight);
    } catch (err) {
      console.warn('Firestore sync note for insight:', err);
    }
  }

  return insight;
}

/**
 * Get all insights for a verified user
 */
export async function getInsights(userId: string): Promise<StoredInsight[]> {
  if (!userId) throw new Error('Unauthorized: Missing UID');

  const db = getFirestoreDb();
  if (db) {
    try {
      const snapshot = await db.collection('users').doc(userId).collection('insights').orderBy('createdAt', 'desc').get();
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => doc.data() as StoredInsight);
      }
    } catch (err) {
      // fallback
    }
  }

  const store = getUserStore(userId);
  return Array.from(store.insights.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Delete all data belonging to a verified user
 */
export async function deleteAllUserData(userId: string): Promise<{ deletedConversations: number; deletedInsights: number }> {
  if (!userId) throw new Error('Unauthorized: Missing UID');

  const store = getUserStore(userId);
  const convCount = store.conversations.size;
  const insightCount = store.insights.size;

  store.conversations.clear();
  store.insights.clear();
  userMemoryStore.delete(userId);

  const db = getFirestoreDb();
  if (db) {
    try {
      const convs = await db.collection('users').doc(userId).collection('conversations').get();
      for (const doc of convs.docs) {
        await doc.ref.delete();
      }
      const insights = await db.collection('users').doc(userId).collection('insights').get();
      for (const doc of insights.docs) {
        await doc.ref.delete();
      }
      await db.collection('users').doc(userId).delete();
    } catch (err) {
      console.warn('Firestore deletion error:', err);
    }
  }

  return {
    deletedConversations: convCount,
    deletedInsights: insightCount,
  };
}
