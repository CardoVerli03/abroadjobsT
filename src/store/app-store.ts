import { create } from 'zustand';
import type { TabId } from '@/lib/constants';

interface AppState {
  activeTab: TabId;
  telegramId: string | null;
  isPremium: boolean;
  planType: 'free' | 'cpa' | 'crypto' | 'owner';
  planExpiresAt: string | null;
  dailyViewsUsed: number;
  dailyViewLimit: number;
  savedJobIds: string[];
  recentlyViewedIds: string[];
  searchQuery: string;
  activeFilters: string[];
  activeJobType: string | null;
  activeCountry: string | null;
  isAdmin: boolean;
  userLoading: boolean;

  setActiveTab: (tab: TabId) => void;
  setTelegramId: (id: string | null) => void;
  setPremium: (isPremium: boolean) => void;
  setPlanType: (planType: 'free' | 'cpa' | 'crypto' | 'owner') => void;
  setPlanExpiresAt: (expiresAt: string | null) => void;
  setDailyViewsUsed: (used: number) => void;
  setDailyViewLimit: (limit: number) => void;
  setAdmin: (isAdmin: boolean) => void;
  setUserLoading: (loading: boolean) => void;
  toggleFilter: (filter: string) => void;
  setActiveJobType: (jobType: string | null) => void;
  setActiveCountry: (country: string | null) => void;
  setSearchQuery: (query: string) => void;
  addSavedJob: (jobId: string) => void;
  removeSavedJob: (jobId: string) => void;
  setSavedJobIds: (ids: string[]) => void;
  addViewedJob: (jobId: string) => void;
  incrementDailyViews: () => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'jobs',
  telegramId: null,
  isPremium: false,
  planType: 'free',
  planExpiresAt: null,
  dailyViewsUsed: 0,
  dailyViewLimit: 2,
  savedJobIds: [],
  recentlyViewedIds: [],
  searchQuery: '',
  activeFilters: [],
  activeJobType: null,
  activeCountry: null,
  isAdmin: false,
  userLoading: true,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setTelegramId: (id) => set({ telegramId: id }),
  setPremium: (isPremium) => set({ isPremium }),
  setPlanType: (planType) => set({ planType }),
  setPlanExpiresAt: (expiresAt) => set({ planExpiresAt: expiresAt }),
  setDailyViewsUsed: (used) => set({ dailyViewsUsed: used }),
  setDailyViewLimit: (limit) => set({ dailyViewLimit: limit }),
  setAdmin: (isAdmin) => set({ isAdmin }),
  setUserLoading: (loading) => set({ userLoading: loading }),
  toggleFilter: (filter) =>
    set((state) => ({
      activeFilters: state.activeFilters.includes(filter)
        ? state.activeFilters.filter((f) => f !== filter)
        : [...state.activeFilters, filter],
    })),
  setActiveJobType: (jobType) => set({ activeJobType: jobType }),
  setActiveCountry: (country) => set({ activeCountry: country }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  addSavedJob: (jobId) =>
    set((state) => ({ savedJobIds: [...state.savedJobIds, jobId] })),
  removeSavedJob: (jobId) =>
    set((state) => ({ savedJobIds: state.savedJobIds.filter((id) => id !== jobId) })),
  setSavedJobIds: (ids) => set({ savedJobIds: ids }),
  addViewedJob: (jobId) =>
    set((state) => {
      if (state.recentlyViewedIds.includes(jobId)) return state;
      const updated = [jobId, ...state.recentlyViewedIds].slice(0, 50);
      try { localStorage.setItem('recentlyViewed', JSON.stringify(updated)); } catch {}
      return { recentlyViewedIds: updated };
    }),
  incrementDailyViews: () =>
    set((state) => ({ dailyViewsUsed: state.dailyViewsUsed + 1 })),
  resetFilters: () =>
    set({ searchQuery: '', activeFilters: [], activeJobType: null, activeCountry: null }),
}));
