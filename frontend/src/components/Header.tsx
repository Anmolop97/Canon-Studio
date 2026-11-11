import { useState, type ReactNode } from 'react';
import type { User } from '../types';
import { Feather, Compass, PenTool, BookOpen, LogIn, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { PricingModal } from './PricingModal';
import { ContinuousTabs } from './continuous-tabs';
import Button26 from './button-26';

export type StudioTab = 'wizard' | 'branching' | 'writer' | 'books';

interface HeaderProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function Header({
  activeTab,
  onTabChange,
  currentUser,
  onOpenAuth,
  onLogout,
  isDarkMode,
  onToggleTheme
}: HeaderProps) {
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const navItems: Array<{ id: StudioTab; label: string; icon: ReactNode }> = [
    { id: 'wizard', label: 'Write a story', icon: <Feather className="w-4 h-4" /> },
    { id: 'branching', label: 'Choose your path', icon: <Compass className="w-4 h-4" /> },
    { id: 'writer', label: 'Writer mode', icon: <PenTool className="w-4 h-4" /> },
    { id: 'books', label: 'Books', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-studio-card/90 backdrop-blur-md border-b border-studio-border shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo & Studio Working Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-studio-raised border border-studio-border flex items-center justify-center text-studio-accent font-serif font-bold text-lg flex-shrink-0">
              C
            </div>
            <div>
              <span className="font-serif font-bold text-base sm:text-lg text-studio-text tracking-tight block leading-tight">
                Canon Story Studio
              </span>
              <span className="text-[10px] text-studio-muted uppercase tracking-wider block font-sans">
                Narrative & Continuity
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Watermelon Continuous Tabs) */}
          <div className="hidden md:flex items-center">
            <ContinuousTabs
              tabs={[
                { id: 'wizard', label: 'Write a story' },
                { id: 'branching', label: 'Choose your path' },
                { id: 'writer', label: 'Writer mode' },
                { id: 'books', label: 'Books' }
              ]}
              defaultActiveId={activeTab}
              onChange={(id) => onTabChange(id as StudioTab)}
            />
          </div>

          {/* Right Controls: Pricing, Theme Toggle & User Auth */}
          <div className="flex items-center gap-2">
            {/* Pricing Modal Button */}
            <button
              onClick={() => setIsPricingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded min-h-[44px] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Upgrade</span>
            </button>

            {/* Animated Sun/Moon Mode Toggle (Button-26) */}
            <Button26 isDark={isDarkMode} onToggle={onToggleTheme} />

            {/* Auth Session Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-studio-raised border border-studio-border rounded text-xs text-studio-text min-h-[44px]">
                  <UserIcon className="w-3.5 h-3.5 text-studio-accent" />
                  <span className="font-medium max-w-[120px] truncate">{currentUser.displayName}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-studio-muted hover:text-red-400 bg-studio-raised hover:bg-red-950/20 border border-studio-border rounded transition-colors min-h-[44px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium bg-studio-accent hover:bg-studio-accent/90 text-studio-bg rounded transition-colors min-h-[44px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs (Watermelon Capsule Style) */}
        <nav className="flex md:hidden items-center justify-between border-t border-studio-border/40 py-2 overflow-x-auto">
          <div className="flex w-full items-center gap-1 rounded-full border border-studio-border bg-studio-raised p-1 backdrop-blur-md shadow-inner">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(item.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-semibold rounded-full transition-all min-h-[38px] cursor-pointer ${
                    isActive
                      ? 'text-studio-text bg-studio-card shadow-sm font-bold'
                      : 'text-studio-muted hover:text-studio-text'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />
    </header>
  );
}
