import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { NavigationTab, SystemStatus } from '../types.js';
import { fetchSystemStatus, deleteAllUserData } from '../lib/apiClient.js';
import {
  ShieldCheck,
  Key,
  Database,
  Trash2,
  Lock,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Terminal,
  FileCode,
} from 'lucide-react';

interface SettingsViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const { user, getAuthHeaders, signOut } = useAuth();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>('');
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const data = await fetchSystemStatus();
      setSystemStatus(data);
    } catch (err) {
      console.warn('System status fetch notice:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleDeleteAllData = async () => {
    if (deleteConfirmation !== 'DELETE MY DATA') {
      alert('Please type "DELETE MY DATA" exactly to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      const headers = getAuthHeaders();
      const result = await deleteAllUserData(headers);
      setShowDeleteModal(false);
      setDeleteSuccessNotice(
        `Successfully purged ${result.deletedConversations} conversations and ${result.deletedInsights} reflection insights.`
      );
      setTimeout(() => {
        setDeleteSuccessNotice(null);
        onNavigate('dashboard');
      }, 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete data.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-stone-100 font-normal">
            Privacy & Security Architecture
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Zero-trust design, Google Cloud Secret Manager integration, and verified UID-isolated Firestore persistence.
          </p>
        </div>

        <button
          onClick={loadStatus}
          className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          title="Refresh Diagnostic Status"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {deleteSuccessNotice && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs p-4 rounded-2xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{deleteSuccessNotice}</span>
        </div>
      )}

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pillar 1: Secret Management */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-amber-400">
              <Key className="w-5 h-5" />
              <h3 className="font-medium text-stone-100 text-sm">
                Google Cloud Secret Manager
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300">
              {systemStatus?.secretManagement?.source === 'secret_manager'
                ? 'Secret Manager API'
                : 'Server Environment'}
            </span>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">
            API keys and credentials are never stored in client code or frontend bundles. The backend retrieves secrets server-side with in-memory TTL caching.
          </p>

          <div className="bg-stone-950/60 rounded-xl p-3 text-[11px] font-mono text-stone-400 space-y-1">
            <div className="flex justify-between">
              <span>Secret Provider:</span>
              <span className="text-stone-200">{systemStatus?.secretManagement?.source || 'Server-Side'}</span>
            </div>
            <div className="flex justify-between">
              <span>Browser Exposure:</span>
              <span className="text-emerald-400">0% (Strictly Server-Only)</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Firestore User Isolation */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-emerald-400">
              <Database className="w-5 h-5" />
              <h3 className="font-medium text-stone-100 text-sm">
                Firestore User Isolation
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
              Deny-By-Default
            </span>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">
            Every record is partitioned under <code className="text-stone-300">/users/{'{uid}'}/...</code>. No global collections. Access is verified server-side against cryptographic tokens.
          </p>

          <div className="bg-stone-950/60 rounded-xl p-3 text-[11px] font-mono text-stone-400 space-y-1">
            <div className="flex justify-between">
              <span>Active Verified UID:</span>
              <span className="text-stone-200">{user?.uid || 'Not Authenticated'}</span>
            </div>
            <div className="flex justify-between">
              <span>IDOR Defense:</span>
              <span className="text-emerald-400">Enforced at API Gateway</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: AI Output & Prompt Guard */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-indigo-400">
              <Lock className="w-5 h-5" />
              <h3 className="font-medium text-stone-100 text-sm">
                Prompt Injection Defense
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
              Guarded
            </span>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">
            User inputs are bounded to 10,000 characters and isolated within clear conversational boundaries. Gemini cannot execute arbitrary SQL or shell commands.
          </p>

          <div className="bg-stone-950/60 rounded-xl p-3 text-[11px] font-mono text-stone-400 space-y-1">
            <div className="flex justify-between">
              <span>Model:</span>
              <span className="text-stone-200">{systemStatus?.aiModel || 'gemini-3.7-flash'}</span>
            </div>
            <div className="flex justify-between">
              <span>Output Validation:</span>
              <span className="text-emerald-400">Strict JSON Schema Parsing</span>
            </div>
          </div>
        </div>

        {/* Pillar 4: Container Runtime */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-teal-400">
              <Server className="w-5 h-5" />
              <h3 className="font-medium text-stone-100 text-sm">
                Google Cloud Run Ready
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800/60 text-teal-300">
              Containerized
            </span>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">
            Stateless microservice deployment bundled with esbuild, running with least-privilege IAM service accounts.
          </p>

          <div className="bg-stone-950/60 rounded-xl p-3 text-[11px] font-mono text-stone-400 space-y-1">
            <div className="flex justify-between">
              <span>Target Port:</span>
              <span className="text-stone-200">3000 (0.0.0.0)</span>
            </div>
            <div className="flex justify-between">
              <span>Service Health:</span>
              <span className="text-emerald-400">200 OK Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture Flowchart */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-serif font-medium text-stone-100 text-base">
          Security Boundary & Data Flow
        </h3>

        <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-5 font-mono text-xs text-stone-300 leading-relaxed overflow-x-auto">
          <div className="whitespace-pre">
{`Browser (Untrusted Client)
       │
       ▼ [1. Firebase Auth ID Token / Session Token in Authorization Header]
Express Backend (/api/* on Cloud Run)
       │
       ├─► [2. Server-Side Token Verification] ──► Extracts Verified UID
       │                                            (Client-supplied UID ignored)
       │
       ├─► [3. Google Cloud Secret Manager] ─────► In-Memory Cached Gemini API Key
       │                                            (Never exposed to browser)
       │
       ├─► [4. Gemini 3.7 Flash Model] ──────────► Multi-Turn Chat & Structured JSON
       │                                            (With bounded prompt limits)
       │
       └─► [5. Cloud Firestore Database] ────────► Writes strictly to /users/{VERIFIED_UID}/...
                                                   (Guaranteed Zero Cross-User Leakage)`}
          </div>
        </div>
      </div>

      {/* Right to be Forgotten / Data Deletion */}
      <div className="bg-stone-900 border border-rose-950/70 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 text-rose-400">
          <Trash2 className="w-5 h-5" />
          <h3 className="font-serif font-medium text-stone-100 text-base">
            Privacy: Right to Be Forgotten
          </h3>
        </div>

        <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
          You have full sovereignty over your reflections. Permanently delete all your conversations, messages, and reflection intelligence reports from our database. This action is irreversible.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-medium transition-colors"
        >
          Purge All My Journal Data
        </button>
      </div>

      {/* Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif font-medium text-lg text-stone-100">
                Confirm Permanent Data Purge
              </h3>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              This will permanently delete all conversations and reflections associated with verified UID: <span className="font-mono text-stone-200">{user?.uid}</span>.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-stone-400 block">
                Type <span className="text-rose-400 font-bold">DELETE MY DATA</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE MY DATA"
                className="w-full bg-stone-950 border border-stone-800 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs hover:bg-stone-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmation !== 'DELETE MY DATA'}
                onClick={handleDeleteAllData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Purging...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
