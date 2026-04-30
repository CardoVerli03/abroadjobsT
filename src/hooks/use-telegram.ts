'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { ADMIN_TELEGRAM_ID } from '@/lib/constants';

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  MainButton: {
    show: () => void;
    hide: () => void;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const {
    setTelegramId,
    setAdmin,
    setUserLoading,
  } = useAppStore();

  useEffect(() => {
    const init = async () => {
      let telegramId: string | null = null;

      // Try to get from Telegram WebApp SDK
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const webapp = window.Telegram.WebApp;

        try {
          webapp.ready();
          webapp.expand();
          webapp.setHeaderColor('#0a0a0a');
          webapp.setBackgroundColor('#0a0a0a');
          webapp.enableClosingConfirmation();
        } catch (e) {
          console.warn('Telegram WebApp methods not available:', e);
        }

        // Extract user from initDataUnsafe
        if (webapp.initDataUnsafe?.user?.id) {
          telegramId = String(webapp.initDataUnsafe.user.id);
        }
      }

      // Fallback: try URL param
      if (!telegramId) {
        const urlParams = new URLSearchParams(window.location.search);
        telegramId = urlParams.get('telegramId') || urlParams.get('user_id') || null;
      }

      // Fallback: try hash params
      if (!telegramId) {
        const hash = window.location.hash.replace('#', '');
        const hashParams = new URLSearchParams(hash);
        telegramId = hashParams.get('telegramId') || null;
      }

      if (telegramId) {
        setTelegramId(telegramId);
        setAdmin(telegramId === ADMIN_TELEGRAM_ID);

        // Fetch or create user from API
        try {
          const res = await fetch(`/api/user?telegramId=${telegramId}`);
          if (res.ok) {
            const data = await res.json();
            const user = data.user || data;
            const store = useAppStore.getState();
            const planType = (user.plan_type || 'free') as 'free' | 'cpa' | 'crypto' | 'owner';
            const isUserPremium = user.is_premium || planType !== 'free';
            store.setPremium(isUserPremium);
            store.setPlanType(planType);
            store.setPlanExpiresAt(user.plan_expires_at || null);
            store.setDailyViewsUsed(Number(user.daily_views_used) || 0);
            store.setDailyViewLimit(planType !== 'free' ? 999999 : 2);
          }
        } catch (e) {
          console.warn('Failed to fetch user:', e);
        }
      }

      setUserLoading(false);
    };

    init();
  }, [setTelegramId, setAdmin, setUserLoading]);
}

export function useHaptic() {
  const haptic = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      } catch {}
    }
  };
  return haptic;
}
