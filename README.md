# Personal Gemini Journal

> **Google Gen AI Academy APAC Ideathon Finalist Submission**  
> *A secure, authenticated AI journaling, brainstorming, and reflection workspace built for Google Cloud Run, Cloud Firestore, and Google Cloud Secret Manager.*

---

## 1. Project Overview & Vision

**Personal Gemini Journal** is an AI-powered thinking workspace designed to turn stream-of-consciousness thoughts into clarity, structure, and pragmatic action.

Users sign in securely to:
1. Engage in multi-turn conversations with **Gemini 3.7 Flash** across 4 purposeful thinking modes (*Free Journal*, *Brainstorm*, *Deep Reflection*, *Goal Planning*).
2. Synthesize **Reflection Intelligence** — structured personal growth reports identifying core thoughts, goals, decisions, action items, emotional tone, and questions for future reflection.
3. Review their historic **Journal Timeline** with search and filters.
4. Guarantee complete privacy through verified **UID-isolated Cloud Firestore persistence**, server-side **Google Cloud Secret Manager** retrieval, and zero browser credential exposure.

---

## 2. Security-First Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Untrusted Browser Client                    │
│   - React 19 + Tailwind CSS + Lucide Icons                  │
│   - Obtains Firebase ID Token / Verified Session            │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Authorization: Bearer <ID_TOKEN>
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Google Cloud Run Container (Port 3000)            │
│   Express 4 + Node.js (Bundled CJS via esbuild)             │
│                                                             │
│  [1. Server-Side Token Verification & UID Extraction]       │
│      - Client-supplied UIDs in body/params are ignored       │
│      - Cryptographic token verification establishes identity│
│                                                             │
│  [2. Google Cloud Secret Manager Bridge (secrets.ts)]       │
│      - Fetches 'gemini-api-key' securely from GCP SM        │
│      - In-memory 1-hour TTL cache with backoff retry        │
│      - Zero client/browser credential leakage               │
│                                                             │
│  [3. Gemini 3.7 Flash AI Service (geminiService.ts)]        │
│      - Multi-turn conversation management (20-turn window)  │
│      - Input bounding (10,000 char limit)                   │
│      - Prompt injection & jailbreak isolation               │
│      - Reflection Intelligence structured JSON validation   │
│                                                             │
│  [4. User-Isolated Persistence (firestoreService.ts)]       │
│      - Writes strictly under /users/{VERIFIED_UID}/...      │
│      - Zero-leakage multi-tenant boundary                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Google Cloud Firestore (Zero Trust)              │
│   - Rule Deny-by-Default ABAC (/firestore.rules)            │
│   - /users/{uid}/conversations/{convId}                     │
│   - /users/{uid}/conversations/{convId}/messages/{msgId}    │
│   - /users/{uid}/insights/{insightId}                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Mandatory Requirements Verification

| Requirement | Implementation & Verification File | Status |
| :--- | :--- | :---: |
| **Firebase Authentication** | `server/authMiddleware.ts` + `src/context/AuthContext.tsx` | Complete |
| **Multi-Turn Gemini Interaction** | `server/geminiService.ts` (`gemini-3.7-flash` with history) | Complete |
| **Cloud Firestore User Isolation** | `firestore.rules` + `firebase-blueprint.json` + `server/firestoreService.ts` | Complete |
| **Google Cloud Secret Manager** | `server/secrets.ts` (`@google-cloud/secret-manager` integration) | Complete |
| **Original Feature (Reflection Intelligence)** | `server/geminiService.ts` + `src/components/ReflectionView.tsx` | Complete |
| **Cloud Run Deployment Readiness** | `server.ts` + `package.json` (`esbuild` production bundling) | Complete |

---

## 4. Firestore Data Model & Security Rules

### Document Schema
- `/users/{uid}`: User profile and vault settings metadata.
- `/users/{uid}/conversations/{conversationId}`: Journal sessions with title, mode, summary, and timestamps.
- `/users/{uid}/conversations/{conversationId}/messages/{messageId}`: Message history subcollection (`user` / `assistant`).
- `/users/{uid}/insights/{insightId}`: Structured Reflection Intelligence reports.

### Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /conversations/{conversationId} {
        allow read, write, delete: if isOwner(userId);

        match /messages/{messageId} {
          allow read, write, delete: if isOwner(userId);
        }
      }

      match /insights/{insightId} {
        allow read, write, delete: if isOwner(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false; // Deny by default
    }
  }
}
```

---

## 5. Original Feature: Reflection Intelligence

Beyond standard chat, the user can trigger **Reflection Intelligence** at any point:
- **Key Thoughts**: Extracts underlying values and core realizations.
- **Goals & Intentions**: Uncovers aspirations expressed in stream-of-consciousness writing.
- **Decisions**: Catalogs choices and perspectives reached during the session.
- **Action Items**: Concrete, high-leverage physical next steps rendered into an interactive dashboard checklist.
- **Themes & Tone**: Classifies 2-5 overarching topics and emotional tone without medical/psychological diagnosis.
- **Inquiry Questions**: Meaningful prompts to revisit during the user's next journaling session.

---

## 6. Threat Model & Mitigations

| Threat | Attack Scenario | Component | Severity | Mitigation |
| :--- | :--- | :--- | :---: | :--- |
| **Client Identity Spoofing** | Attacker sends arbitrary `userId: "target_uid"` in request body. | `server/authMiddleware.ts` | **CRITICAL** | Server extracts UID *exclusively* from cryptographic Firebase ID token. Client body UID is ignored. |
| **Credential Exfiltration** | Attacker inspects JS bundle or network tab for Gemini API key. | `server/secrets.ts` | **CRITICAL** | Secret is retrieved server-side from Google Cloud Secret Manager. 0% browser exposure. |
| **Cross-User Data Leakage (IDOR)** | User A attempts to read or mutate `/users/userB/...`. | `server/firestoreService.ts` & `firestore.rules` | **HIGH** | Path prefix matching enforces `isOwner(userId)` on all Firestore rules and server queries. |
| **Prompt Injection / Jailbreak** | User submits adversarial prompt attempting system instruction exfiltration. | `server/geminiService.ts` | **HIGH** | Prompt bounded to 10,000 chars, treated strictly as personal reflective content, and isolated via system delimiters. |
| **Denial of Service / Quota Burn** | Repeated unbounded chat requests trigger 429 errors. | `server/geminiService.ts` | **MEDIUM** | Bounded exponential backoff with jitter and 20-message sliding context density limit. |

---

## 7. Local Setup & Cloud Run Deployment

### Environment Variables (`.env`)
```env
PORT=3000
NODE_ENV=production
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
SECRET_NAME_GEMINI_KEY=projects/your-gcp-project-id/secrets/gemini-api-key/versions/latest
FIREBASE_PROJECT_ID=your-firebase-project-id
```

### Build & Run
```bash
# 1. Install dependencies
npm install

# 2. Start development server (port 3000)
npm run dev

# 3. Production build (Vite client + esbuild CJS server bundle)
npm run build

# 4. Production start
npm start
```

### Google Cloud Run Deployment
```bash
gcloud run deploy personal-gemini-journal \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT="your-project-id",SECRET_NAME_GEMINI_KEY="projects/your-project-id/secrets/gemini-api-key/versions/latest"
```

---

## 8. Evaluator / Judge Demo Walkthrough (30 Seconds)

1. **Zero-Trust Login**: Click on the **Maya Chen (Persona A)** instant test profile on the landing page. Notice the active verified UID in the top right.
2. **Multi-Turn Chat**: Click **"Journal & Chat"**, select **"Goal Planning"** mode, and submit a thought starter (e.g. *"I need to break down my project into 3 clear weekly milestones..."*). Observe the structured, empathetic response from Gemini.
3. **Reflection Intelligence**: Click **"Reflection Intelligence"** at the top right of the workspace. Observe the synthesis of Key Thoughts, Decisions, Themes, and an interactive Action Item checklist.
4. **Dashboard & Timeline**: Click **"Dashboard"** to see your active action items and recent reflections. Click **"Timeline"** to verify chronological storage and search.
5. **Multi-User Isolation Proof**: Sign out and log in as **Alex Rivera (Persona B)**. Notice that Persona B sees a completely fresh, empty vault with zero access to Maya Chen's private data.
6. **Privacy & Security Portal**: Click **"Privacy & Security"** to review the live Secret Manager status, Firestore ABAC rules, and test the **"Right to Be Forgotten"** permanent data purge.
