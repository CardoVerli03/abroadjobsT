'use client';

import { motion } from 'framer-motion';
import { Crown, Zap } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '@/lib/constants';
import { useAppStore } from '@/store/app-store';

export function Header() {
  const { isPremium, planType } = useAppStore();

  return (
    <header className="sticky top-0 z-50 glass-header border-b border-border/30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* App name + live dot */}
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground tracking-tight">
              {APP_NAME}
            </h1>
            <div className="live-dot h-2 w-2 rounded-full bg-emerald-500" title="Live" />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            v{APP_VERSION}
          </span>
        </div>

        {/* Plan badge */}
        <div>
          {isPremium ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30"
            >
              <Crown className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[11px] font-semibold text-violet-400 capitalize">{planType}</span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/30">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">Free</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
