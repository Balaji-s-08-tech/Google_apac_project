import React from 'react';
import { JournalMode } from '../types.js';
import { Feather, Lightbulb, Compass, Target } from 'lucide-react';

interface ModeSelectorProps {
  selectedMode: JournalMode;
  onSelectMode: (mode: JournalMode) => void;
  disabled?: boolean;
}

export const MODES_CONFIG: Record<
  JournalMode,
  { label: string; tag: string; description: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; activeBadge: string }
> = {
  free_journal: {
    label: 'Free Journal',
    tag: 'Safe Harbor',
    description: 'Empathetic listening & exploratory stream-of-consciousness journaling.',
    icon: Feather,
    colorClass: 'border-amber-500/40 text-amber-300 hover:border-amber-400',
    activeBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  brainstorm: {
    label: 'Brainstorm',
    tag: 'Ideation',
    description: 'Creative expansion, lateral associations & exploring possibilities.',
    icon: Lightbulb,
    colorClass: 'border-indigo-500/40 text-indigo-300 hover:border-indigo-400',
    activeBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  reflection: {
    label: 'Deep Reflection',
    tag: 'Insight',
    description: 'Cognitive reframing, pattern extraction & distill life lessons.',
    icon: Compass,
    colorClass: 'border-teal-500/40 text-teal-300 hover:border-teal-400',
    activeBadge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
  planning: {
    label: 'Goal Planning',
    tag: 'Execution',
    description: 'Pragmatic milestone chunking & prioritizing next concrete actions.',
    icon: Target,
    colorClass: 'border-emerald-500/40 text-emerald-300 hover:border-emerald-400',
    activeBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
};

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  const modes = Object.keys(MODES_CONFIG) as JournalMode[];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {modes.map((modeKey) => {
        const config = MODES_CONFIG[modeKey];
        const Icon = config.icon;
        const isSelected = selectedMode === modeKey;

        return (
          <button
            key={modeKey}
            id={`mode-select-btn-${modeKey}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelectMode(modeKey)}
            className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
              isSelected
                ? `${config.activeBadge} bg-stone-900 ring-1 ring-stone-600 shadow-md`
                : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-850 hover:border-stone-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-stone-400'}`} />
                <span className="font-medium text-sm text-stone-100">{config.label}</span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400">
                {config.tag}
              </span>
            </div>
            <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
              {config.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
