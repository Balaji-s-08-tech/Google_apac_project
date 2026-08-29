import { Router, Request, Response } from 'express';
import { authenticate } from '../authMiddleware.js';
import { chatRateLimitMiddleware } from '../rateLimiter.js';
import {
  generateJournalChat,
  generateReflectionIntelligence,
  JournalMode,
  ChatMessage,
  GeminiServiceError,
} from '../geminiService.js';
import {
  saveConversation,
  getConversations,
  getConversation,
  deleteConversation,
  saveInsight,
  getInsights,
  deleteAllUserData,
  StoredConversation,
  StoredInsight,
} from '../firestoreService.js';
import { getSecretDiagnosticStatus } from '../secrets.js';

export const apiRouter = Router();

// System Status Endpoint (Health & Cloud Run Diagnostic)
apiRouter.get('/system/status', async (req: Request, res: Response) => {
  const secretStatus = getSecretDiagnosticStatus();
  res.json({
    status: 'healthy',
    service: 'Personal Gemini Journal API',
    version: '1.0.0',
    runtime: 'Google Cloud Run Container',
    timestamp: new Date().toISOString(),
    aiModel: 'gemini-3.7-flash',
    secretManagement: {
      isReady: secretStatus.configured,
      source: secretStatus.provider,
      secretManagerConfigured: secretStatus.secretResourceConfigured,
      gcpProject: secretStatus.gcpProjectConfigured,
    },
    security: {
      authMode: 'Firebase ID Token (Bearer)',
      userIsolation: 'Firestore ABAC (/users/{uid}/...)',
      promptInjectionDefense: 'System Boundary Isolation & Input Length Enforcing',
    },
  });
});

// Protected: Chat with Gemini (Rate Limited to 20 req/min per verified UID)
apiRouter.post('/chat', authenticate, chatRateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { history = [], message, mode = 'free_journal', conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (message.length > 10000) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 10,000 characters.' });
    }

    const validModes: JournalMode[] = ['free_journal', 'brainstorm', 'reflection', 'planning'];
    const validatedMode: JournalMode = validModes.includes(mode) ? mode : 'free_journal';

    // Format chat history securely
    const sanitizedHistory: ChatMessage[] = Array.isArray(history)
      ? history.slice(-20).map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content || '').slice(0, 10000),
        }))
      : [];

    const reply = await generateJournalChat(sanitizedHistory, message, validatedMode);

    res.json({
      reply,
      mode: validatedMode,
      conversationId: conversationId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
        isTransient: error.isTransient,
      });
    }

    const rawMessage = String(error?.message || '');
    const isOverloaded = rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('high demand');
    const isRateLimited = error?.status === 429 || rawMessage.includes('429');

    const status = isOverloaded ? 503 : (isRateLimited ? 429 : 500);
    const userMessage = isOverloaded
      ? 'Gemini is temporarily busy due to high demand. Please try again in a moment.'
      : 'Failed to generate response from Gemini. Please try again.';

    res.status(status).json({
      error: userMessage,
      code: isOverloaded ? 'MODEL_TEMPORARILY_UNAVAILABLE' : (isRateLimited ? 'RATE_LIMIT_EXCEEDED' : 'AI_GENERATION_FAILED'),
    });
  }
});

// Protected: Generate Reflection Intelligence
apiRouter.post('/reflection', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { messages = [], mode = 'reflection', conversationId, conversationTitle } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'At least one message is required to generate reflection intelligence.' });
    }

    const sanitizedMessages: ChatMessage[] = messages.slice(-30).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '').slice(0, 10000),
    }));

    const result = await generateReflectionIntelligence(sanitizedMessages, mode);

    // Save insight automatically under verified user
    const insightId = `ins_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const storedInsight: StoredInsight = {
      ...result,
      id: insightId,
      userId: user.uid,
      conversationId: conversationId || `conv_${Date.now()}`,
      conversationTitle: conversationTitle || 'Journal Reflection',
      mode,
      createdAt: new Date().toISOString(),
    };

    await saveInsight(user.uid, storedInsight);

    res.json({
      insight: storedInsight,
      message: 'Reflection intelligence synthesized and stored securely.',
    });
  } catch (error: any) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
        isTransient: error.isTransient,
      });
    }

    const rawMessage = String(error?.message || '');
    const isOverloaded = rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('high demand');
    const userMessage = isOverloaded
      ? 'Gemini is temporarily busy due to high demand. Please try again in a moment.'
      : 'Could not synthesize reflection. Your conversation is still safe.';

    res.status(isOverloaded ? 503 : 500).json({
      error: userMessage,
      code: isOverloaded ? 'MODEL_TEMPORARILY_UNAVAILABLE' : 'REFLECTION_GENERATION_FAILED',
    });
  }
});

// Protected: List Conversations
apiRouter.get('/conversations', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const conversations = await getConversations(user.uid);
    res.json({ conversations });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve conversations.' });
  }
});

// Protected: Save / Update Conversation
apiRouter.post('/conversations', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id, title, mode, summary, messages } = req.body;

    if (!id || !title || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'id, title, and messages array are required.' });
    }

    const convToSave: StoredConversation = {
      id: String(id).slice(0, 128),
      userId: user.uid, // Strict UID assignment from verified token
      title: String(title).slice(0, 200),
      mode: mode || 'free_journal',
      summary: String(summary || '').slice(0, 1000),
      messages: messages.map((m: any, idx: number) => ({
        id: m.id || `msg_${idx}_${Date.now()}`,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content || '').slice(0, 10000),
        createdAt: m.createdAt || new Date().toISOString(),
      })),
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveConversation(user.uid, convToSave);
    res.json({ conversation: saved });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save conversation.' });
  }
});

// Protected: Get Single Conversation
apiRouter.get('/conversations/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const convId = req.params.id;
    const conversation = await getConversation(user.uid, convId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied.' });
    }

    res.json({ conversation });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch conversation.' });
  }
});

// Protected: Delete Conversation
apiRouter.delete('/conversations/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const convId = req.params.id;
    await deleteConversation(user.uid, convId);
    res.json({ success: true, message: 'Conversation deleted securely.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

// Protected: List Insights
apiRouter.get('/insights', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const insights = await getInsights(user.uid);
    res.json({ insights });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve insights.' });
  }
});

// Protected: Delete All User Data (Privacy Right to be Forgotten)
apiRouter.post('/user/delete-data', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const result = await deleteAllUserData(user.uid);
    res.json({
      success: true,
      message: 'All your journal conversations, messages, and reflection intelligence data have been completely deleted.',
      details: result,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to purge data. Please try again.' });
  }
});
