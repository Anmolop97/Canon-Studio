import { useState } from 'react';
import { Volume2, Sparkles, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceNarratorModal } from './VoiceNarratorModal';

interface VoiceNarratorButtonProps {
  className?: string;
  compact?: boolean;
  storyText?: string;
  text?: string;
  storyTitle?: string;
  onClick?: () => void;
}

export function VoiceNarratorButton({ 
  className = "", 
  compact = false,
  storyText = "",
  text = "",
  storyTitle = "Story Chapter",
  onClick
}: VoiceNarratorButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const effectiveText = storyText || text;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div
        className="relative inline-flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label="Launch AI Voice Narrator"
          className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-indigo-500/10 dark:bg-slate-900/90 border border-amber-500/30 hover:border-amber-400 dark:border-amber-500/40 dark:hover:border-amber-400 text-slate-800 dark:text-amber-300 text-xs font-semibold shadow-xs hover:shadow-md hover:shadow-amber-500/10 transition-all duration-200 cursor-pointer min-h-[44px] ${className}`}
        >
          <span className="relative flex items-center justify-center size-5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors shrink-0">
            <Volume2 className="size-3.5 transition-transform duration-200 group-hover:scale-115" />
          </span>
          {!compact && <span className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">Voice Narrator</span>}
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 shrink-0">
            <Radio className="size-2.5 animate-pulse" />
            Live
          </span>
        </button>

        {/* Tactile Popover Tooltip on Hover */}
        <AnimatePresence>
          {isHovered && !isModalOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none whitespace-nowrap"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-white text-[11px] font-medium shadow-2xl border border-amber-500/30 backdrop-blur-md">
                <Sparkles className="size-3.5 text-amber-400 shrink-0 animate-pulse" />
                <span>Multi-Voice Dialogue Narrator &bull; <strong className="text-amber-300 font-semibold">Click to Listen</strong></span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Embedded Narrator Studio Modal */}
      <VoiceNarratorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDraftText={effectiveText}
        storyTitle={storyTitle}
      />
    </>
  );
}

export default VoiceNarratorButton;
