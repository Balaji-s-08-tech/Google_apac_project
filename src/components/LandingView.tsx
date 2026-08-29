import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  BookOpen,
  Sparkles,
  Shield,
  Lock,
  ArrowRight,
  UserCheck,
  Zap,
  Key,
  Compass,
  Target,
} from 'lucide-react';

const TESTER_PROFILES = [
  {
    uid: 'judge_eval_01',
    displayName: 'Maya Chen',
    email: 'maya.chen@apac-ideathon.dev',
    role: 'Lead Evaluator (Persona A)',
    avatarBg: 'from-amber-600 to-amber-800',
  },
  {
    uid: 'judge_eval_02',
    displayName: 'Alex Rivera',
    email: 'alex.rivera@apac-ideathon.dev',
    role: 'Cloud Architect (Persona B)',
    avatarBg: 'from-teal-600 to-teal-800',
  },
];

export const LandingView: React.FC = () => {
  const { signInGoogle, signInWithProfile, isFirebaseConfigured, error } = useAuth();
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const cleanName = customName.trim();
    const cleanEmail = customEmail.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '.')}@geminijournal.app`;
    const uid = `user_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    signInWithProfile({
      uid,
      displayName: cleanName,
      email: cleanEmail,
    });
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      {/* Top Banner */}
      <div className="border-b border-stone-850 bg-stone-900/50 backdrop-blur px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 shadow-md">
              <BookOpen className="w-5 h-5 font-bold" />
            </div>
            <div>
              <span className="font-serif font-medium text-lg text-stone-100">
                Personal Gemini Journal
              </span>
              <span className="hidden sm:inline-block text-stone-500 text-xs ml-2 font-mono">
                APAC IDEATHON SUBMISSION
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-full">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero-Trust Auth Gate</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Hero & Auth Portal */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
        {/* Left Column: Product Vision */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/60 text-xs font-mono text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google Gen AI Academy APAC Ideathon</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-stone-100 leading-[1.15]">
              Your private AI thinking space for clarity, reflection, and growth.
            </h1>

            <p className="text-sm sm:text-base text-stone-400 max-w-xl leading-relaxed">
              Have multi-turn conversations with Gemini across custom thinking modes, synthesize structured reflections with actionable milestones, and store your thoughts with verified user-isolated Firestore security.
            </p>
          </div>

          {/* 4 Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-medium">
                <Lock className="w-4 h-4" />
                <span>Zero-Leakage User Isolation</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                All records partitioned under <code className="text-stone-300">/users/{'{uid}'}/...</code> with deny-by-default Firestore rules.
              </p>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center space-x-2 text-teal-400 text-xs font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Reflection Intelligence</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Extracts actionable next steps, recurring themes, decisions, and inquiry questions.
              </p>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-medium">
                <Compass className="w-4 h-4" />
                <span>4 Thinking Modes</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Free Journal, Creative Brainstorm, Deep Reflection, and Pragmatic Goal Planning.
              </p>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-medium">
                <Key className="w-4 h-4" />
                <span>Secret Manager & Cloud Run</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Server-side secret fetching with memory cache and 0% browser credential exposure.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In & Judge Persona Selector */}
        <div className="lg:col-span-5">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="space-y-1.5">
              <h2 className="font-serif text-xl text-stone-100 font-medium">
                Authenticate & Enter
              </h2>
              <p className="text-xs text-stone-400">
                Choose a verified evaluator persona or sign in to test complete Firestore data isolation.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* Quick Test Evaluator Personas */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                Instant Evaluator Personas (Multi-User Test)
              </span>

              <div className="space-y-2">
                {TESTER_PROFILES.map((profile) => (
                  <button
                    key={profile.uid}
                    id={`persona-signin-${profile.uid}`}
                    type="button"
                    onClick={() => signInWithProfile(profile)}
                    className="w-full p-3.5 rounded-2xl bg-stone-850 hover:bg-stone-800 border border-stone-750 hover:border-amber-500/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${profile.avatarBg} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                        {profile.displayName.slice(0, 1)}
                      </div>
                      <div>
                        <span className="text-xs font-medium text-stone-200 block group-hover:text-amber-300 transition-colors">
                          {profile.displayName}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400 block">
                          {profile.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 text-xs text-stone-400 group-hover:text-amber-300 font-medium">
                      <span>Launch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom User Entry Form */}
            <div className="pt-2 border-t border-stone-800/80 space-y-3">
              <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
                Or Sign In As Custom Journaler
              </span>

              <form onSubmit={handleCustomLogin} className="space-y-3">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Your Name (e.g., Jordan Lee)"
                  className="w-full bg-stone-950/70 border border-stone-800 text-stone-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  required
                />
                <button
                  type="submit"
                  disabled={!customName.trim()}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-medium text-stone-200 transition-colors disabled:opacity-40"
                >
                  Create / Enter Custom Session
                </button>
              </form>
            </div>

            {/* Google OAuth (if configured) */}
            {isFirebaseConfigured && (
              <div className="pt-2 border-t border-stone-800/80">
                <button
                  onClick={signInGoogle}
                  className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-white text-stone-950 text-xs font-semibold transition-colors flex items-center justify-center space-x-2 shadow-sm"
                >
                  <UserCheck className="w-4 h-4 text-stone-900" />
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-stone-900 py-6 text-center text-xs text-stone-400">
        <p>Google Gen AI Academy APAC Ideathon Finalist • Personal Gemini Journal • Built for Cloud Run</p>
      </div>
    </div>
  );
};
