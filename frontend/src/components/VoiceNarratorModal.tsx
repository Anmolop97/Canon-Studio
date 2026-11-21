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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#FAF9F3] dark:bg-slate-950 border border-[#D7C397] dark:border-slate-800 shadow-2xl text-[#101C19] dark:text-slate-100 overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#D7C397]/60 dark:border-slate-800/80 bg-[#F4F0E5]/90 dark:bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-500 dark:text-amber-400">
                <Volume2 className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#101C19] dark:text-white flex items-center gap-2">
                    Canon Studio <span className="text-amber-600 dark:text-amber-400 font-mono text-xs uppercase px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30">Voice Narrator</span>
                  </h2>
                </div>
                <p className="text-xs text-[#58745C] dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>Multi-Voice Dialogue Engine &bull; {sourceType === 'draft' ? storyTitle : 'Sector 7 Protocol'} &bull; Instant Play</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#58745C] hover:text-[#101C19] hover:bg-[#E9E2CE] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
              title="Close Narrator"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Top Controls: Source Selector & Character Cast Badges */}
          <div className="px-5 py-3 border-b border-[#D7C397]/50 dark:border-slate-800/60 bg-[#FAF9F3] dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
            {/* Source Switcher */}
            <div className="inline-flex rounded-xl p-1 bg-white/80 dark:bg-slate-900 border border-[#D7C397]/60 dark:border-slate-800">
              <button
                onClick={() => {
                  if (playerRef.current) playerRef.current.stop();
                  setSourceType('draft');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sourceType === 'draft'
                    ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-xs'
                    : 'text-[#58745C] hover:text-[#101C19] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="size-3.5" />
                <span>Current Story Draft</span>
              </button>

              <button
                onClick={() => {
                  if (playerRef.current) playerRef.current.stop();
                  setSourceType('demo');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sourceType === 'demo'
                    ? 'bg-indigo-500/20 text-indigo-900 dark:text-indigo-300 border border-indigo-500/40 font-semibold shadow-xs'
                    : 'text-[#58745C] hover:text-[#101C19] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="size-3.5 text-amber-500 dark:text-amber-400" />
                <span>Featured Demo: Sector 7</span>
              </button>
            </div>

            {/* Cast Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-[11px] font-semibold text-[#58745C] dark:text-slate-500 uppercase tracking-wider mr-1">Voice Cast:</span>
              {uniqueSpeakers.map((spk) => {
                const seg = segments.find(s => s.speaker === spk);
                const isSpeaking = activeSegment?.speaker === spk && playbackState === 'playing';
                return (
                  <span
                    key={spk}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      seg?.badgeColor.bg
                    } ${seg?.badgeColor.text} ${seg?.badgeColor.border} ${
                      isSpeaking ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#FAF9F3] dark:ring-offset-slate-950 scale-105 font-bold' : ''
                    }`}
                  >
                    <span>{seg?.badgeColor.avatar}</span>
                    <span>{spk}</span>
                    <span className="text-[10px] opacity-75 font-mono">({seg?.voiceDisplayName.split(' ')[0]})</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Teleprompter / Dialogue Script View */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-[300px] max-h-[52vh] bg-[#FAF9F3] dark:bg-slate-950/50"
          >
            {segments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#58745C] dark:text-slate-500 text-center">
                <BookOpen className="size-10 mb-2 opacity-40" />
                <p className="text-sm">No text found in draft. Switch to "Featured Demo" to listen!</p>
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
                    className={`group relative p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#FFF9EE] dark:bg-slate-900/90 border-amber-500/80 dark:border-amber-500/70 shadow-lg shadow-amber-500/5'
                        : 'bg-white/90 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900/60 border-[#D7C397]/40 dark:border-slate-800/80 opacity-90 hover:opacity-100 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${seg.badgeColor.bg} ${seg.badgeColor.text} ${seg.badgeColor.border}`}>
                          <span>{seg.badgeColor.avatar}</span>
                          <span>{seg.speaker}</span>
                        </span>
                        {seg.isDialogue && (
                          <span className="text-[10px] text-[#87977A] dark:text-slate-500 font-mono">Dialogue</span>
                        )}
                        {seg.emotion && seg.emotion !== 'calm' && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wider ${
                            seg.emotion === 'urgent' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                            seg.emotion === 'whisper' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30' :
                            seg.emotion === 'authoritative' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30' :
                            seg.emotion === 'passionate' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                            seg.emotion === 'dramatic' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30' :
                            'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
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

                      {isActive && (
                        <div className="flex items-center gap-1.5">
                          {isPlayingLine && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold animate-pulse">
                              <Radio className="size-3 animate-spin" />
                              SPEAKING
                            </span>
                          )}
                          <span className="text-[10px] text-[#87977A] dark:text-slate-500 font-mono">#{idx + 1}</span>
                        </div>
                      )}
                    </div>

                    <p className={`text-sm sm:text-base leading-relaxed transition-colors ${
                      isActive ? 'text-[#101C19] dark:text-white font-medium' : 'text-[#263F35] dark:text-slate-300'
                    }`}>
                      {seg.isDialogue ? `"${seg.text}"` : seg.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Audio Control Dock */}
          <div className="p-4 border-t border-[#D7C397]/60 dark:border-slate-800/80 bg-[#F4F0E5]/90 dark:bg-slate-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            {/* Left: Active Speaker & Waveform */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 h-6 px-2 rounded-lg bg-white/90 dark:bg-slate-950 border border-[#D7C397]/50 dark:border-slate-800">
                {[0.4, 0.8, 1.2, 0.6, 0.9, 0.3].map((delay, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      playbackState === 'playing'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-slate-300 dark:bg-slate-700 h-2'
                    }`}
                    style={{
                      height: playbackState === 'playing' ? `${Math.sin(i * 1.5) * 10 + 14}px` : '6px',
                      animationDelay: `${delay * 0.2}s`
                    }}
                  />
                ))}
              </div>

              {activeSegment ? (
                <div className="text-xs">
                  <div className="font-semibold text-[#101C19] dark:text-slate-200 flex items-center gap-1.5">
                    <span>{activeSegment.badgeColor.avatar}</span>
                    <span>{activeSegment.speaker}</span>
                    <span className="text-amber-700 dark:text-amber-400 font-mono text-[10px] bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                      {activeSegment.voiceDisplayName}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#58745C] dark:text-slate-400 font-mono">
                    Model: {activeSegment.neuralVoice} &bull; Neural HD Stream
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#58745C] dark:text-slate-500 font-mono">Ready to play</div>
              )}
            </div>

            {/* Center: Play / Pause Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestart}
                className="p-2.5 rounded-xl bg-white/90 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-[#263F35] hover:text-[#101C19] dark:text-slate-300 dark:hover:text-white border border-[#D7C397]/50 dark:border-transparent transition-colors shadow-xs"
                title="Restart Audio"
              >
                <RotateCcw className="size-4" />
              </button>

              <button
                onClick={togglePlayPause}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all hover:scale-102 active:scale-98"
              >
                {playbackState === 'playing' ? (
                  <>
                    <Pause className="size-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current ml-0.5" />
                    <span>{playbackState === 'paused' ? 'Resume' : 'Play Drama'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Speed Multiplier */}
            <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-950 p-1 rounded-xl border border-[#D7C397]/50 dark:border-slate-800">
              <Sliders className="size-3 text-[#58745C] dark:text-slate-500 ml-1 mr-0.5" />
              {[0.9, 1.0, 1.2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    speedMultiplier === spd
                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40'
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
