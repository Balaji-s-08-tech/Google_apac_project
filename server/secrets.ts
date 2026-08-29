import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

interface SecretCache {
  geminiApiKey: string | null;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let secretCache: SecretCache = {
  geminiApiKey: null,
  cachedAt: 0,
};

let secretManagerClient: SecretManagerServiceClient | null = null;

function getSecretClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    secretManagerClient = new SecretManagerServiceClient();
  }
  return secretManagerClient;
}

/**
 * Safely resolves the Gemini API key.
 *
 * Strict Production Architecture:
 * - When NODE_ENV === 'production', credentials MUST come exclusively from Google Cloud Secret Manager.
 * - In production, missing or failed Secret Manager retrieval FAILS CLOSED with a descriptive error.
 * - Does NOT fall back to process.env.GEMINI_API_KEY in production.
 * - In local development (NODE_ENV !== 'production'), local process.env.GEMINI_API_KEY is permitted.
 * - In-memory 1-hour TTL caching is preserved.
 * - Zero secrets are logged or exposed to the client.
 */
export async function getGeminiApiKey(): Promise<string> {
  const isProduction = process.env.NODE_ENV === 'production';
  const now = Date.now();

  // Return cached key if valid within 1-hour TTL
  if (secretCache.geminiApiKey && now - secretCache.cachedAt < CACHE_TTL_MS) {
    return secretCache.geminiApiKey;
  }

  // 1. Google Cloud Secret Manager Resolution
  const secretResourceName = process.env.SECRET_NAME_GEMINI_KEY;

  if (secretResourceName) {
    try {
      const client = getSecretClient();
      const [version] = await client.accessSecretVersion({ name: secretResourceName });
      const payload = version.payload?.data?.toString();
      if (payload && payload.trim().length > 0) {
        secretCache = { geminiApiKey: payload.trim(), cachedAt: now };
        return secretCache.geminiApiKey;
      }
    } catch (err: unknown) {
      if (isProduction) {
        // Fail closed in production: Never attempt unapproved fallbacks
        throw new Error(
          'Production Security Error: Failed to retrieve Gemini API credential from Google Cloud Secret Manager. Application failing closed.'
        );
      }
      console.warn('Development Notice: Secret Manager lookup failed, evaluating local dev fallback.');
    }
  } else if (isProduction) {
    // Fail closed in production if SECRET_NAME_GEMINI_KEY is missing
    throw new Error(
      'Production Security Error: SECRET_NAME_GEMINI_KEY is not defined. In production, Gemini credentials must be managed via Google Cloud Secret Manager.'
    );
  }

  // 2. Development Only Fallback: process.env.GEMINI_API_KEY
  if (!isProduction) {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey && envKey.trim().length > 0 && envKey !== 'MY_GEMINI_API_KEY') {
      secretCache = { geminiApiKey: envKey.trim(), cachedAt: now };
      return secretCache.geminiApiKey;
    }
  }

  throw new Error(
    'Gemini API key is not configured. Please set SECRET_NAME_GEMINI_KEY for Secret Manager in production or GEMINI_API_KEY for local development.'
  );
}

/**
 * Returns diagnostic metadata without revealing the secret value.
 */
export function getSecretDiagnosticStatus(): {
  configured: boolean;
  provider: 'secret_manager' | 'environment_variable' | 'none';
  secretResourceConfigured: boolean;
  gcpProjectConfigured: boolean;
} {
  const hasEnv = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  const hasSecretManagerName = Boolean(process.env.SECRET_NAME_GEMINI_KEY);
  const hasGcpProject = Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT);

  let provider: 'secret_manager' | 'environment_variable' | 'none' = 'none';
  if (hasSecretManagerName) {
    provider = 'secret_manager';
  } else if (hasEnv) {
    provider = 'environment_variable';
  }

  return {
    configured: hasEnv || hasSecretManagerName,
    provider,
    secretResourceConfigured: hasSecretManagerName,
    gcpProjectConfigured: hasGcpProject,
  };
}
