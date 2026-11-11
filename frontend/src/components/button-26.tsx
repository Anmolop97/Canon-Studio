'use client';

import { useState } from 'react';

import { FiSun, FiMoon } from 'react-icons/fi';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

interface Button26Props {
  isDark?: boolean;
  onToggle?: () => void;
}

const Button26 = ({ isDark: controlledDark, onToggle }: Button26Props) => {
  const [internalDark, setInternalDark] = useState(false);
  const isDark = controlledDark !== undefined ? controlledDark : internalDark;

  const handleClick = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalDark(!internalDark);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      aria-label="Toggle dark mode"
      className={cn(
        isDark
          ? 'border-blue-500 !text-blue-400 hover:bg-blue-500/10 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 dark:border-blue-400 dark:!text-blue-400 dark:hover:bg-blue-400/10 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/40'
          : 'border-amber-500 !text-amber-500 hover:bg-amber-500/10 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 dark:border-amber-400 dark:!text-amber-400 dark:hover:bg-amber-400/10 dark:focus-visible:border-amber-400 dark:focus-visible:ring-amber-400/40',
      )}
    >
      {isDark ? <FiMoon className="size-5" /> : <FiSun className="size-5" />}
    </Button>
  );
};

export default Button26;
