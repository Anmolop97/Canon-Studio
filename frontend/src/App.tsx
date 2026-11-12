import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Header, type StudioTab } from './components/Header';
import { TabWriteStory } from './components/TabWriteStory';
import { TabChoosePath } from './components/TabChoosePath';
import { TabWriterMode } from './components/TabWriterMode';
import { TabBooks } from './components/TabBooks';
import { AuthModal } from './components/AuthModal';
import ErrorPage from './components/ui/error-3';
import { api } from './api';
import type { User } from './types';

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

  // Theme state: misty light default (Image 1 aesthetic)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Reset to pure light mode so all boxes are clean frosted white
    localStorage.removeItem('canon_misty_theme');
    return false;
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
      
      {/* Animated Misty Mountain Background (Watermelon UI with Ken Burns & Drifting Mist) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Layer 1: Smooth Panoramic Ken Burns Landscape Motion */}
        <motion.div
          animate={{
            scale: [1, 1.07, 1.03, 1],
            x: ['0%', '1.8%', '-1.5%', '0%'],
            y: ['0%', '-1.2%', '0.8%', '0%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          className="absolute inset-[-4%] will-change-transform"
        >
          <img
            src="https://assets.watermelon.sh/hero-10-bg.avif"
            alt=""
            className="h-full w-full object-cover object-center dark:opacity-40 opacity-90 contrast-[1.08] saturate-[1.05]"
          />
        </motion.div>

        {/* Layer 2: Drifting Ethereal Mist & Fog Wave */}
        <motion.div
          animate={{
            x: ['-25%', '25%', '-25%'],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-x-[-30%] top-[30%] h-[55%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.45)_0%,rgba(241,245,249,0.20)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08)_0%,rgba(30,41,59,0.18)_50%,transparent_75%)] blur-2xl will-change-transform pointer-events-none"
        />

        {/* Layer 3: Secondary Counter-Drifting Cloud Veil */}
        <motion.div
          animate={{
            x: ['20%', '-20%', '20%'],
            opacity: [0.25, 0.50, 0.25],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-x-[-20%] top-[15%] h-[40%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.35)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.3)_0%,transparent_70%)] blur-3xl will-change-transform pointer-events-none"
        />

        {/* Ambient Misty atmospheric gradient layers - crisp, non-milky depth */}
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.35)_0%,rgba(241,245,249,0.14)_35%,rgba(226,232,240,0.08)_65%,rgba(226,232,240,0.55)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,13,22,0.78)_0%,rgba(9,13,22,0.50)_35%,rgba(9,13,22,0.30)_65%,rgba(9,13,22,0.85)_100%)]"
        />
        <div
          className="absolute inset-x-0 top-0 h-[45%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.10)_50%,transparent_80%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.55)_0%,rgba(15,23,42,0.20)_50%,transparent_80%)]"
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
