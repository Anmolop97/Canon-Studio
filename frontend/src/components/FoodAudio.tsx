import { useEffect, useRef, useState } from 'react';

interface FoodAudioProps {
  /**
   * Text to be spoken (e.g., food description or recipe).
   */
  text: string;
}

/**
 * Reusable TTS component for food‑related text.
 * Mirrors the functionality of StoryAudio but can be used independently.
 */
export function FoodAudio({ text }: FoodAudioProps) {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState<number>(0.95);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices on mount and when they change.
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      // Default to an English voice if available.
      const en = v.find((vo) => vo.lang.startsWith('en'));
      setSelectedVoice(en?.voiceURI || (v[0]?.voiceURI ?? ''));
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
    };
  }, []);

  // Split long text into ~200‑char chunks at sentence boundaries.
  const chunkText = (input: string): string[] => {
    if (!input) return [];
    const sentences = input.match(/[^.!?।]+[.!?।]?/g) || [];
    const chunks: string[] = [];
    let current = '';
    for (const s of sentences) {
      if ((current + s).length > 200) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks;
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setPlaying(false);
    setPaused(false);
  };

  const speak = () => {
    if (!supported) return;
    stopSpeech();
    const chunks = chunkText(text);
    const speakChunk = (i: number) => {
      if (i >= chunks.length) {
        setPlaying(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i]);
      const voice = voices.find((v) => v.voiceURI === selectedVoice);
      if (voice) u.voice = voice;
      u.rate = rate;
      u.onend = () => speakChunk(i + 1);
      u.onerror = () => setPlaying(false);
      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
    };
    setPlaying(true);
    speakChunk(0);
  };

  const pause = () => {
    if (playing && !paused) {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  const resume = () => {
    if (playing && paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    }
  };

  // Clean up on unmount or when text changes.
  useEffect(() => {
    return () => {
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) {
    return (
      <div className="p-2 text-sm text-red-600">
        Your browser does not support the Web Speech API.
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 p-2 border rounded-md bg-gray-50">
      <div className="flex items-center space-x-2">
        <button
          onClick={speak}
          disabled={playing && !paused}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Listen
        </button>
        <button
          onClick={pause}
          disabled={!playing || paused}
          className="px-3 py-1 bg-yellow-500 text-white rounded disabled:opacity-50"
        >
          Pause
        </button>
        <button
          onClick={resume}
          disabled={!playing || !paused}
          className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Resume
        </button>
        <button
          onClick={stopSpeech}
          disabled={!playing}
          className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
        >
          Stop
        </button>
      </div>
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">Voice:</label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="border rounded p-1"
        >
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">Speed:</label>
        <input
          type="range"
          min="0.6"
          max="1.4"
          step="0.05"
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          className="w-32"
        />
        <span className="text-sm">{rate.toFixed(2)}x</span>
      </div>
    </div>
  );
}
