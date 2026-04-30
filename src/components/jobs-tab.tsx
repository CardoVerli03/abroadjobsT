'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, RefreshCw } from 'lucide-react';
import { JobCard } from '@/components/job-card';
import { FilterBar } from '@/components/filter-bar';
import { EmptyState } from '@/components/empty-state';
import { StatCounter } from '@/components/stat-counter';
import { useAppStore } from '@/store/app-store';
import { Skeleton } from '@/components/ui/skeleton';

interface Job {
  id: string;
  title: string;
  company?: string;
  location?: string;
  country?: string;
  source: string;
  jobType?: string;
  salary?: string;
  tags?: string[];
  description?: string;
  url?: string;
  postedAt?: string;
  createdAt?: string;
  isRemote?: boolean;
  isPriority?: boolean;
}

function mapApiJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id || ''),
    title: String(row.title || ''),
    company: row.company ? String(row.company) : undefined,
    location: row.location ? String(row.location) : undefined,
    country: row.country ? String(row.country) : undefined,
    source: String(row.source || ''),
    jobType: row.job_type ? String(row.job_type) : undefined,
    salary: row.salary_min || row.salary_max
      ? `${row.salary_currency || '$'}${row.salary_min || '0'}-${row.salary_max || '0'}`
      : undefined,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags as string) : row.tags as string[]) : undefined,
    description: row.description ? String(row.description) : undefined,
    url: row.url ? String(row.url) : undefined,
    postedAt: row.posted_at ? String(row.posted_at) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    isRemote: Number(row.is_remote) === 1,
    isPriority: Number(row.priority) === 1,
  };
}

export function JobsTab() {
  const { searchQuery, activeFilters, activeJobType, activeCountry, isPremium, dailyViewsUsed, dailyViewLimit, telegramId } = useAppStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalCountries, setTotalCountries] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!telegramId) {
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({
        type: 'abroad',
        page: '1',
        telegramId,
      });
      if (searchQuery) params.set('search', searchQuery);
      if (activeFilters.length > 0) params.set('filters', activeFilters.join(','));
      if (activeJobType) params.set('jobType', activeJobType);
      if (activeCountry) params.set('country', activeCountry);

      const res = await fetch(`/api/jobs?${params}`);
      if (res.ok) {
        const data = await res.json();
        const mappedJobs = (data.jobs || []).map(mapApiJob);
        setJobs(mappedJobs);
        setTotalJobs(data.total || 0);
        // Count unique countries from jobs
        const countries = new Set(mappedJobs.map(j => j.country).filter(Boolean));
        setTotalCountries(countries.size);
        setDailyLimitReached(false);
      } else if (res.status === 403) {
        setDailyLimitReached(true);
        setJobs([]);
      }
    } catch (e) {
      console.warn('Failed to fetch jobs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, activeFilters, activeJobType, activeCountry, telegramId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const canViewMore = isPremium || dailyViewsUsed < dailyViewLimit;

  return (
    <div className="flex flex-col h-full">
      {/* Stats Banner */}
      <div className="px-4 pt-3 pb-1">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3"
        >
          <div className="flex items-baseline gap-1">
            <StatCounter end={totalJobs} className="text-lg text-emerald-400" />
            <span className="text-xs text-emerald-400/70">jobs</span>
          </div>
          <span className="text-emerald-500/30">|</span>
          <div className="flex items-baseline gap-1">
            <StatCounter end={totalCountries || 20} suffix="+" className="text-lg text-emerald-400" />
            <span className="text-xs text-emerald-400/70">countries</span>
          </div>
          <span className="text-emerald-500/30">|</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-emerald-400">4</span>
            <span className="text-xs text-emerald-400/70">engines</span>
          </div>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <FilterBar type="abroad" />

      {/* Refresh Button */}
      <div className="px-4 pt-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Job List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs yet"
            description="They'll appear once scrapers start fetching. Check back soon!"
          />
        ) : (
          <>
            {jobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </>
        )}
        {dailyLimitReached && !isPremium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center"
          >
            <p className="text-sm text-violet-400 font-medium">
              Daily limit reached — upgrade for unlimited
            </p>
          </motion.div>
        )}
        {!dailyLimitReached && !canViewMore && jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center"
          >
            <p className="text-sm text-violet-400 font-medium">
              Daily limit reached — upgrade for unlimited
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
