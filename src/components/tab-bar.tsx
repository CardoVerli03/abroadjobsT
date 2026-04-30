'use client';

import { motion } from 'framer-motion';
import { Briefcase, Globe, Bookmark, Sparkles, Crown, CircleHelp, Shield } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import type { TabId } from '@/lib/constants';
import { useHaptic } from '@/hooks/use-telegram';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'remote', label: 'Remote', icon: Globe },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'premium', label: 'Premium', icon: Crown },
  { id: 'about', label: 'About', icon: CircleHelp },
  { id: 'admin', label: 'Admin', icon: Shield },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useAppStore();
  const haptic = useHaptic();

  const visibleTabs = TABS;

  const handleTabChange = (tabId: TabId) => {
    haptic();
    setActiveTab(tabId);
  };

  return (
    <nav className="sticky bottom-0 z-50 tab-bar-gradient">
      <div className="flex items-center justify-around px-1 py-1.5 safe-area-bottom">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[48px] min-h-[44px] transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-muted-foreground'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
