'use client';

import React from 'react';
import Sidebar from './Sidebar';
import { Bell, Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const { t, isRTL } = useLanguage();

  return (
    <div className={cn("min-h-screen bg-background text-foreground flex", isRTL ? "flex-row-reverse" : "flex-row")}>
      <Sidebar role={role} />
      
      <main className={cn("flex-1 min-h-screen flex flex-col", isRTL ? "lg:mr-64" : "lg:ml-64")}>
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full hidden md:block">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRTL ? "right-3" : "left-3")} size={18} />
              <input 
                type="text" 
                placeholder={t.search} 
                className={cn(
                  "w-full py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all",
                  isRTL ? "pr-10 pl-4" : "pl-10 pr-4"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full relative transition-colors">
              <Bell size={20} />
              <span className={cn("absolute top-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-card", isRTL ? "left-1.5" : "right-1.5")}></span>
            </button>
            <div className="h-8 w-px bg-border mx-2"></div>
            <div className="flex items-center gap-3">
              <div className={cn("hidden sm:block", isRTL ? "text-left" : "text-right")}>
                <p className="text-sm font-semibold text-foreground">All Access</p>
                <p className="text-xs text-muted-foreground capitalize">{role || 'User'}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 flex-1 bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}
