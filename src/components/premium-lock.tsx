'use client';

import { motion } from 'framer-motion';
import { Lock, Crown } from 'lucide-react';

interface PremiumLockProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export function PremiumLock({
  title = 'Premium Feature',
  description = 'Upgrade to Premium to unlock this feature',
  compact = false,
}: PremiumLockProps) {
  if (compact) {
    return (
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 p-4">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Lock className="h-6 w-6 text-violet-400" />
          </motion.div>
          <p className="text-xs text-muted-foreground text-center">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl overflow-hidden shimmer-border"
    >
      <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6 bg-card rounded-2xl">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-6 rounded-full bg-violet-500/15 p-5"
        >
          <Crown className="h-10 w-10 text-violet-400" />
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">{description}</p>
      </div>
    </motion.div>
  );
}
