import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header, type StudioTab } from './components/Header';
import { TabWriteStory } from './components/TabWriteStory';
import { TabChoosePath } from './components/TabChoosePath';
import { TabWriterMode } from './components/TabWriterMode';
import { TabBooks } from './components/TabBooks';
import { AuthModal } from './components/AuthModal';
import ErrorPage from './components/ui/error-3';
import { api } from './api';
import type { User } from './types';
import storybookLandscape from './assets/storybook-background.webp';

export function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('wizard');
  const [_wizardStep, setWizardStep] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showError404, setShowError404] = useState(false);
  const [apiLimitNotice, setApiLimitNotice] = useState<{ retryAfterSeconds: number | null } | null>(null);

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

  useEffect(() => {
    const showApiLimitNotice = (event: Event) => {
      const detail = (event as CustomEvent<{ retryAfterSeconds?: number | null }>).detail;
      setApiLimitNotice({ retryAfterSeconds: detail?.retryAfterSeconds ?? null });
    };
    window.addEventListener('canon:api-limit', showApiLimitNotice);
    return () => window.removeEventListener('canon:api-limit', showApiLimitNotice);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Check auth session on startup
  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await api.getMe();
        setCurrentUser(res.user);
      } catch (_err) {
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
      
      {/* Soft Ethereal Opening Dissolve Veil (Fades out gently on page open) */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 pointer-events-none z-[9999] bg-[#e8e1cf] dark:bg-[#0F172A]"
      />

      {/* Full-resolution Canva storybook landscape background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Layer 1: Smooth Panoramic Ken Burns Landscape Motion with Cinematic Entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 1.045 }}
          animate={{
            opacity: 1,
            scale: [1.02, 1.038, 1.02],
            x: ['0%', '0.35%', '0%'],
          }}
          transition={{
            opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 36, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
            x: { duration: 36, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
          }}
          className="absolute inset-[-4%] will-change-transform bg-cover bg-center"
          style={{
            backgroundImage: `url("data:image/webp;base64,UklGRsIAAABXRUJQVlA4ILYAAABwBACdASogABAAPu1iqk4ppaQiMAgBMB2JZACdAdwLgEYGH64CNMLwRgKegAD+471ObXLMh3SIKhlA9rQdb8njlg913jvatozfF0uQwORhnLFTOA35WAh19VjsOTUKRf3qdrB3XIZ/+zPyY/w2UldvtnsQX42pX6GHjsRsMpl3IebiAjZai7LbV5fpy7pMDw1TxkuGi0/hDirf9ujk5ohXhvg9A1MekND7QWkOnLOqmkAUMAAAAA==")`,
          }}
        >
          <img
            src={storybookLandscape}
            alt="Enchanted Storybook Studio Landscape"
            fetchPriority="high"
            decoding="async"
            loading="eager"
            className="storybook-landscape h-full w-full object-cover object-center dark:opacity-75 opacity-100 transition-opacity duration-300"
          />
        </motion.div>

        {/* Keep the reference artwork clear; only a subtle dark-mode veil. */}
        <div
          className="absolute inset-0 bg-transparent dark:bg-[#101810]/25"
        />
      </div>

      {/* Studio Header (Persistent across all tabs & wizard steps) with Smooth Glide-In */}
      <motion.div
        id="studio-workspace"
        className="relative z-40"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
      </motion.div>

      {/* Main Tab Content with Orchestrated Rise-In & Fluid Cross-Fade */}
      <motion.main
        className="relative z-10 flex-1 w-full pb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
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
          </motion.div>
        </AnimatePresence>
      </motion.main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {apiLimitNotice !== null && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setApiLimitNotice(null)}>
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="api-limit-title"
            aria-describedby="api-limit-description"
            className="w-full max-w-md rounded-3xl border border-[#D7C397] bg-[#FAF9F3] p-7 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" aria-hidden="true">
              <span className="text-2xl">⏳</span>
            </div>
            <h2 id="api-limit-title" className="font-serif text-2xl font-bold text-[#29372b] dark:text-white">Limit reached</h2>
            <p id="api-limit-description" className="mt-3 text-sm leading-6 text-[#69745e] dark:text-slate-300">
              The service has reached its request limit. Please come back after some time and try again.
              {apiLimitNotice.retryAfterSeconds !== null && ` You can retry in about ${Math.ceil(apiLimitNotice.retryAfterSeconds / 60)} minute${Math.ceil(apiLimitNotice.retryAfterSeconds / 60) === 1 ? '' : 's'}.`}
            </p>
            <button
              type="button"
              onClick={() => setApiLimitNotice(null)}
              className="mt-6 min-h-11 rounded-xl bg-[#29372b] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3b4a38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              Okay
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
