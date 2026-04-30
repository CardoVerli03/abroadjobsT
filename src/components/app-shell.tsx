'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Header } from '@/components/header';
import { TabBar } from '@/components/tab-bar';
import { JobsTab } from '@/components/jobs-tab';
import { RemoteTab } from '@/components/remote-tab';
import { SavedTab } from '@/components/saved-tab';
import { AiTab } from '@/components/ai-tab';
import { PremiumTab } from '@/components/premium-tab';
import { AboutTab } from '@/components/about-tab';
import { AdminTab } from '@/components/admin-tab';
import { useAppStore } from '@/store/app-store';

export function AppShell() {
  const { activeTab } = useAppStore();

  const renderTab = () => {
    switch (activeTab) {
      case 'jobs':
        return <JobsTab />;
      case 'remote':
        return <RemoteTab />;
      case 'saved':
        return <SavedTab />;
      case 'ai':
        return <AiTab />;
      case 'premium':
        return <PremiumTab />;
      case 'about':
        return <AboutTab />;
      case 'admin':
        return <AdminTab />;
      default:
        return <JobsTab />;
    }
  };

  return (
    <div className="flex flex-col h-dvh max-h-dvh bg-background overflow-hidden">
      {/* Sticky Header */}
      <Header />

      {/* Scrollable Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Tab Bar */}
      <TabBar />
    </div>
  );
}
