import type { ReactNode } from 'react';
import type { User } from '../types';
import { Feather, Compass, PenTool, BookOpen, Sun, Moon, LogIn, LogOut, User as UserIcon } from 'lucide-react';

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
  const navItems: Array<{ id: StudioTab; label: string; icon: ReactNode }> = [
    { id: 'wizard', label: 'Write a story', icon: <Feather className="w-4 h-4" /> },
    { id: 'branching', label: 'Choose your path', icon: <Compass className="w-4 h-4" /> },
    { id: 'writer', label: 'Writer mode', icon: <PenTool className="w-4 h-4" /> },
    { id: 'books', label: 'Books', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-studio-card border-b border-studio-border">
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

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1" role="tablist">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-studio-raised text-studio-accent border border-studio-border font-semibold shadow-sm'
                      : 'text-studio-muted hover:text-studio-text hover:bg-studio-raised/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Theme Toggle & User Auth */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 text-studio-muted hover:text-studio-text bg-studio-raised border border-studio-border rounded min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-studio-accent" /> : <Moon className="w-4 h-4 text-studio-text" />}
            </button>

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

        {/* Mobile Navigation Tabs (Row underneath for 400px viewports) */}
        <nav className="flex md:hidden items-center justify-between border-t border-studio-border/60 py-1.5 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 text-[11px] font-medium rounded transition-colors min-h-[44px] ${
                  isActive
                    ? 'text-studio-accent bg-studio-raised font-semibold'
                    : 'text-studio-muted hover:text-studio-text'
                }`}
              >
                {item.icon}
                <span className="mt-0.5 whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
