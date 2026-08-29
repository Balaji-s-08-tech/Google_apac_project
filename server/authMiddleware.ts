import { Request, Response, NextFunction } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isDemo?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

let firebaseAdminInitialized = false;

export function initializeFirebaseAdmin() {
  if (firebaseAdminInitialized) return;
  try {
    const apps = getApps();
    if (apps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
      if (projectId) {
        initializeApp({
          projectId,
        });
      } else {
        initializeApp();
      }
    }
    firebaseAdminInitialized = true;
    console.log('Firebase Admin initialized successfully');
  } catch (err: unknown) {
    console.warn('Firebase Admin initialization notice: running without default credentials.');
  }
}

/**
 * Authentication Middleware:
 * Extracts Bearer token, cryptographically verifies it via Firebase Admin SDK,
 * and sets req.user with verified claims.
 *
 * Strict Production Guarantees:
 * - When NODE_ENV === 'production', ALL dev/demo bypasses and unverified JWT fallbacks are disabled.
 * - Client-supplied body/query/header UIDs are strictly discarded.
 * - req.user.uid is derived ONLY from the cryptographically verified Firebase ID token.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevAuthEnabled = !isProduction && process.env.ALLOW_DEV_AUTH === 'true';

  const authHeader = req.headers.authorization;

  // 1. In development mode with explicit ALLOW_DEV_AUTH=true, allow local demo session headers
  if (isDevAuthEnabled && (!authHeader || !authHeader.startsWith('Bearer '))) {
    const demoToken = req.headers['x-journal-session-token'] as string;
    const demoUid = req.headers['x-journal-user-id'] as string;
    const demoEmail = req.headers['x-journal-user-email'] as string;

    if (demoToken && demoUid && demoToken.startsWith('journal_sess_')) {
      req.user = {
        uid: demoUid.trim(),
        email: demoEmail ? demoEmail.trim() : 'demo-user@geminijournal.local',
        displayName: (req.headers['x-journal-user-name'] as string) || 'Journaler',
        isDemo: true,
      };
      return next();
    }
  }

  // 2. Enforce Bearer header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid Authorization Bearer header.',
      code: 'AUTH_REQUIRED',
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  if (!idToken) {
    return res.status(401).json({
      error: 'Unauthorized: Bearer token is empty.',
      code: 'INVALID_TOKEN',
    });
  }

  // 3. In development mode with explicit ALLOW_DEV_AUTH=true, handle local dev tokens
  if (isDevAuthEnabled && (idToken.startsWith('journal_dev_token_') || idToken.startsWith('demo_token_'))) {
    const parts = idToken.split(':');
    const uid = parts[1] || 'dev_user_1';
    const email = parts[2] || 'user@geminijournal.app';
    req.user = {
      uid,
      email,
      displayName: 'Authenticated Journaler',
      isDemo: true,
    };
    return next();
  }

  // In production (or if dev auth is disabled), reject any dev/demo token immediately
  if (idToken.startsWith('journal_dev_token_') || idToken.startsWith('demo_token_') || idToken.startsWith('journal_sess_')) {
    return res.status(401).json({
      error: 'Unauthorized: Development tokens are strictly prohibited in production mode.',
      code: 'DEV_AUTH_FORBIDDEN',
    });
  }

  // 4. Cryptographic verification via Firebase Admin SDK
  try {
    const apps = getApps();
    if (apps.length === 0) {
      initializeFirebaseAdmin();
    }

    const currentApps = getApps();
    if (currentApps.length > 0) {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      
      // Strict UID extraction from verified claims
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name || '',
        photoURL: decodedToken.picture || '',
        isDemo: false,
      };
      return next();
    }

    // In development mode only with explicit ALLOW_DEV_AUTH=true, fallback to token payload decoding
    if (isDevAuthEnabled) {
      const payloadBase64 = idToken.split('.')[1];
      if (payloadBase64) {
        const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        const payload = JSON.parse(decodedJson);
        if (payload.user_id || payload.sub) {
          req.user = {
            uid: payload.user_id || payload.sub,
            email: payload.email || '',
            displayName: payload.name || '',
            photoURL: payload.picture || '',
            isDemo: false,
          };
          return next();
        }
      }
    }

    // If in production and Firebase Admin cannot verify token, reject unconditionally
    return res.status(401).json({
      error: 'Authentication failed: Firebase Admin authentication service unavailable or token unverified.',
      code: 'FIREBASE_VERIFICATION_UNAVAILABLE',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    return res.status(401).json({
      error: `Authentication failed: ${message}`,
      code: 'TOKEN_VERIFICATION_FAILED',
    });
  }
}
