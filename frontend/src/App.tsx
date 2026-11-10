import { useState, useEffect } from 'react';
import { Header, type StudioTab } from './components/Header';
import { TabWriteStory } from './components/TabWriteStory';
import { TabChoosePath } from './components/TabChoosePath';
import { TabWriterMode } from './components/TabWriterMode';
import { TabBooks } from './components/TabBooks';
import { AuthModal } from './components/AuthModal';
import { api } from './api';
import type { User } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('wizard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
  } | null>(null);

  // Theme state: dark-first, follows system preference, manual override in localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('canon_theme');
    if (saved) return saved === 'dark';
    return true; // dark-first default
  });

  // Apply theme class to <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('canon_theme', isDarkMode ? 'dark' : 'light');
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
  const handleSaveToWriter = (story: { title: string; genre: string; content: string }) => {
    setPreloadedDraft(story);
    if (!currentUser) {
      setIsAuthModalOpen(true);
    } else {
      setActiveTab('writer');
    }
  };

  return (
    <div className="min-h-screen bg-studio-bg text-studio-text flex flex-col font-sans transition-colors duration-200">
      
      {/* Studio Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Tab Content */}
      <main className="flex-1 w-full pb-16">
        {activeTab === 'wizard' && (
          <TabWriteStory
            onPlayBranching={handlePlayBranching}
            onSaveToWriter={handleSaveToWriter}
          />
        )}

        {activeTab === 'branching' && (
          <TabChoosePath
            initialPremise={preloadedBranchingPremise}
          />
        )}

        {activeTab === 'writer' && (
          <TabWriterMode
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            preloadedDraft={preloadedDraft}
          />
        )}

        {activeTab === 'books' && (
          <TabBooks
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
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
