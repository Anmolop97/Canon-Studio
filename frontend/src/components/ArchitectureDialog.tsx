import { useEffect } from 'react';
import { ArrowUpRight, BrainCircuit, Languages, Mic2, Network, X } from 'lucide-react';

interface ArchitectureDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const REPOSITORY_URL = 'https://github.com/Anmolop97/Canon-Studio';

export function ArchitectureDialog({ isOpen, onClose }: ArchitectureDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="architecture-dialog-title"
        aria-describedby="architecture-dialog-description"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#D7C397] bg-[#FAF9F3] p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c754a] dark:text-amber-400">Behind the story</p>
            <h2 id="architecture-dialog-title" className="mt-1 font-serif text-2xl font-bold text-[#17251e] dark:text-white">How Canon Studio adapts</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close architecture details" className="rounded-lg p-2 text-[#58745C] hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:text-slate-300 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p id="architecture-dialog-description" className="mt-3 text-sm leading-6 text-[#526156] dark:text-slate-300">
          Each generation request carries the creator’s story choices into a small lore-memory layer before the model writes.
        </p>

        <ol className="mt-5 space-y-3">
          <li className="flex gap-3 rounded-xl border border-[#D7C397]/60 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <Network className="mt-0.5 h-4 w-4 shrink-0 text-[#8c754a] dark:text-amber-400" />
            <div><strong className="text-sm text-[#17251e] dark:text-white">1. Creator input</strong><p className="mt-1 text-xs leading-5 text-[#68756a] dark:text-slate-400">The wizard or branching flow sends premise, character, setting, genre, and language to the Express API.</p></div>
          </li>
          <li className="flex gap-3 rounded-xl border border-[#D7C397]/60 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-[#8c754a] dark:text-amber-400" />
            <div><strong className="text-sm text-[#17251e] dark:text-white">2. Adaptation context</strong><p className="mt-1 text-xs leading-5 text-[#68756a] dark:text-slate-400">The backend assembles an active character sheet, relevant world/canon anchors, prior scene memory, and a style tone, then injects them into the system prompt.</p></div>
          </li>
          <li className="flex gap-3 rounded-xl border border-[#D7C397]/60 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <Languages className="mt-0.5 h-4 w-4 shrink-0 text-[#8c754a] dark:text-amber-400" />
            <div><strong className="text-sm text-[#17251e] dark:text-white">3. Language-aware generation</strong><p className="mt-1 text-xs leading-5 text-[#68756a] dark:text-slate-400">English, Hindi (Devanagari), and Hinglish (Roman Hindi) instructions are carried into generation, with provider failover handled by the backend.</p></div>
          </li>
          <li className="flex gap-3 rounded-xl border border-[#D7C397]/60 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <Mic2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8c754a] dark:text-amber-400" />
            <div><strong className="text-sm text-[#17251e] dark:text-white">4. Traceable result</strong><p className="mt-1 text-xs leading-5 text-[#68756a] dark:text-slate-400">The response returns the generated scene, active lore anchors, and selected tone so the interface can show the adaptation decisions. Narration uses browser speech synthesis.</p></div>
          </li>
        </ol>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#D7C397]/50 pt-4 dark:border-slate-700">
          <span className="text-xs text-[#68756a] dark:text-slate-400">React · Express · TypeScript · Groq / OpenRouter / Gemini</span>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-[#344d3a] hover:bg-black/5 dark:text-amber-300 dark:hover:bg-white/10">
            View source <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
