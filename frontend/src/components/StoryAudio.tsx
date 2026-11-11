import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, SkipBack } from 'lucide-react';

interface StoryAudioProps {
  storyText: string;
}

// Split text into ~200‑char chunks at sentence boundaries (including Hindi danda "।")
function splitIntoChunks(text: string, max = 200): string[] {
  const regex = /[^.!?।]+[.!?।]+/g;
  const sentences = text.match(regex) ?? [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max) {
      if (cur) chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

export function StoryAudio({ storyText }: StoryAudioProps) {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(0.95);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);

  // Load voices (asynchronously)
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      const eng = v.find(v => v.lang.startsWith('en')) ?? v[0];
      setSelectedVoice(eng);
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelSpeech();
  }, []);

  // Queue preparation when story changes
  useEffect(() => {
    cancelSpeech();
    if (storyText) {
      queueRef.current = splitIntoChunks(storyText);
    } else {
      queueRef.current = [];
    }
  }, [storyText]);

  const cancelSpeech = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    utteranceRef.current = null;
  };

  const speakNext = () => {
    if (!queueRef.current.length) {
      setPlaying(false);
      return;
    }
    const txt = queueRef.current.shift()!;
    const u = new SpeechSynthesisUtterance(txt);
    utteranceRef.current = u;
    if (selectedVoice) u.voice = selectedVoice;
    u.rate = rate;
    u.onend = () => {
      if (!paused) speakNext();
    };
    u.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(u);
  };

  const handlePlay = () => {
    if (!storyText) return;
    cancelSpeech();
    setPlaying(true);
    setPaused(false);
    speakNext();
  };
  const handlePause = () => {
    window.speechSynthesis.pause();
    setPaused(true);
  };
  const handleResume = () => {
    window.speechSynthesis.resume();
    setPaused(false);
  };
  const handleStop = () => {
    cancelSpeech();
  };

  if (!supported) {
    return (
      <div className="p-4 text-sm text-red-600 bg-red-100 rounded">
        Your browser does not support the Web Speech API.
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 border border-studio-border rounded bg-studio-bg">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Voice selector */}
        <select
          className="border border-studio-border rounded px-2 py-1 text-sm"
          value={selectedVoice?.voiceURI ?? ''}
          onChange={e => {
            const v = voices.find(v => v.voiceURI === e.target.value);
            setSelectedVoice(v ?? null);
          }}
          disabled={voices.length === 0}
        >
          {voices.map(v => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>

        {/* Speed slider */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Speed</label>
          <input
            type="range"
            min={0.6}
            max={1.4}
            step={0.05}
            value={rate}
            onChange={e => setRate(parseFloat(e.target.value))}
            className="w-32"
          />
          <span className="text-sm">{rate.toFixed(2)}×</span>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handlePlay}
            disabled={playing && !paused}
            className="p-2 bg-studio-accent hover:bg-studio-accent/90 text-studio-bg rounded"
            title="Play"
          >
            <Play className="w-5 h-5" />
          </button>
          <button
            onClick={handlePause}
            disabled={!playing || paused}
            className="p-2 bg-studio-raised hover:bg-studio-accent/20 text-studio-text rounded"
            title="Pause"
          >
            <Pause className="w-5 h-5" />
          </button>
          <button
            onClick={handleResume}
            disabled={!paused}
            className="p-2 bg-studio-raised hover:bg-studio-accent/20 text-studio-text rounded"
            title="Resume"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleStop}
            disabled={!playing && !paused}
            className="p-2 bg-studio-raised hover:bg-studio-accent/20 text-studio-text rounded"
            title="Stop"
          >
            <SkipBack className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
