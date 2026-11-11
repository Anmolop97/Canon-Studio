import { useState, useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { motion } from 'motion/react';
import { Header, type StudioTab } from './components/Header';
import { TabWriteStory } from './components/TabWriteStory';
import { TabChoosePath } from './components/TabChoosePath';
import { TabWriterMode } from './components/TabWriterMode';
import { TabBooks } from './components/TabBooks';
import { AuthModal } from './components/AuthModal';
import ErrorPage from './components/ui/error-3';
import { api } from './api';
import type { User } from './types';
import storybookLandscape from './assets/storybook-background.png';

export function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('wizard');
  const [_wizardStep, setWizardStep] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showError404, setShowError404] = useState(false);

  // Cross-tab transfer states
  const [preloadedBranchingPremise, setPreloadedBranchingPremise] = useState<{
    idea: string;
    genre: string;
    realism: string;
    language: string;
  } | null>(null);

  const [preloadedDraft, setPreloadedDraft] = useState<{
    title: string;
    genre: string;
    content: string;
    imageUrl?: string;
    imagePrompt?: string;
  } | null>(null);

  // Keep the warm parchment theme selected by the reader across visits.
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('canon_misty_theme') === 'dark';
  });

  // Apply theme class to <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('canon_misty_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Global Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  // Check auth session on startup
  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = api.getToken();
        if (token) {
          const res = await api.getMe();
          setCurrentUser(res.user);
        }
      } catch (_err) {
        // Token invalid or expired, clear
        api.logout();
        setCurrentUser(null);
      }
    };
    checkUser();
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    // If user was attempting to save a draft to writer mode, proceed to writer tab
    if (preloadedDraft) {
      setActiveTab('writer');
    }
  };

  // Cross-tab flow: "Play it as a choose-your-path story"
  const handlePlayBranching = (premise: { idea: string; genre: string; realism: string; language: string }) => {
    setPreloadedBranchingPremise(premise);
    setActiveTab('branching');
  };

  // Cross-tab flow: "Save to Writer mode"
  const handleSaveToWriter = (story: { title: string; genre: string; content: string; imageUrl?: string; imagePrompt?: string }) => {
    setPreloadedDraft(story);
    if (!currentUser) {
      setIsAuthModalOpen(true);
    } else {
      setActiveTab('writer');
    }
  };

  if (showError404) {
    return <ErrorPage onBack={() => setShowError404(false)} />;
  }

  return (
    <div className="relative min-h-screen bg-studio-bg text-studio-text flex flex-col font-sans transition-colors duration-200 overflow-x-clip">
      
      {/* Full-resolution Canva storybook landscape background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Layer 1: Smooth Panoramic Ken Burns Landscape Motion */}
        <motion.div
          animate={{
            scale: [1.015, 1.035, 1.015],
            x: ['0%', '0.35%', '0%'],
          }}
          transition={{
            duration: 36,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          className="absolute inset-[-4%] will-change-transform"
        >
          <img
            src={storybookLandscape}
            alt=""
          className="storybook-landscape h-full w-full object-cover object-center dark:opacity-75 opacity-100"
          />
        </motion.div>

        {/* Keep the reference artwork clear; only a subtle dark-mode veil. */}
        <div
          className="absolute inset-0 bg-transparent dark:bg-[#101810]/25"
        />
      </div>

      {/* Studio Header (Persistent across all tabs & wizard steps) */}
      <div id="studio-workspace" className="relative z-40">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
      </div>

      {/* Main Tab Content */}
      <main className="relative z-10 flex-1 w-full pb-16">
        {activeTab === 'wizard' && (
          <TabWriteStory
            onPlayBranching={handlePlayBranching}
            onSaveToWriter={handleSaveToWriter}
            onStepChange={setWizardStep}
            onNavigateTab={setActiveTab}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'branching' && (
          <TabChoosePath
            initialPremise={preloadedBranchingPremise}
            onNavigateTab={setActiveTab}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'writer' && (
          <TabWriterMode
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            preloadedDraft={preloadedDraft}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'books' && (
          <TabBooks
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigateTab={setActiveTab}
          />
        )}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
