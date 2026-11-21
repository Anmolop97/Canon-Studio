import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, Pause, RotateCcw, X, Volume2, Sparkles, 
  Radio, Sliders, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  type NarrativeSegment, 
  VoiceNarratorPlayer, 
  parseProseToSegments, 
  FEATURED_SECTOR_7_DEMO_TEXT 
} from '../lib/voiceNarratorEngine';

interface VoiceNarratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDraftText?: string;
  storyTitle?: string;
}

export function VoiceNarratorModal({
  isOpen,
  onClose,
  currentDraftText = '',
  storyTitle = 'Current Story Chapter'
}: VoiceNarratorModalProps) {
  const [sourceType, setSourceType] = useState<'draft' | 'demo'>('draft');
  const [segments, setSegments] = useState<NarrativeSegment[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const playerRef = useRef<VoiceNarratorPlayer | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // When modal opens, default to draft if draft has text, else demo
  useEffect(() => {
    if (isOpen) {
      if (currentDraftText && currentDraftText.trim()) {
        setSourceType('draft');
      } else {
        setSourceType('demo');
      }
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, currentDraftText]);

  // Initialize or re-parse segments when source or draft changes (only when modal is open)
  useEffect(() => {
    if (!isOpen) return;

    const textToParse = sourceType === 'demo' || !currentDraftText.trim() 
      ? FEATURED_SECTOR_7_DEMO_TEXT 
      : currentDraftText;

    const parsed = parseProseToSegments(textToParse);
    setSegments(parsed);
    setActiveIndex(0);

    if (playerRef.current) {
      playerRef.current.setSegments(parsed);
    }
  }, [sourceType, currentDraftText, isOpen]);

  // Setup player engine
  useEffect(() => {
    if (!isOpen) {
      if (playerRef.current) {
        playerRef.current.stop();
      }
      return;
    }

    const player = new VoiceNarratorPlayer({
      onSegmentStart: (index) => {
        setActiveIndex(index);
        // Auto scroll to active segment
        const el = document.getElementById(`narrator-seg-${index}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      },
      onStateChange: (state) => {
        setPlaybackState(state);
      },
      onComplete: () => {
        setActiveIndex(0);
      }
    });

    playerRef.current = player;
    player.setSpeedMultiplier(speedMultiplier);

    const initialText = sourceType === 'demo' || !currentDraftText.trim() 
      ? FEATURED_SECTOR_7_DEMO_TEXT 
      : currentDraftText;
    const parsed = parseProseToSegments(initialText);
    setSegments(parsed);
    player.setSegments(parsed);

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [isOpen]);

  // Adjust speed multiplier
  const handleSpeedChange = (speed: number) => {
    setSpeedMultiplier(speed);
    if (playerRef.current) {
      playerRef.current.setSpeedMultiplier(speed);
    }
  };

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (playbackState === 'playing') {
      playerRef.current.pause();
    } else {
      playerRef.current.play(playbackState === 'paused' ? undefined : activeIndex);
    }
  };

  const handleRestart = () => {
    if (!playerRef.current) return;
    playerRef.current.play(0);
  };

  const handleJumpToLine = (index: number) => {
    if (!playerRef.current) return;
    setActiveIndex(index);
    playerRef.current.play(index);
  };

  // Extract unique character roster for display badge
  const uniqueSpeakers = Array.from(new Set(segments.map(s => s.speaker)));
  const activeSegment = segments[activeIndex] || null;

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#FAF6EE] dark:bg-[#0C1512] border-2 border-[#D7C397]/70 dark:border-[#263E32] shadow-[0_24px_80px_rgba(16,28,25,0.35)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.7)] text-[#101C19] dark:text-slate-100 overflow-hidden font-sans"
        >
          {/* Top ambient accent gradient hairline */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 opacity-90" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#D7C397]/50 dark:border-[#22392E] bg-[#F4EDE0] dark:bg-[#0E1914]">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center size-10 rounded-2xl bg-gradient-to-br from-amber-500/20 via-emerald-500/15 to-transparent border border-amber-500/35 text-amber-600 dark:text-amber-400 shadow-xs">
                <Volume2 className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-serif font-bold tracking-tight text-[#101C19] dark:text-amber-100">
                    Canon Studio
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-xs">
                    <Sparkles className="size-3 text-amber-500" />
                    Neural Voice Narrator
                  </span>
                </div>
                <p className="text-xs text-[#48634C] dark:text-emerald-400/90 flex items-center gap-2 mt-0.5 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Multi-Voice Dialogue Engine &bull; {sourceType === 'draft' ? storyTitle : 'Sector 7 Protocol'} &bull; Neural HD Stream</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="size-9 rounded-xl flex items-center justify-center text-[#58745C] hover:text-[#101C19] hover:bg-[#E6DEC9] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-[#D7C397]/60"
              title="Close Narrator"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Top Controls: Source Selector & Character Cast Badges */}
          <div className="px-6 py-3 border-b border-[#D7C397]/50 dark:border-[#22392E] bg-[#F7F1E6] dark:bg-[#0F1B16] flex flex-wrap items-center justify-between gap-3">
            {/* Source Switcher */}
            <div className="inline-flex rounded-2xl p-1 bg-[#EBE2D3] dark:bg-[#14231C] border border-[#D7C397]/60 dark:border-[#243B30] shadow-xs">
              <button
                onClick={() => {
                  if (playerRef.current) playerRef.current.stop();
                  setSourceType('draft');
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  sourceType === 'draft'
                    ? 'bg-[#FFFFFF] dark:bg-[#1E3327] text-amber-950 dark:text-amber-200 border border-[#D7C397]/70 dark:border-amber-500/40 shadow-xs'
                    : 'text-[#58745C] hover:text-[#101C19] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span>Current Story Draft</span>
              </button>

              <button
                onClick={() => {
                  if (playerRef.current) playerRef.current.stop();
                  setSourceType('demo');
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  sourceType === 'demo'
                    ? 'bg-[#FFFFFF] dark:bg-[#1E3327] text-emerald-950 dark:text-emerald-200 border border-[#D7C397]/70 dark:border-emerald-500/40 shadow-xs'
                    : 'text-[#58745C] hover:text-[#101C19] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Featured Demo: Sector 7</span>
              </button>
            </div>

            {/* Cast Badges */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              <span className="text-[10px] font-bold text-[#56745B] dark:text-emerald-500/90 uppercase tracking-widest mr-0.5">
                Cast:
              </span>
              {uniqueSpeakers.map((spk) => {
                const seg = segments.find(s => s.speaker === spk);
                const isSpeaking = activeSegment?.speaker === spk && playbackState === 'playing';
                return (
                  <span
                    key={spk}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      seg?.badgeColor.bg
                    } ${seg?.badgeColor.text} ${seg?.badgeColor.border} ${
                      isSpeaking
                        ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[#FAF6EE] dark:ring-offset-[#0C1512] scale-105 font-bold shadow-sm'
                        : 'shadow-xs'
                    }`}
                  >
                    <span className="text-sm">{seg?.badgeColor.avatar}</span>
                    <span className="font-semibold">{spk}</span>
                    <span className="text-[10px] opacity-75 font-mono">({seg?.voiceDisplayName.split(' ')[0]})</span>
                    {isSpeaking && (
                      <span className="flex items-center gap-0.5 ml-0.5">
                        <span className="size-1 rounded-full bg-amber-500 animate-ping" />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Teleprompter / Dialogue Script View */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 min-h-[300px] max-h-[52vh] bg-gradient-to-b from-[#F3ECE1] to-[#EBE2D4] dark:from-[#0B1410] dark:to-[#080E0B]"
          >
            {segments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#58745C] dark:text-slate-500 text-center">
                <BookOpen className="size-12 mb-3 opacity-30 text-amber-600" />
                <p className="text-sm font-medium">No text found in draft. Switch to "Featured Demo" to listen to the dialogue drama!</p>
              </div>
            ) : (
              segments.map((seg, idx) => {
                const isActive = activeIndex === idx;
                const isPlayingLine = isActive && playbackState === 'playing';

                return (
                  <div
                    key={seg.id}
                    id={`narrator-seg-${idx}`}
                    onClick={() => handleJumpToLine(idx)}
                    className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#FFFFFF] dark:bg-[#162A20] border-2 border-amber-500 dark:border-amber-400 shadow-[0_10px_28px_rgba(217,119,6,0.16)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.5)] ring-2 ring-amber-500/20'
                        : 'bg-[#FCFAF5] dark:bg-[#121F19]/80 hover:bg-[#FFFFFF] dark:hover:bg-[#162720] border border-[#DDD3BF] dark:border-[#22392E] shadow-xs hover:shadow-sm'
                    }`}
                  >
                    {/* Active Line Left Indicator Bar */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-l-2xl" />
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${seg.badgeColor.bg} ${seg.badgeColor.text} ${seg.badgeColor.border}`}>
                          <span>{seg.badgeColor.avatar}</span>
                          <span>{seg.speaker}</span>
                        </span>

                        {seg.isDialogue && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 font-semibold">
                            Dialogue
                          </span>
                        )}

                        {seg.emotion && seg.emotion !== 'calm' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider font-semibold ${
                            seg.emotion === 'urgent' ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/35' :
                            seg.emotion === 'whisper' ? 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/35' :
                            seg.emotion === 'authoritative' ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/35' :
                            seg.emotion === 'passionate' ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35' :
                            seg.emotion === 'dramatic' ? 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/35' :
                            'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35'
                          }`}>
                            {seg.emotion === 'urgent' ? '🔥 Urgent' :
                             seg.emotion === 'whisper' ? '🤫 Whisper' :
                             seg.emotion === 'authoritative' ? '⚔️ Command' :
                             seg.emotion === 'passionate' ? '🌸 Expressive' :
                             seg.emotion === 'dramatic' ? '🎙️ Dramatic' :
                             '⚡ Heroic'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isPlayingLine && (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-bold animate-pulse">
                            <Radio className="size-3 animate-spin" />
                            NOW PLAYING
                          </span>
                        )}
                        <span className="text-[10px] text-[#7A6B53] dark:text-slate-400 font-mono font-semibold">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>

                    {seg.isDialogue ? (
                      <div className="pl-3.5 border-l-2 border-amber-500/50 dark:border-amber-500/40 my-1">
                        <p className={`text-[15.5px] sm:text-[17px] leading-[1.8] font-serif transition-colors ${
                          isActive 
                            ? 'text-[#0E1C16] dark:text-amber-100 font-semibold' 
                            : 'text-[#1E362C] dark:text-slate-200'
                        }`}>
                          &ldquo;{seg.text}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <p className={`text-[14.5px] sm:text-[15px] leading-[1.75] font-sans transition-colors ${
                        isActive 
                          ? 'text-[#0E1C16] dark:text-white font-medium' 
                          : 'text-[#264034] dark:text-slate-300'
                      }`}>
                        {seg.text}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Audio Control Dock */}
          <div className="p-4 sm:p-5 border-t border-[#D7C397]/50 dark:border-[#22392E] bg-[#F4EDE0] dark:bg-[#0E1914] flex flex-wrap items-center justify-between gap-4">
            {/* Left: Active Speaker & Equalizer Visualizer */}
            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-1 h-8 px-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#14231C] border border-[#D7C397]/60 dark:border-[#243B30] shadow-xs">
                {[0.4, 0.9, 1.4, 0.6, 1.1, 0.3, 0.8, 1.2, 0.5, 1.0].map((delay, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      playbackState === 'playing'
                        ? 'bg-gradient-to-t from-amber-500 to-emerald-400 animate-pulse'
                        : 'bg-slate-300 dark:bg-slate-700 h-2'
                    }`}
                    style={{
                      height: playbackState === 'playing' 
                        ? `${Math.abs(Math.sin((i + 1) * 1.3)) * 16 + 8}px` 
                        : '6px',
                      animationDelay: `${delay * 0.18}s`
                    }}
                  />
                ))}
              </div>

              {activeSegment ? (
                <div className="text-xs">
                  <div className="font-semibold text-[#101C19] dark:text-slate-200 flex items-center gap-2">
                    <span className="text-base">{activeSegment.badgeColor.avatar}</span>
                    <span className="font-serif text-[13px]">{activeSegment.speaker}</span>
                    <span className="text-amber-900 dark:text-amber-300 font-mono text-[10px] bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/35 font-semibold">
                      {activeSegment.voiceDisplayName}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#48634C] dark:text-emerald-400/90 font-mono mt-0.5">
                    Model: {activeSegment.neuralVoice} &bull; 96kHz HD
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#58745C] dark:text-slate-500 font-mono">Ready to play drama</div>
              )}
            </div>

            {/* Center: Play / Pause Controls */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRestart}
                className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#14231C] hover:bg-[#EAE0CD] dark:hover:bg-[#1A2D24] text-[#263F35] hover:text-[#101C19] dark:text-slate-300 dark:hover:text-white border border-[#D7C397]/70 dark:border-[#243B30] transition-all shadow-xs active:scale-95"
                title="Restart Audio"
              >
                <RotateCcw className="size-4" />
              </button>

              <button
                onClick={togglePlayPause}
                className="flex items-center gap-2.5 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold text-sm tracking-wide shadow-[0_4px_24px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {playbackState === 'playing' ? (
                  <>
                    <Pause className="size-4 fill-current" />
                    <span>Pause Drama</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current ml-0.5" />
                    <span>{playbackState === 'paused' ? 'Resume Drama' : 'Play Drama'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Speed Multiplier */}
            <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#14231C] p-1 rounded-2xl border border-[#D7C397]/70 dark:border-[#243B30] shadow-xs">
              <Sliders className="size-3 text-[#58745C] dark:text-emerald-500/80 ml-1.5 mr-0.5" />
              {[0.9, 1.0, 1.2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-semibold transition-all ${
                    speedMultiplier === spd
                      ? 'bg-amber-500/25 text-amber-950 dark:text-amber-200 border border-amber-500/40 shadow-xs'
                      : 'text-[#58745C] hover:text-[#101C19] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

export default VoiceNarratorModal;
