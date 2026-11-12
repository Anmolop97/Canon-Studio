import { useState, type ReactNode } from 'react';
import type { User } from '../types';
import { Feather, Compass, PenTool, BookOpen, LogIn, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
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
    <header className="studio-glass-header sticky top-0 z-50 w-full bg-transparent border-b transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo & Studio Working Title */}
          <div className="brand-area flex items-center gap-3">
            <img
              src={canonLogo}
              alt="Canon Studio Emblem"
              className="w-9 h-9 object-contain drop-shadow-sm flex-shrink-0 transition-transform duration-300 hover:scale-105"
            />
            <div>
              <span className="studio-brand-name font-serif font-bold text-base sm:text-lg tracking-tight block leading-tight">
                Canon Studio
              </span>
              <span className="studio-brand-subtitle text-[10px] uppercase tracking-widest block font-sans font-semibold">
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

          {/* Right Controls: Pricing, Theme Toggle & User Auth */}
          <div className="flex items-center gap-2">
            {/* Pricing Modal Button */}
            <button
              onClick={() => setIsPricingOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#C1A66B] bg-[#FAF9F3]/85 hover:bg-[#FAF9F3] border border-[#D7C397] dark:bg-slate-800/80 dark:border-amber-500/30 dark:text-amber-400 rounded-xl min-h-[42px] transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-[#C1A66B] text-[#C1A66B]" />
              <span>Upgrade</span>
            </button>

            {/* Animated Sun/Moon Mode Toggle (Button-26) */}
            <div className="[&>button]:bg-[#FAF9F3]/85 [&>button]:dark:bg-slate-800/80 [&>button]:border-[#D7C397] [&>button]:rounded-xl [&>button]:shadow-xs">
              <Button26 isDark={isDarkMode} onToggle={onToggleTheme} />
            </div>

            {/* Auth Session Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAF9F3]/85 dark:bg-slate-800 border border-[#D7C397]/80 dark:border-slate-700 rounded-xl text-xs text-[#101C19] dark:text-white min-h-[42px]">
                  <UserIcon className="w-3.5 h-3.5 text-[#58745C] dark:text-[#B7C29B]" />
                  <span className="font-semibold max-w-[120px] truncate">{currentUser.displayName}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#58745C] hover:text-red-500 bg-[#FAF9F3]/85 dark:bg-slate-800 hover:bg-red-50 border border-[#D7C397]/60 dark:border-slate-700 rounded-xl transition-colors min-h-[42px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold bg-[#101C19] hover:bg-[#263F35] text-[#FAF9F3] dark:bg-[#3B4A38] dark:hover:bg-[#526548] dark:text-[#F5EEDC] rounded-xl transition-all shadow-md active:scale-[0.98] min-h-[42px] cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <nav className="flex md:hidden items-center justify-between border-t border-[#D7C397]/30 dark:border-slate-800 py-2 overflow-x-auto">
          <div className="flex w-full items-center gap-1 rounded-full border border-[#D7C397]/70 bg-[#FAF9F3]/85 p-1 shadow-xs dark:bg-slate-900/80 dark:border-slate-700">
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
                      ? 'text-[#E9E2CE] bg-[#101C19] shadow-sm font-bold dark:bg-[#3B4A38] dark:text-[#F5EEDC]'
                      : 'text-[#263F35] hover:text-[#101C19] dark:text-slate-300'
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
