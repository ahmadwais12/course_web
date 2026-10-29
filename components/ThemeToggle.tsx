'use client';

import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const ORDER: ThemeMode[] = ['light', 'dark', 'system'];

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  const label =
    theme === 'system'
      ? 'Theme: system. Click for light mode'
      : theme === 'dark'
        ? 'Theme: dark. Click for system mode'
        : 'Theme: light. Click for dark mode';

  return (
    <button
      type="button"
      onClick={() => {
        const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
        setTheme(next);
      }}
      aria-label={label}
      title={label}
      className={cn(
        'relative overflow-hidden rounded-xl border border-primary/25 bg-accent p-2 text-primary',
        'hover:border-primary/50 hover:bg-primary hover:text-primary-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'transition-all duration-300',
        className
      )}
    >
      <Icon size={18} />
    </button>
  );
}

export function ThemeModeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const options: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className={cn('inline-flex rounded-full border border-border bg-muted p-1', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              active
                ? 'emis-btn-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={13} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
