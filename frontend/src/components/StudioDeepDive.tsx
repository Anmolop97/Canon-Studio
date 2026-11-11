import { useState } from 'react';
import {
  BookMarked,
  ShieldAlert,
  Users,
  Calendar,
  Layers,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Check,
  Workflow
} from 'lucide-react';

export function StudioDeepDive() {
  // Layer 1 Tabs
  const [bibleTab, setBibleTab] = useState<'characters' | 'timeline' | 'graph'>('characters');

  // Layer 2 Interactive Node State
  const [currentNode, setCurrentNode] = useState<'start' | 'crypt' | 'tower'>('start');
  const [inventory, setInventory] = useState<string[]>(['Runic Key']);
  const [branchStat, setBranchStat] = useState<number>(100);

  // Layer 3 Audit Toggle
  const [resolvedIssue, setResolvedIssue] = useState<boolean>(false);

  const handleBranchChoice = (node: 'crypt' | 'tower', item: string, statDelta: number) => {
    setCurrentNode(node);
    if (!inventory.includes(item)) {
      setInventory(prev => [...prev, item]);
    }
    setBranchStat(prev => prev + statDelta);
  };

  const handleResetBranch = () => {
    setCurrentNode('start');
    setInventory(['Runic Key']);
    setBranchStat(100);
  };

  return (
    <div className="w-full space-y-16 sm:space-y-20 my-14 sm:my-20 font-sans">

      {/* ──────────────────────────────────────────────────────────
          LAYER 1: ASYMMETRIC LORE BINDER / ARCHIVAL CONSOLE
          (Enchanted Forest Palette: Warm Ivory + Deep Moss + Antique Gold)
         ────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto w-full max-w-[860px] overflow-hidden rounded-[34px_18px_34px_18px] max-sm:rounded-[24px_14px_24px_14px] border border-[#D7C397] dark:border-slate-700/80 bg-[#FAF9F3]/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl">
        {/* Top Binder Header Bar */}
        <div className="bg-[#F4F0E5] dark:bg-slate-800/90 border-b border-[#D7C397]/60 dark:border-slate-700 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-[#58745C] dark:text-sky-400" />
            <span className="text-xs font-mono uppercase font-bold tracking-wider text-[#263F35] dark:text-slate-200">
              Layer 1 &bull; Narrative Memory Foundation
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#E9E2CE] dark:bg-slate-700 text-[#101C19] dark:text-slate-200 border border-[#D7C397]/50">
            REF: #CANON-LORE-1888
          </span>
        </div>

        {/* Asymmetric Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px] md:min-h-[520px]">
          {/* Left Navigation Rail (35%) */}
          <div className="md:col-span-4 p-5 bg-[#F4F0E5]/60 dark:bg-slate-900/60 border-b md:border-b-0 md:border-r border-[#D7C397]/50 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#87977A] dark:text-slate-500 block mb-3">
              Index Catalog
            </span>

            <button
              onClick={() => setBibleTab('characters')}
              className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                bibleTab === 'characters'
                  ? 'bg-[#101C19] text-[#E9E2CE] dark:bg-sky-500 dark:text-slate-950 shadow-md font-bold'
                  : 'text-[#263F35] dark:text-slate-300 hover:bg-[#E9E2CE]/60 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Character Dossiers</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                bibleTab === 'characters' ? 'bg-white/20' : 'bg-[#E9E2CE] dark:bg-slate-700'
              }`}>2</span>
            </button>

            <button
              onClick={() => setBibleTab('timeline')}
              className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                bibleTab === 'timeline'
                  ? 'bg-[#101C19] text-[#E9E2CE] dark:bg-sky-500 dark:text-slate-950 shadow-md font-bold'
                  : 'text-[#263F35] dark:text-slate-300 hover:bg-[#E9E2CE]/60 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Timeline Chronology</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                bibleTab === 'timeline' ? 'bg-white/20' : 'bg-[#E9E2CE] dark:bg-slate-700'
              }`}>2 Events</span>
            </button>

            <button
              onClick={() => setBibleTab('graph')}
              className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                bibleTab === 'graph'
                  ? 'bg-[#101C19] text-[#E9E2CE] dark:bg-sky-500 dark:text-slate-950 shadow-md font-bold'
                  : 'text-[#263F35] dark:text-slate-300 hover:bg-[#E9E2CE]/60 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Entity Graph</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                bibleTab === 'graph' ? 'bg-white/20' : 'bg-[#E9E2CE] dark:bg-slate-700'
              }`}>4 Nodes</span>
            </button>

            <div className="pt-4 border-t border-[#D7C397]/50 dark:border-slate-800 text-[11px] text-[#87977A] dark:text-slate-400">
              <p>Active story continuity is locked. New chapters automatically inherit these entity parameters.</p>
            </div>
          </div>

          {/* Right Document Sheet (65%) */}
          <div className="md:col-span-8 p-6 sm:p-8 bg-[#FAF9F3] dark:bg-slate-900 flex flex-col justify-between">
            {bibleTab === 'characters' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl border border-[#D7C397]/70 dark:border-slate-800 bg-[#F4F0E5]/60 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-base text-[#101C19] dark:text-white">
                        Lord Douglas &bull; The Chrono-Archivist
                      </h4>
                      <span className="text-xs text-[#58745C] dark:text-sky-400 font-medium">Order of the Obsidian Clock</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#263F35] text-[#E9E2CE] dark:bg-emerald-500/20 dark:text-emerald-300 font-bold tracking-wide">LOCKED CANON</span>
                  </div>
                  <p className="text-xs text-[#263F35] dark:text-slate-300 leading-relaxed">
                    Carries an uncalibrated brass astrolabe. Never speaks of his brother’s disappearance in the 1888 Greenwich anomaly.
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-[#E9E2CE] dark:bg-slate-700 border border-[#D7C397]/60 dark:border-slate-600 text-[#101C19] dark:text-slate-300">Age: 44</span>
                    <span className="px-2 py-0.5 rounded bg-[#E9E2CE] dark:bg-slate-700 border border-[#D7C397]/60 dark:border-slate-600 text-[#101C19] dark:text-slate-300">Trait: Stoic</span>
                    <span className="px-2 py-0.5 rounded bg-[#FAF9F3] border border-[#C1A66B] text-[#C1A66B] font-semibold">Secret: Forbidden Paradigm</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#D7C397]/70 dark:border-slate-800 bg-[#F4F0E5]/60 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-base text-[#101C19] dark:text-white">
                        Mira Thorne &bull; The Syndicate Courier
                      </h4>
                      <span className="text-xs text-[#58745C] dark:text-sky-400 font-medium">Neo-Kashi Underbelly</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#263F35] text-[#E9E2CE] dark:bg-emerald-500/20 dark:text-emerald-300 font-bold tracking-wide">LOCKED CANON</span>
                  </div>
                  <p className="text-xs text-[#263F35] dark:text-slate-300 leading-relaxed">
                    Possesses neural cybernetics with memory sectors quarantined. Bound to deliver a sealed crypt-drive without viewing contents.
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-[#E9E2CE] dark:bg-slate-700 border border-[#D7C397]/60 dark:border-slate-600 text-[#101C19] dark:text-slate-300">Age: 27</span>
                    <span className="px-2 py-0.5 rounded bg-[#E9E2CE] dark:bg-slate-700 border border-[#D7C397]/60 dark:border-slate-600 text-[#101C19] dark:text-slate-300">Trait: Agile</span>
                    <span className="px-2 py-0.5 rounded bg-[#FAF9F3] border border-[#C1A66B] text-[#C1A66B] font-semibold">Item: Sub-Dermal Shunt</span>
                  </div>
                </div>
              </div>
            )}

            {bibleTab === 'timeline' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[#D7C397]/70 dark:border-slate-800 bg-[#F4F0E5]/60 dark:bg-slate-800/40">
                  <span className="text-xs font-mono font-bold text-[#C1A66B] dark:text-sky-400 shrink-0">1888 &bull; 02:14 AM</span>
                  <div>
                    <p className="text-xs font-semibold text-[#101C19] dark:text-white">The Greenwich Rift Event</p>
                    <p className="text-xs text-[#263F35] dark:text-slate-300 mt-0.5">Douglas witnesses time fractures along the Thames. Prime chronometer shatters into 3 fragments.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[#D7C397]/70 dark:border-slate-800 bg-[#F4F0E5]/60 dark:bg-slate-800/40">
                  <span className="text-xs font-mono font-bold text-[#C1A66B] dark:text-sky-400 shrink-0">1891 &bull; Chapter 3</span>
                  <div>
                    <p className="text-xs font-semibold text-[#101C19] dark:text-white">Descent into Whitechapel Crypts</p>
                    <p className="text-xs text-[#263F35] dark:text-slate-300 mt-0.5">Mira extracts the second shard; Douglas loses his left eye in the collapse (Eye patch canon established).</p>
                  </div>
                </div>
              </div>
            )}

            {bibleTab === 'graph' && (
              <div className="p-4 rounded-xl border border-[#D7C397]/70 dark:border-slate-800 bg-[#F4F0E5]/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-center gap-2.5 animate-in fade-in duration-200">
                <span className="px-3 py-1.5 rounded-lg bg-[#263F35] text-[#E9E2CE] text-xs font-semibold">Lord Douglas</span>
                <ChevronRight className="w-4 h-4 text-[#87977A]" />
                <span className="px-3 py-1.5 rounded-lg bg-[#FAF9F3] border border-[#D7C397] text-[#101C19] text-xs font-medium">Binds with &bull; Runic Key</span>
                <ChevronRight className="w-4 h-4 text-[#87977A]" />
                <span className="px-3 py-1.5 rounded-lg bg-[#58745C] text-[#E9E2CE] text-xs font-semibold">Unlocks &bull; Sunken Vault</span>
                <ChevronRight className="w-4 h-4 text-[#87977A]" />
                <span className="px-3 py-1.5 rounded-lg bg-[#FAF9F3] border border-[#C1A66B] text-[#C1A66B] text-xs font-bold">Guarded by &bull; Chrono-Wraith</span>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-[#D7C397]/50 dark:border-slate-800 flex items-center justify-between text-xs text-[#87977A] dark:text-slate-400">
              <span>Continuity Guard Status:</span>
              <span className="font-semibold text-[#263F35] dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#58745C]" /> 100% In-Sync With Scene Generator
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          LAYER 2: OPEN FLOATING NODE GRAPH
          (Enchanted Forest: Zero Outer Box, Antique Gold SVG Lines, Ivory Floating Nodes)
         ────────────────────────────────────────────────────────── */}
      <section className="relative py-4">
        {/* Section Title Pill */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F4F0E5]/90 dark:bg-sky-400/10 backdrop-blur-md border border-[#D7C397] dark:border-slate-700 text-xs font-semibold text-[#101C19] dark:text-sky-300 mb-1.5 shadow-xs">
              <Workflow className="w-3.5 h-3.5 text-[#58745C] dark:text-sky-400" />
              <span>Layer 2 &bull; Interactive Branching Engine</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#101C19] dark:text-white">
              Branching Decision Tree &amp; State Canvas
            </h3>
            <p className="text-xs sm:text-sm text-[#263F35] dark:text-slate-300 mt-0.5">
              Open node map floating directly on the mountain landscape with real-time state routing.
            </p>
          </div>

          <button
            onClick={handleResetBranch}
            className="px-4 py-1.5 text-xs font-bold text-[#101C19] dark:text-slate-300 hover:bg-[#E9E2CE] bg-[#FAF9F3]/90 dark:bg-slate-800/80 backdrop-blur-md border border-[#D7C397] dark:border-slate-700 rounded-full cursor-pointer transition-all shadow-xs"
          >
            Reset Node Demo
          </button>
        </div>

        {/* Floating Node Hierarchy with SVG Connectors */}
        <div className="relative flex flex-col items-center max-w-3xl mx-auto">
          {/* Top Root Node */}
          <div className={`relative z-10 w-full max-w-md p-5 rounded-2xl backdrop-blur-xl border transition-all ${
            currentNode === 'start'
              ? 'bg-[#FAF9F3]/95 dark:bg-slate-900/95 border-[#C1A66B] dark:border-sky-400 shadow-xl ring-2 ring-[#C1A66B]/20'
              : 'bg-[#FAF9F3]/80 dark:bg-slate-900/70 border-[#D7C397] dark:border-slate-700 shadow-md'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold text-[#87977A] dark:text-slate-500 uppercase tracking-wider">
                ROOT NODE &bull; ACT I
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E9E2CE] dark:bg-slate-800 font-bold text-[#101C19] dark:text-slate-300 border border-[#D7C397]/50">
                The Crossroad of Ash
              </span>
            </div>
            <p className="text-xs text-[#263F35] dark:text-slate-200 leading-relaxed mb-3">
              Rain douses the cobblestone. Two divergent paths lie open before Douglas.
            </p>
            {currentNode === 'start' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleBranchChoice('crypt', 'Submerged Relic', -15)}
                  className="p-2.5 rounded-xl bg-[#101C19] hover:bg-[#263F35] text-[#E9E2CE] text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer text-left flex items-center justify-between border border-[#D7C397]/40"
                >
                  <span>1. Submerged Crypt</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#C1A66B]" />
                </button>
                <button
                  onClick={() => handleBranchChoice('tower', 'Warden Telescope', 20)}
                  className="p-2.5 rounded-xl bg-[#FAF9F3] hover:bg-[#F4F0E5] text-[#101C19] border border-[#D7C397] text-xs font-bold transition-all shadow-xs active:scale-[0.98] cursor-pointer text-left flex items-center justify-between"
                >
                  <span>2. Signal Spire</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#58745C]" />
                </button>
              </div>
            )}
          </div>

          {/* SVG Connector Lines in Antique Gold */}
          <div className="w-full h-12 flex justify-center relative pointer-events-none">
            <svg className="w-full max-w-lg h-full overflow-visible" preserveAspectRatio="none">
              <path
                d="M 50% 0 L 50% 24 L 25% 24 L 25% 48"
                fill="none"
                stroke="#C1A66B"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                className="opacity-80"
              />
              <path
                d="M 50% 0 L 50% 24 L 75% 24 L 75% 48"
                fill="none"
                stroke="#C1A66B"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                className="opacity-80"
              />
            </svg>
          </div>

          {/* Bottom Dual Branch Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Branch A Node */}
            <div className={`p-5 rounded-2xl backdrop-blur-xl border transition-all ${
              currentNode === 'crypt'
                ? 'bg-[#FAF9F3]/95 dark:bg-slate-900/95 border-[#C1A66B] dark:border-sky-400 shadow-xl ring-2 ring-[#C1A66B]/20'
                : 'bg-[#FAF9F3]/70 dark:bg-slate-900/60 border-[#D7C397]/60 dark:border-slate-800 opacity-70'
            }`}>
              <span className="text-[10px] font-mono font-bold text-[#87977A] uppercase block mb-1">
                BRANCH 2A &bull; CATACOMBS
              </span>
              <h4 className="font-serif font-bold text-sm text-[#101C19] dark:text-white mb-1.5">
                The Flooded Altar
              </h4>
              <p className="text-xs text-[#263F35] dark:text-slate-300 leading-relaxed mb-2">
                Recovers the <span className="font-semibold text-[#58745C]">Submerged Relic</span>. Cold drains stamina.
              </p>
              {currentNode === 'crypt' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#263F35] bg-[#E9E2CE] px-2.5 py-0.5 rounded-full border border-[#D7C397]">
                  <Check className="w-3.5 h-3.5 text-[#58745C]" /> Canon State Active
                </span>
              )}
            </div>

            {/* Branch B Node */}
            <div className={`p-5 rounded-2xl backdrop-blur-xl border transition-all ${
              currentNode === 'tower'
                ? 'bg-[#FAF9F3]/95 dark:bg-slate-900/95 border-[#C1A66B] dark:border-sky-400 shadow-xl ring-2 ring-[#C1A66B]/20'
                : 'bg-[#FAF9F3]/70 dark:bg-slate-900/60 border-[#D7C397]/60 dark:border-slate-800 opacity-70'
            }`}>
              <span className="text-[10px] font-mono font-bold text-[#87977A] uppercase block mb-1">
                BRANCH 2B &bull; SIGNAL SPIRE
              </span>
              <h4 className="font-serif font-bold text-sm text-[#101C19] dark:text-white mb-1.5">
                The Watcher’s Eyrie
              </h4>
              <p className="text-xs text-[#263F35] dark:text-slate-300 leading-relaxed mb-2">
                Obtains the <span className="font-semibold text-[#58745C]">Warden Telescope</span>. Rallies airship garrison.
              </p>
              {currentNode === 'tower' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#263F35] bg-[#E9E2CE] px-2.5 py-0.5 rounded-full border border-[#D7C397]">
                  <Check className="w-3.5 h-3.5 text-[#58745C]" /> Canon State Active
                </span>
              )}
            </div>
          </div>

          {/* Floating Pill Ribbon HUD */}
          <div className="mt-6 px-6 py-3 rounded-full bg-[#FAF9F3]/95 dark:bg-slate-900/90 backdrop-blur-xl border border-[#D7C397] dark:border-slate-700 shadow-lg flex items-center justify-between gap-4 text-xs w-full max-w-xl">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#87977A] uppercase text-[10px] tracking-wider">Inventory:</span>
              <div className="flex flex-wrap gap-1">
                {inventory.map(item => (
                  <span key={item} className="px-2.5 py-0.5 rounded-full bg-[#E9E2CE] border border-[#D7C397]/70 text-[#101C19] font-semibold text-[11px]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#87977A] uppercase text-[10px] tracking-wider">Stamina:</span>
              <span className="font-mono font-bold text-[#101C19] bg-[#E9E2CE] px-2 py-0.5 rounded-md border border-[#D7C397]/70 text-xs">
                {branchStat} / 100
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          LAYER 3: EDITORIAL MANUSCRIPT DESK & AUDITOR HUD
          (Enchanted Forest: Warm White Parchment + Forest Green / Antique Gold HUD)
         ────────────────────────────────────────────────────────── */}
      <section className="relative rounded-2xl overflow-hidden border border-[#D7C397] dark:border-slate-700/80 shadow-2xl">
        {/* Top Editorial Toolbar in Forest Green */}
        <div className="bg-[#E9E2CE] text-[#263F35] px-6 py-3.5 flex items-center justify-between border-b border-[#D7C397]/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#C1A66B]" />
            <span className="text-xs font-mono uppercase font-bold tracking-wider">
              Layer 3 &bull; Manuscript Proofing &amp; Continuity Auditor
            </span>
          </div>
          <button
            onClick={() => setResolvedIssue(prev => !prev)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF9F3] hover:bg-[#F4F0E5] text-[#101C19] text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs border border-[#D7C397]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C1A66B]" />
            <span>{resolvedIssue ? 'Simulate Contradiction' : 'Apply AI Auto-Heal'}</span>
          </button>
        </div>

        {/* Dual-Pane Book Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left: Warm White Parchment Manuscript (7 Columns) */}
          <div className="lg:col-span-7 p-6 sm:p-10 bg-[#FAF9F3] dark:bg-slate-950 font-serif text-[#101C19] dark:text-slate-100 leading-relaxed border-b lg:border-b-0 lg:border-r border-[#D7C397]/60 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D7C397]/40 dark:border-slate-800 text-[11px] font-sans uppercase tracking-widest text-[#87977A]">
              <span>Chapter 4: The Clockwork Conclave</span>
              <span>Page 118</span>
            </div>

            <p className="text-sm">
              Lord Douglas entered the amphitheater, his dark velvet coat dusted with soot from the eastern foundry. His gaze remained steady as the conclave murmured in unsettled cadence.
            </p>

            <div className={`p-3.5 rounded-xl border transition-all font-sans text-xs ${
              resolvedIssue
                ? 'bg-[#E9E2CE]/60 border-[#58745C] text-[#263F35]'
                : 'bg-[#F4F0E5] border-[#C1A66B] text-[#101C19] shadow-sm ring-1 ring-[#C1A66B]/30'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold uppercase ${
                  resolvedIssue ? 'text-[#58745C]' : 'text-[#C1A66B]'
                }`}>
                  {resolvedIssue ? '✓ RECONCILED CANON PASSAGE' : '⚠️ FLAGGED INCONSISTENCY'}
                </span>
                <span className="text-[10px] font-mono text-[#87977A]">Line 42</span>
              </div>
              <p className="font-serif text-sm italic leading-normal">
                {resolvedIssue ? (
                  <span>
                    &ldquo;He gestured with his left gauntlet, the mechanical brass prosthetic on his severed right shoulder glinting under the gaslight.&rdquo;
                  </span>
                ) : (
                  <span>
                    &ldquo;He pointed with his right hand, the signet ring catching the torchlight as he reached for the parchment.&rdquo;
                  </span>
                )}
              </p>
            </div>

            <p className="text-sm">
              The Grand Prelate rose from his seat, demanding to know what had transpired in the Whitechapel sewers when the rift first opened.
            </p>
          </div>

          {/* Right: Sleek Auditor HUD Sidebar in Deep Moss (5 Columns) */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-[#E5E8DA] text-[#263F35] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D7C397]/30">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#68785D]">
                  Continuous Triage HUD
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  resolvedIssue ? 'bg-[#58745C] text-[#FAF9F3] border border-[#58745C]' : 'bg-[#FAF9F3] text-[#263F35] border border-[#C1A66B]'
                }`}>
                  {resolvedIssue ? '0 Contradictions' : '1 Violation Found'}
                </span>
              </div>

              {resolvedIssue ? (
                <div className="p-4 rounded-xl bg-[#F3F1E6] border border-[#B6C0A5] text-[#263F35] text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#263F35]">
                    <Check className="w-4 h-4 text-[#58745C]" />
                    <span>Canon Integrity Verified</span>
                  </div>
                  <p className="text-xs text-[#52634F] leading-relaxed">
                    Right arm amputation in Chapter 2, Scene 3 respected. Manuscript aligns 100% with the world story bible.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F8F1DF] border border-[#C1A66B]/70 text-[#263F35] text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#8A6A2F]">
                    <AlertTriangle className="w-4 h-4 text-[#B8954B]" />
                    <span>Physical Continuity Paradox</span>
                  </div>
                  <p className="text-xs text-[#52634F] leading-relaxed">
                    In <strong>Chapter 2, Scene 3</strong>, Douglas lost his right arm during the sewer collapse. The manuscript depicts him pointing with his right hand.
                  </p>
                  <p className="text-[11px] font-mono text-[#8A6A2F]">
                    Action: Toggle &ldquo;Apply AI Auto-Heal&rdquo; to insert prosthetic canon reconciliation.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#B6C0A5] text-xs text-[#687563] space-y-2">
              <div className="flex justify-between">
                <span>Verification Scope:</span>
                <span className="font-mono text-[#52634F]">Biometrics &amp; Timelines</span>
              </div>
              <div className="flex justify-between">
                <span>Export Standard:</span>
                <span className="font-mono text-[#263F35]">EPUB 3 / Formatted PDF / MD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default StudioDeepDive;
