import { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, Loader2, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { API_BASE } from '../api';

export interface VoiceModel {
  id: string;
  shortName: string;
  displayName: string;
  gender: string;
  tone?: string;
}

const DEFAULT_MODELS: VoiceModel[] = [
  { id: 'narrator', shortName: 'en-US-ChristopherNeural', displayName: 'Christopher (Studio Narrator)', gender: 'neutral' },
  { id: 'kai', shortName: 'en-US-GuyNeural', displayName: 'Guy (Young Hero)', gender: 'male' },
  { id: 'elena', shortName: 'en-US-AriaNeural', displayName: 'Aria (Female Lead)', gender: 'female' },
  { id: 'jenny', shortName: 'en-US-JennyNeural', displayName: 'Jenny (Analytical Scientist)', gender: 'female' },
  { id: 'mentor', shortName: 'en-US-RogerNeural', displayName: 'Roger (Veteran Elder)', gender: 'male' },
  { id: 'britishNoble', shortName: 'en-GB-RyanNeural', displayName: 'Ryan (British Aristocrat)', gender: 'male' }
];

interface VoiceNarratorButtonProps {
  text?: string;
  className?: string;
  compact?: boolean;
}

export function VoiceNarratorButton({ text = '', className = '', compact = false }: VoiceNarratorButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<VoiceModel[]>(DEFAULT_MODELS);
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-ChristopherNeural');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch available models from backend
  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/voice/models`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (mounted && data?.models && Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Cleanup audio on unmount or text change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  const cleanStoryText = (raw: string): string => {
    return raw
      .replace(/<[^>]*>/g, ' ')
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleTogglePlay = async () => {
    const cleaned = cleanStoryText(text);

    if (!cleaned) {
      setHint('Generate or select a story to narrate first!');
      setTimeout(() => setHint(null), 3000);
      return;
    }

    // If already playing, pause it
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // If paused with existing audio, resume
    if (audioRef.current && audioRef.current.src && !audioRef.current.ended) {
      try {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        return;
      } catch {
        // Fall through to re-create audio if resumed failed
      }
    }

    try {
      setIsLoading(true);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Encode first 2000 chars for smooth streaming chunk
      const narrateExcerpt = cleaned.slice(0, 2000);
      const streamUrl = `${API_BASE}/voice/stream?text=${encodeURIComponent(narrateExcerpt)}&voice=${encodeURIComponent(selectedVoice)}&rate=0%25&pitch=0Hz`;

      const audio = new Audio(streamUrl);
      audioRef.current = audio;

      audio.oncanplay = () => {
        setIsLoading(false);
      };

      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
        setHint('Audio stream error. Re-trying with standard speech...');
        // Fallback to browser SpeechSynthesis if network audio stream fails
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(narrateExcerpt);
          utterance.rate = 0.95;
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => setIsPlaying(false);
          window.speechSynthesis.speak(utterance);
          setIsPlaying(true);
        }
        setTimeout(() => setHint(null), 3500);
      };

      await audio.play();
    } catch (err: any) {
      setIsLoading(false);
      setIsPlaying(false);
      setHint(err.message || 'Failed to start playback');
      setTimeout(() => setHint(null), 3000);
    }
  };

  const currentModelName = models.find(m => m.shortName === selectedVoice)?.displayName || 'Neural Voice';

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      <div className={`inline-flex items-center rounded-xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 shadow-xs overflow-hidden transition-all duration-200 min-h-[40px] sm:min-h-[44px] ${className}`}>
        {/* Play/Pause Main Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={isLoading}
          aria-label={isPlaying ? "Pause Narration" : "Play AI Voice Narration"}
          className="group flex items-center gap-2 px-3 py-2 text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 transition-colors cursor-pointer text-xs font-semibold"
          title={`Narrate with ${currentModelName}`}
        >
          <span className="relative flex items-center justify-center size-5 rounded-lg bg-indigo-50 dark:bg-sky-950/60 text-indigo-600 dark:text-sky-400 transition-colors shrink-0">
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin text-amber-500" />
            ) : isPlaying ? (
              <Pause className="size-3.5 fill-current text-emerald-500" />
            ) : (
              <Play className="size-3.5 fill-current text-indigo-600 dark:text-sky-400" />
            )}
          </span>

          {!compact && (
            <span className="hidden sm:inline">
              {isPlaying ? 'Pause' : 'AI Voice Narrator'}
            </span>
          )}

          {/* Equalizer animation when playing */}
          {isPlaying ? (
            <span className="flex items-end gap-0.5 h-3.5 px-1">
              <span className="w-0.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0ms] h-full" />
              <span className="w-0.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms] h-2" />
              <span className="w-0.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms] h-full" />
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 shrink-0">
              Live Neural
            </span>
          )}
        </button>

        {/* Voice Selector Trigger */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="px-1.5 py-2 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 border-l border-slate-200/80 dark:border-slate-700/80 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          title="Choose Voice Persona"
          aria-label="Voice settings"
        >
          <ChevronDown className={`size-3.5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Popover / Hint */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none whitespace-nowrap"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-amber-300 text-[11px] font-medium shadow-2xl border border-amber-500/30 backdrop-blur-md">
              <Volume2 className="size-3.5 shrink-0" />
              <span>{hint}</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Selection Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            className="absolute top-full right-0 mt-2 z-50 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 text-xs"
          >
            <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
              Select Neural Voice
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {models.map(m => {
                const isSelected = m.shortName === selectedVoice;
                return (
                  <button
                    key={m.id || m.shortName}
                    type="button"
                    onClick={() => {
                      setSelectedVoice(m.shortName);
                      setIsMenuOpen(false);
                      if (isPlaying && audioRef.current) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-sky-950/60 text-indigo-600 dark:text-sky-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>{m.displayName}</span>
                      {m.tone && <span className="text-[10px] text-slate-400 font-normal">{m.tone}</span>}
                    </div>
                    {isSelected && <Check className="size-3.5 text-indigo-600 dark:text-sky-400 shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VoiceNarratorButton;
