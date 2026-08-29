import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { NavigationTab } from '../types.js';
import {
  BookOpen,
  LayoutDashboard,
  MessageSquarePlus,
  History,
  Sparkles,
  ShieldCheck,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const { user, signOut } = useAuth();

  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'chat', label: 'Journal & Chat', icon: <MessageSquarePlus className="w-4 h-4" /> },
    { id: 'history', label: 'Timeline', icon: <History className="w-4 h-4" /> },
    { id: 'reflection', label: 'Reflection Intelligence', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'settings', label: 'Privacy & Security', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur border-b border-stone-800 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onTabChange('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-950/30 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-stone-950 font-semibold" />
            </div>
            <div>
              <span className="font-serif font-medium text-lg tracking-tight text-stone-100 flex items-center gap-1.5">
                Personal Gemini Journal
              </span>
              <span className="text-[11px] font-mono text-stone-400 tracking-wider block -mt-0.5">
                PRIVATE AI REFLECTION WORKSPACE
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700/60'
                      : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right User State & Sign Out */}
          <div className="flex items-center space-x-3">
            {user && (
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-medium text-stone-200 truncate max-w-[150px]">
                  {user.displayName || user.email}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  UID: {user.uid.slice(0, 8)}...
                </span>
              </div>
            )}

            <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300">
              <UserIcon className="w-4 h-4" />
            </div>

            <button
              id="nav-sign-out-btn"
              onClick={signOut}
              title="Sign Out"
              className="p-2 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="md:hidden flex items-center space-x-1 py-2 overflow-x-auto scrollbar-none border-t border-stone-800/60">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-stone-800 text-amber-300 border border-stone-700'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
