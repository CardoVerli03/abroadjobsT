'use client';

import { AppShell } from '@/components/app-shell';
import { useTelegram } from '@/hooks/use-telegram';

export default function Home() {
  useTelegram();

  return <AppShell />;
}
