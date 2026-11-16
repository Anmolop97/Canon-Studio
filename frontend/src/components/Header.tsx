import { useState, type ReactNode } from 'react';
import type { User } from '../types';
import { Feather, Compass, PenTool, BookOpen, LogIn, LogOut, User as UserIcon, Sparkles, Workflow } from 'lucide-react';
import { FaGithub } from 'react-icons/fa6';
import { PricingModal } from './PricingModal';
import { ContinuousTabs } from './continuous-tabs';
import Button26 from './button-26';
import canonLogo from '../assets/canon-logo.png';

export type StudioTab = 'wizard' | 'branching' | 'writer' | 'books';

interface HeaderProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenArchitecture: () => void;
}

export function Header({
  activeTab,
  onTabChange,
  currentUser,
  onOpenAuth,
  onLogout,
  isDarkMode,
  onToggleTheme,
  onOpenArchitecture
}: HeaderProps) {
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const navItems: Array<{ id: StudioTab; shortLabel: string; label: string; icon: ReactNode }> = [
    { id: 'wizard', shortLabel: 'Write', label: 'Write story', icon: <Feather className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> },
    { id: 'branching', shortLabel: 'Path', label: 'Choose path', icon: <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> },
    { id: 'writer', shortLabel: 'Writer', label: 'Writer mode', icon: <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> },
    { id: 'books', shortLabel: 'Books', label: 'Books', icon: <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> },
  ];

  return (
    <header className="studio-glass-header sticky top-0 z-50 w-full bg-transparent border-b transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-18 gap-1.5 sm:gap-2">
          
          {/* Logo & Studio Working Title */}
          <div className="brand-area flex items-center gap-2 sm:gap-3 shrink-0">
            <img
              src={canonLogo}
              alt="Canon Studio Emblem"
              className="w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 object-contain drop-shadow-sm flex-shrink-0 transition-transform duration-300 hover:scale-105"
            />
            <div>
              <span className="studio-brand-name font-serif font-bold text-sm sm:text-base md:text-lg tracking-tight block leading-tight">
                Canon Studio
              </span>
              <span className="studio-brand-subtitle text-[9px] sm:text-[10px] uppercase tracking-widest hidden sm:block font-sans font-semibold">
                Narrative &amp; Continuity
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Enchanted Forest Continuous Tabs) */}
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

          {/* Right Controls: Project links, Pricing, Theme Toggle & User Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onOpenArchitecture}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#D7C397]/60 bg-[#FAF9F3]/70 px-2.5 py-2 text-xs font-semibold text-[#58745C] transition-colors hover:bg-[#FAF9F3] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 min-h-[38px] sm:min-h-[42px]"
            >
              <Workflow className="h-3.5 w-3.5" />
              <span>How it works</span>
            </button>
            <a
              href="https://github.com/Anmolop97/Canon-Studio"
              target="_blank"
              rel="noreferrer"
              aria-label="Canon Studio on GitHub (opens in a new tab)"
              title="View the Canon Studio repository on GitHub"
              className="hidden sm:inline-flex h-[38px] w-[38px] sm:h-[42px] sm:w-[42px] items-center justify-center rounded-xl border border-[#D7C397]/60 bg-[#FAF9F3]/70 text-[#263F35] transition-colors hover:bg-[#FAF9F3] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
            >
              <FaGithub className="h-4 w-4" aria-hidden="true" />
            </a>

            {/* Pricing Modal Button */}
            <button
              onClick={() => setIsPricingOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-[#C1A66B] bg-[#FAF9F3]/85 hover:bg-[#FAF9F3] border border-[#D7C397] dark:bg-slate-800/80 dark:border-amber-500/30 dark:text-amber-400 rounded-xl min-h-[38px] sm:min-h-[42px] transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-[#C1A66B] text-[#C1A66B]" />
              <span className="hidden sm:inline">Upgrade</span>
            </button>

            {/* Animated Sun/Moon Mode Toggle (Button-26) */}
            <div className="[&>button]:bg-[#FAF9F3]/85 [&>button]:dark:bg-slate-800/80 [&>button]:border-[#D7C397] [&>button]:rounded-xl [&>button]:shadow-xs [&>button]:min-h-[38px] sm:[&>button]:min-h-[42px]">
              <Button26 isDark={isDarkMode} onToggle={onToggleTheme} />
            </div>

            {/* Auth Session Button */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAF9F3]/85 dark:bg-slate-800 border border-[#D7C397]/80 dark:border-slate-700 rounded-xl text-xs text-[#101C19] dark:text-white min-h-[42px]">
                  <UserIcon className="w-3.5 h-3.5 text-[#58745C] dark:text-[#B7C29B]" />
                  <span className="font-semibold max-w-[120px] truncate">{currentUser.displayName}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-[#58745C] hover:text-red-500 bg-[#FAF9F3]/85 dark:bg-slate-800 hover:bg-red-50 border border-[#D7C397]/60 dark:border-slate-700 rounded-xl transition-colors min-h-[38px] sm:min-h-[42px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-[#101C19] hover:bg-[#263F35] text-[#FAF9F3] dark:bg-[#3B4A38] dark:hover:bg-[#526548] dark:text-[#F5EEDC] rounded-xl transition-all shadow-md active:scale-[0.98] min-h-[38px] sm:min-h-[42px] cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <nav className="flex md:hidden items-center justify-between border-t border-[#D7C397]/30 dark:border-slate-800 py-1.5 overflow-x-auto">
          <div className="flex w-full items-center gap-1 rounded-full border border-[#D7C397]/70 bg-[#FAF9F3]/85 p-1 shadow-xs dark:bg-slate-900/80 dark:border-slate-700">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(item.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold rounded-full transition-all min-h-[42px] cursor-pointer touch-manipulation ${
                    isActive
                      ? 'text-[#E9E2CE] bg-[#101C19] shadow-sm font-bold dark:bg-[#3B4A38] dark:text-[#F5EEDC]'
                      : 'text-[#263F35] hover:text-[#101C19] dark:text-slate-300'
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline truncate">{item.label}</span>
                  <span className="inline sm:hidden truncate">{item.shortLabel}</span>
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
