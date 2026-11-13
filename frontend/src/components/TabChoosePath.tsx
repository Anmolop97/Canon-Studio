import { useState, useEffect, type FormEvent } from 'react';
import { api, triggerDownload } from '../api';
import type { BranchOption } from '../types';
import {
  Compass,
  Zap,
  Shield,
  HelpCircle,
  Copy,
  Check,
  Download,
  RotateCcw,
  ArrowRight,
  GitBranch,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Hero10 } from './ui/hero-10';

interface TabChoosePathProps {
  initialPremise?: {
    idea: string;
    genre: string;
    realism: string;
    language: string;
  } | null;
  onNavigateTab?: (tab: 'wizard' | 'branching' | 'writer' | 'books') => void;
  onOpenAuth?: () => void;
  currentUser?: { displayName: string } | null;
}

interface PathNode {
  id: string;
  sceneNumber: number;
  content: string;
  isEnding: boolean;
  options: BranchOption[];
  activeLoreAnchors?: Array<{ id: string; label: string; detail: string }>;
  styleTone?: string;
  choiceTaken?: string;
  parentId?: string | null;
}

export function TabChoosePath({
  initialPremise,
  onNavigateTab: _onNavigateTab,
  onOpenAuth: _onOpenAuth,
  currentUser: _currentUser
}: TabChoosePathProps) {
  // Setup screen vs Active story screen
  const [inGame, setInGame] = useState(false);
  const [idea, setIdea] = useState(initialPremise?.idea || 'A stranded courier discovers their cargo has an organic heartbeat.');
  const [genre, setGenre] = useState(initialPremise?.genre || 'Sci-fi');
  const [realism, setRealism] = useState(initialPremise?.realism || 'Real life with a twist');
  const [language, setLanguage] = useState(initialPremise?.language || 'English');
  const [maxDecisions, setMaxDecisions] = useState<number>(3); // 3, 5, or 8

  // Interactive Tree & Story State
  const [allNodes, setAllNodes] = useState<Map<string, PathNode>>(new Map());
  const [currentNodeId, setCurrentNodeId] = useState<string>('');
  const [activePathIds, setActivePathIds] = useState<string[]>([]);
  const [exploredChoiceTexts, setExploredChoiceTexts] = useState<Set<string>>(new Set());

  // Input & loading states
  const [customActionText, setCustomActionText] = useState('');
  const [loadingNext, setLoadingNext] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isIllustratingClimax, setIsIllustratingClimax] = useState(false);
  const [climaxArt, setClimaxArt] = useState<{ imageUrl: string; imagePrompt: string } | null>(null);

  useEffect(() => {
    if (initialPremise) {
      if (initialPremise.idea) setIdea(initialPremise.idea);
      if (initialPremise.genre) setGenre(initialPremise.genre);
      if (initialPremise.realism) setRealism(initialPremise.realism);
      if (initialPremise.language) setLanguage(initialPremise.language);
    }
  }, [initialPremise]);

  const handleStartGame = async () => {
    setLoadingNext(true);
    setErrorMessage(null);
    try {
      const scene1 = await api.startBranching({
        idea,
        genre,
        realism,
        language,
        characterSheet: idea,
        worldLore: [],
        styleTone: `${genre} · ${realism} · cinematic, character-led prose`,
        maxDecisions
      });

      const initialMap = new Map<string, PathNode>();
      const node: PathNode = {
        id: scene1.id,
        sceneNumber: 1,
        content: scene1.sceneContent || scene1.content,
        isEnding: false,
        options: scene1.options,
        activeLoreAnchors: scene1.activeLoreAnchors,
        styleTone: scene1.styleTone,
        parentId: null
      };

      initialMap.set(node.id, node);
      setAllNodes(initialMap);
      setCurrentNodeId(node.id);
      setActivePathIds([node.id]);
      setExploredChoiceTexts(new Set());
      setInGame(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start branching story.');
    } finally {
      setLoadingNext(false);
    }
  };

  const currentNode = allNodes.get(currentNodeId);

  // Compute active path history from root to current node
  const getPathHistory = (targetNodeId: string): PathNode[] => {
    const path: PathNode[] = [];
    let curr: PathNode | undefined = allNodes.get(targetNodeId);
    while (curr) {
      path.unshift(curr);
      curr = curr.parentId ? allNodes.get(curr.parentId) : undefined;
    }
    return path;
  };

  const handleSelectOption = async (chosenText: string) => {
    if (!currentNode) return;
    setLoadingNext(true);
    setErrorMessage(null);

    // Mark choice as explored
    setExploredChoiceTexts(prev => new Set(prev).add(chosenText));

    const currentHistory = getPathHistory(currentNodeId);
    const storySoFar = currentHistory.map(n => n.content);
    const decisionIndex = currentHistory.length; // 1-based current decisions count

    try {
      const nextScene = await api.nextBranchScene({
        storySoFar,
        chosenOptionText: chosenText,
        decisionIndex,
        maxDecisions,
        genre,
        language,
        idea,
        realism,
        characterSheet: idea,
        worldLore: [],
        styleTone: `${genre} · ${realism} · cinematic, character-led prose`
      });

      const newNodeId = `scene-${nextScene.sceneNumber}-${Date.now().toString(36)}`;
      const newNode: PathNode = {
        id: newNodeId,
        sceneNumber: nextScene.sceneNumber,
        content: nextScene.sceneContent || nextScene.content,
        isEnding: nextScene.isEnding,
        options: nextScene.options,
        activeLoreAnchors: nextScene.activeLoreAnchors,
        styleTone: nextScene.styleTone,
        choiceTaken: chosenText,
        parentId: currentNodeId
      };

      setAllNodes(prev => {
        const nextMap = new Map(prev);
        nextMap.set(newNodeId, newNode);
        return nextMap;
      });

      setCurrentNodeId(newNodeId);
      setActivePathIds(prev => [...prev, newNodeId]);
      setCustomActionText('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate next scene.');
    } finally {
      setLoadingNext(false);
    }
  };

  const handleCustomActionSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (customActionText.trim()) {
      handleSelectOption(customActionText.trim());
    }
  };

  // Click on any tree node to jump back to that point in the story
  const handleJumpToNode = (nodeId: string) => {
    if (!allNodes.has(nodeId)) return;
    setCurrentNodeId(nodeId);
    const newPath = getPathHistory(nodeId).map(n => n.id);
    setActivePathIds(newPath);
  };

  const activePathNodes = currentNodeId ? getPathHistory(currentNodeId) : [];

  const handleCopyPath = () => {
    const text = activePathNodes
      .map(
        (n) =>
          `SCENE ${n.sceneNumber}${n.isEnding ? ' (ENDING)' : ''}\n${
            n.choiceTaken ? `Choice made: ${n.choiceTaken}\n\n` : ''
          }${n.content}`
      )
      .join('\n\n----------------------------------------\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJourney = async () => {
    try {
      const journey = {
        storyTitle: idea.slice(0, 50),
        genre,
        scenes: activePathNodes.map((n) => ({
          decisionIndex: n.sceneNumber,
          sceneText: n.content,
          chosenOption: n.choiceTaken
        }))
      };
      const res = await api.exportBranchingJourney(journey);
      triggerDownload(res.content, res.filename, res.mimeType);
    } catch {
      handleDownloadPath();
    }
  };

  const handleDownloadPath = () => {
    const text = `# Interactive Branching Story: ${genre}\nPremise: ${idea}\nDecisions: ${maxDecisions}\n\n` +
      activePathNodes
        .map(
          (n) =>
            `## Scene ${n.sceneNumber}${n.isEnding ? ' [ENDING]' : ''}\n${
              n.choiceTaken ? `> Chosen Path: ${n.choiceTaken}\n\n` : ''
            }${n.content}`
        )
        .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `branching_story_path_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleIllustrateClimax = async () => {
    if (!currentNode) return;
    setIsIllustratingClimax(true);
    try {
      const art = await api.illustrateBranchScene(currentNode.content, idea, genre);
      setClimaxArt(art);
    } catch (err) {
      console.error('Climax art error:', err);
    } finally {
      setIsIllustratingClimax(false);
    }
  };

  // Icon mapping for option types
  const getOptionIcon = (type: 'bold' | 'careful' | 'unexpected') => {
    switch (type) {
      case 'bold':
        return <Zap className="w-4 h-4 text-studio-accent" />;
      case 'careful':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'unexpected':
        return <HelpCircle className="w-4 h-4 text-purple-400" />;
    }
  };

  // --- PRE-GAME SETUP SCREEN (RENDERED IN HERO 10 WITH MISTY MOUNTAIN THEME) ---
  if (!inGame) {
    return (
      <Hero10
        hideHeader={true}
        brandName="Canon Studio"
        navItems={[
          { label: "Write a Story", href: "#", onClick: () => _onNavigateTab?.('wizard'), isActive: false },
          { label: "Choose Your Path", href: "#", onClick: () => _onNavigateTab?.('branching'), isActive: true },
          { label: "Writer Mode", href: "#", onClick: () => _onNavigateTab?.('writer'), isActive: false },
          { label: "Community Books", href: "#", onClick: () => _onNavigateTab?.('books'), isActive: false },
        ]}
        ctaText={_currentUser ? _currentUser.displayName : "Sign in"}
        onCtaClick={_onOpenAuth}
        eyebrowText="Dynamic Branching Multiverse"
        title={"Choose Your Path\nShape The Narrative"}
        description={"Every choice branches the story tree into uncharted territory.\nMake tactical decisions and illustrate the climax in 16:9 cinematic concept art."}
        usersText="Over 20k active users"
      >
        <div className="bg-[#f8f1df]/48 dark:bg-[#1d2921]/48 backdrop-blur-2xl border border-white/55 dark:border-white/15 shadow-[0_24px_70px_rgba(41,55,43,0.2),inset_0_1px_0_rgba(255,255,255,0.62)] rounded-[28px] p-6 sm:p-8 text-left max-w-2xl w-full mx-auto text-[#101C19] dark:text-white space-y-5 transition-all">
          {errorMessage && (
            <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="font-bold">✕</button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#58745C] dark:text-sky-400 uppercase tracking-wider mb-2">
              Story Seed / Central Premise
            </label>
            <textarea
              rows={3}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe the initial situation or mystery..."
              className="w-full bg-[#F4F0E5] dark:bg-slate-800 border border-[#D7C397] dark:border-slate-700 rounded-xl p-3.5 text-sm text-[#101C19] dark:text-white placeholder:text-[#87977A] focus:outline-none focus:ring-2 focus:ring-[#101C19] leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#58745C] dark:text-sky-400 uppercase tracking-wider mb-2">
                Genre
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-[#F4F0E5] dark:bg-slate-800 border border-[#D7C397] dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-[#101C19] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#101C19] min-h-[44px]"
              >
                <option value="Sci-fi">Sci-fi</option>
                <option value="Thriller">Thriller</option>
                <option value="Horror">Horror</option>
                <option value="Mystery">Mystery</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Romantic">Romantic</option>
                <option value="Delulu">Delulu</option>
                <option value="Comedy">Comedy</option>
                <option value="Adventure">Adventure</option>
                <option value="Dark twist">Dark twist</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#58745C] dark:text-sky-400 uppercase tracking-wider mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#F4F0E5] dark:bg-slate-800 border border-[#D7C397] dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-[#101C19] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#101C19] min-h-[44px]"
              >
                <option value="English">English</option>
                <option value="Hinglish (Hindi in Roman letters)">Hinglish (Roman Hindi)</option>
                <option value="Hindi (Devanagari)">Hindi (Devanagari)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#58745C] dark:text-sky-400 uppercase tracking-wider mb-2">
              Decisions Before Climactic Ending
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[3, 5, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxDecisions(num)}
                  className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                    maxDecisions === num
                      ? 'bg-[#101C19] text-[#E9E2CE] border-[#101C19] shadow-sm font-bold'
                      : 'bg-[#FAF9F3] border-[#D7C397] text-[#101C19] hover:bg-[#E9E2CE]'
                  }`}
                >
                  <div className="text-sm font-serif font-bold">{num} Decisions</div>
                  <div className="text-[10px] opacity-80">
                    {num === 3 ? '~500 words' : num === 5 ? '~900 words' : '~1,400 words'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={loadingNext || !idea.trim()}
            className="w-full bg-[#101C19] hover:bg-[#263F35] disabled:opacity-50 text-[#E9E2CE] font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 min-h-[46px] cursor-pointer shadow-md"
          >
            {loadingNext ? (
              <span className="animate-pulse">Authoring Scene 1...</span>
            ) : (
              <>
                <Compass className="w-4 h-4" />
                <span>Begin Interactive Journey →</span>
              </>
            )}
          </button>
        </div>
      </Hero10>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 md:py-10">
      
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-studio-muted">
            <Compass className="w-4 h-4 text-studio-accent" />
            <span>Interactive Branching Story (No Login Needed)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-studio-text mt-1">
            Choose Your Path
          </h1>
        </div>

        {inGame && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPath}
              className="flex items-center gap-1.5 px-3 py-2 bg-studio-card hover:bg-studio-raised border border-studio-border text-studio-text rounded text-xs min-h-[44px]"
              title="Copy active narrative path"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-status-consistent" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy this path'}</span>
            </button>
            <button
              onClick={handleExportJourney}
              className="flex items-center gap-1.5 px-3 py-2 bg-studio-card hover:bg-studio-raised border border-studio-border text-studio-text rounded text-xs min-h-[44px]"
              title="Export Branching Journey Log as Markdown"
            >
              <Download className="w-3.5 h-3.5 text-studio-accent" />
              <span>Export Log (.md)</span>
            </button>
            <button
              onClick={handleDownloadPath}
              className="flex items-center gap-1.5 px-3 py-2 bg-studio-card hover:bg-studio-raised border border-studio-border text-studio-text rounded text-xs min-h-[44px]"
              title="Save path as text file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.txt</span>
            </button>
            <button
              onClick={() => setInGame(false)}
              className="flex items-center gap-1.5 px-3 py-2 bg-studio-raised hover:bg-studio-accent/20 border border-studio-border text-xs text-studio-muted hover:text-studio-text rounded min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Setup</span>
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-950/40 border border-status-contradiction rounded flex items-center justify-between text-sm text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-contradiction flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-3 py-1 bg-studio-raised border border-studio-border text-xs rounded hover:bg-studio-accent/20"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* --- ACTIVE IN-GAME SCREEN: STORY PROSE + LIVE BRANCH TREE --- */}
      {inGame && currentNode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: ACTIVE SCENE PROSE & DECISION CARDS (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Active Scene Card */}
            <div className="bg-studio-card border border-studio-border rounded-lg p-6 md:p-8 relative">
              <div className="flex items-center justify-between text-xs font-semibold text-studio-muted uppercase tracking-wider mb-3">
                <span>
                  {currentNode.isEnding ? (
                    <span className="text-studio-accent flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-status-consistent" />
                      Climactic Final Resolution
                    </span>
                  ) : (
                    `Scene ${currentNode.sceneNumber} of ${maxDecisions + 1}`
                  )}
                </span>
                <span>
                  {currentNode.content.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              {currentNode.choiceTaken && (
                <div className="mb-4 p-3 bg-studio-raised/60 border-l-2 border-studio-accent rounded-r text-xs text-studio-muted italic">
                  <span className="font-semibold text-studio-accent not-italic">You chose: </span>
                  &ldquo;{currentNode.choiceTaken}&rdquo;
                </div>
              )}

              {/* Scene Narrative Prose */}
              <div className="font-serif text-base sm:text-lg text-studio-text leading-relaxed whitespace-pre-line mb-6">
                {currentNode.content}
              </div>

              {(currentNode.styleTone || currentNode.activeLoreAnchors?.length) && (
                <aside className="mb-6 rounded-lg border border-studio-border bg-studio-raised/50 px-4 py-3" aria-label="AI adaptation context">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-studio-accent">Adapted to your story</h3>
                    {currentNode.styleTone && <span className="text-xs text-studio-muted">Tone: {currentNode.styleTone}</span>}
                  </div>
                  {currentNode.activeLoreAnchors && currentNode.activeLoreAnchors.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {currentNode.activeLoreAnchors.map(anchor => (
                        <li key={anchor.id} title={anchor.detail} className="rounded-full border border-studio-border px-2.5 py-1 text-[10px] text-studio-muted">
                          {anchor.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </aside>
              )}

              {/* End of story resolution or Decision choices */}
              {currentNode.isEnding ? (
                <div className="p-4 bg-studio-raised border border-studio-border rounded-md text-center space-y-3">
                  <div className="font-serif font-bold text-lg text-studio-accent">
                    The End of This Narrative Thread
                  </div>
                  <p className="text-xs text-studio-muted max-w-md mx-auto">
                    You have reached a final resolution reflecting the {activePathNodes.length - 1} critical decisions you made along this path. You can jump back to any scene in the tree to explore alternative futures.
                  </p>

                  {/* Climax Scene Concept Art Banner */}
                  {climaxArt && (
                    <div className="relative rounded-lg overflow-hidden border border-studio-border my-4 bg-black/40 shadow-xl max-w-xl mx-auto">
                      <img
                        src={climaxArt.imageUrl}
                        alt={climaxArt.imagePrompt}
                        className="w-full h-52 sm:h-64 object-cover"
                        loading="lazy"
                      />
                      <div className="p-2.5 bg-studio-card/95 border-t border-studio-border text-[11px] text-studio-muted italic text-left">
                        🎬 Climax Art: &ldquo;{climaxArt.imagePrompt}&rdquo;
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    {!climaxArt && (
                      <button
                        onClick={handleIllustrateClimax}
                        disabled={isIllustratingClimax}
                        className="px-4 py-2 bg-studio-raised hover:bg-studio-accent/20 border border-studio-border text-studio-accent font-bold text-xs rounded min-h-[44px] flex items-center gap-1.5"
                      >
                        {isIllustratingClimax ? (
                          <div className="w-3.5 h-3.5 border-2 border-studio-accent border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>🎨</span>
                        )}
                        <span>{isIllustratingClimax ? 'Generating Concept Art...' : 'Illustrate Climax Scene'}</span>
                      </button>
                    )}
                    <button
                      onClick={handleExportJourney}
                      className="px-4 py-2 bg-studio-accent text-studio-bg font-bold text-xs rounded min-h-[44px] flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Journey (.md)</span>
                    </button>
                    <button
                      onClick={handleCopyPath}
                      className="px-4 py-2 bg-studio-raised border border-studio-border text-studio-text font-bold text-xs rounded min-h-[44px]"
                    >
                      Copy Full Story
                    </button>
                    <button
                      onClick={() => setInGame(false)}
                      className="px-4 py-2 bg-studio-raised border border-studio-border text-studio-text text-xs rounded min-h-[44px]"
                    >
                      Start New Journey
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-studio-muted uppercase tracking-wider mb-3">
                    What does the protagonist do next? Choose a path:
                  </div>

                  {/* 3 Explicit Direction Choices */}
                  <div className="space-y-3 mb-5">
                    {currentNode.options.map((opt) => {
                      const isExplored = exploredChoiceTexts.has(opt.text);
                      return (
                        <button
                          key={opt.id}
                          disabled={loadingNext}
                          onClick={() => handleSelectOption(opt.text)}
                          className={`w-full p-4 rounded border text-left transition-all min-h-[56px] flex items-start gap-3 ${
                            isExplored
                              ? 'bg-studio-raised/40 border-studio-border/60 text-studio-muted'
                              : 'bg-studio-raised hover:bg-studio-raised/80 hover:border-studio-accent border-studio-border text-studio-text'
                          }`}
                        >
                          <div className="mt-0.5 p-1 bg-studio-card border border-studio-border rounded flex-shrink-0">
                            {getOptionIcon(opt.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-studio-accent">
                                [{opt.type}]
                              </span>
                              {isExplored && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-bg text-studio-muted">
                                  Already explored
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-medium mt-0.5">
                              {opt.text}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-studio-muted mt-1 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Free-text "Or do something else" Box */}
                  <div className="p-3 bg-studio-raised border border-studio-border rounded-md">
                    <div className="text-xs font-semibold text-studio-muted uppercase tracking-wider mb-2">
                      Or do something else:
                    </div>
                    <form onSubmit={handleCustomActionSubmit} className="flex gap-2">
                      <input
                        type="text"
                        disabled={loadingNext}
                        value={customActionText}
                        onChange={(e) => setCustomActionText(e.target.value)}
                        placeholder="Type an unscripted action or creative maneuver..."
                        className="flex-1 bg-studio-bg border border-studio-border rounded px-3 py-2 text-sm text-studio-text focus:border-studio-accent focus:ring-1 focus:ring-studio-accent min-h-[44px]"
                      />
                      <button
                        type="submit"
                        disabled={loadingNext || !customActionText.trim()}
                        className="px-4 py-2 bg-studio-accent hover:bg-studio-accent/90 disabled:opacity-50 text-studio-bg font-bold text-xs rounded transition-colors min-h-[44px]"
                      >
                        Execute
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {loadingNext && (
                <div className="absolute inset-0 bg-studio-card/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 rounded-lg z-10">
                  <div className="w-8 h-8 border-2 border-studio-accent border-t-transparent rounded-full animate-spin" />
                  <div className="font-serif text-sm text-studio-muted">
                    Weaving consequences and drafting next scene...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE INTERACTIVE NARRATIVE TREE (4 cols) */}
          <div className="lg:col-span-4 bg-studio-card border border-studio-border rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-studio-border mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-studio-accent" />
                <h3 className="font-serif font-bold text-sm text-studio-text">
                  Live Narrative Tree
                </h3>
              </div>
              <span className="text-[11px] text-studio-muted">
                {allNodes.size} scenes recorded
              </span>
            </div>

            <p className="text-xs text-studio-muted mb-4">
              Click any node in the tree to jump back and branch in a new direction.
            </p>

            {/* Tree Map Representation */}
            <div className="space-y-3">
              {Array.from(allNodes.values()).map((node) => {
                const isCurrent = node.id === currentNodeId;
                const isInActivePath = activePathIds.includes(node.id);

                return (
                  <div
                    key={node.id}
                    onClick={() => handleJumpToNode(node.id)}
                    className={`p-3 rounded border text-left cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-studio-raised border-studio-accent ring-1 ring-studio-accent'
                        : isInActivePath
                        ? 'bg-studio-raised/60 border-studio-border hover:border-studio-accent'
                        : 'bg-studio-bg/40 border-studio-border/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {/* Circle for scene, Diamond for ending */}
                        {node.isEnding ? (
                          <div
                            className={`w-3.5 h-3.5 rotate-45 flex-shrink-0 ${
                              isCurrent
                                ? 'bg-studio-accent border border-studio-accent'
                                : 'bg-status-consistent/80 border border-status-consistent'
                            }`}
                            title="Story Ending"
                          />
                        ) : (
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                              isCurrent
                                ? 'bg-studio-accent ring-2 ring-studio-accent/40'
                                : isInActivePath
                                ? 'bg-blue-400'
                                : 'bg-studio-muted/40'
                            }`}
                            title="Scene Node"
                          />
                        )}

                        <span className={`text-xs font-semibold ${isCurrent ? 'text-studio-accent' : 'text-studio-text'}`}>
                          Scene {node.sceneNumber} {node.isEnding && '(Ending)'}
                        </span>
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-accent text-studio-bg font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-studio-muted line-clamp-2 pl-5">
                      {node.choiceTaken ? `After: "${node.choiceTaken}" — ` : ''}
                      {node.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-studio-border text-[11px] text-studio-muted space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-studio-accent" />
                <span>Amber = Current scene</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span>Blue = Active path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rotate-45 bg-status-consistent" />
                <span>Diamond = Ending scene</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
