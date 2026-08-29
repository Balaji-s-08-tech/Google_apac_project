import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, Auth } from 'firebase/auth';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): { app: FirebaseApp | null; auth: Auth | null; isConfigured: boolean } {
  if (auth && app) {
    return { app, auth, isConfigured: true };
  }

  try {
    // Check if Firebase app is already initialized
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
      auth = getAuth(app);
      return { app, auth, isConfigured: true };
    }

    // Default configuration for the provisioned Firebase Project: device-streaming-3e9c37a3
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "device-streaming-3e9c37a3.firebaseapp.com",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "device-streaming-3e9c37a3",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "device-streaming-3e9c37a3.firebasestorage.app",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    };

    if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      return { app, auth, isConfigured: true };
    }
  } catch (error) {
    console.warn('Firebase client setup notice: Managed auth mode active.');
  }

  return { app: null, auth: null, isConfigured: false };
}

export async function loginWithGoogle(): Promise<{ user: any; token: string } | null> {
  const { auth } = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth is not configured with external credentials. Please use the Google Sign-In or Demo Session.');
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const token = await result.user.getIdToken();
  return { user: result.user, token };
}

export async function logoutFirebase(): Promise<void> {
  const { auth } = getFirebaseAuth();
  if (auth) {
    await fbSignOut(auth);
  }
}
