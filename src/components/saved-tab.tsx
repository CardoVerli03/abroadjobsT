'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bookmark } from 'lucide-react';
import { JobCard } from '@/components/job-card';
import { EmptyState } from '@/components/empty-state';
import { PremiumLock } from '@/components/premium-lock';
import { useAppStore } from '@/store/app-store';
import { Skeleton } from '@/components/ui/skeleton';

interface SavedJob {
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
}

function mapApiJob(row: Record<string, unknown>): SavedJob {
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
  };
}

export function SavedTab() {
  const { isPremium, telegramId, removeSavedJob } = useAppStore();
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!telegramId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/saved?telegramId=${telegramId}`);
      if (res.ok) {
        const data = await res.json();
        const savedJobs = data.savedJobs || data.jobs || [];
        setJobs(savedJobs.map(mapApiJob));
      }
    } catch (e) {
      console.warn('Failed to fetch saved jobs:', e);
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    if (isPremium) {
      fetchSaved();
    } else {
      setLoading(false);
    }
  }, [isPremium, fetchSaved]);

  const handleUnsave = async (jobId: string) => {
    if (!telegramId) return;
    try {
      await fetch('/api/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, jobId }),
      });
      removeSavedJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (e) {
      console.warn('Failed to unsave job:', e);
    }
  };

  if (!isPremium) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <PremiumLock
          title="Saved Jobs — Premium Only"
          description="Upgrade to Premium to save jobs and revisit them anytime"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No saved jobs"
            description="Save jobs to revisit them later. Tap the bookmark icon on any job card."
          />
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              showUnsave
              onUnsave={() => handleUnsave(job.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
