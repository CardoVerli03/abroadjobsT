'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Building2, Clock, Share2, Bookmark, BookmarkCheck, ExternalLink, Eye } from 'lucide-react';
import { SourceBadge } from './source-badge';
import { SOURCE_CONFIG } from '@/lib/constants';
import { useAppStore } from '@/store/app-store';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface JobCardProps {
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
  sourceUrl?: string;
  onUnsave?: () => void;
  showUnsave?: boolean;
}

export function JobCard({
  id,
  title,
  company,
  location,
  country,
  source,
  jobType,
  salary,
  tags = [],
  description,
  url,
  postedAt,
  createdAt,
  isRemote,
  isPriority,
  sourceUrl,
  onUnsave,
  showUnsave = false,
}: JobCardProps) {
  const { isPremium, savedJobIds, addSavedJob, removeSavedJob, addViewedJob, dailyViewsUsed, dailyViewLimit, incrementDailyViews, telegramId } = useAppStore();
  const [saving, setSaving] = useState(false);

  const isSaved = savedJobIds.includes(id);
  const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;
  const canViewFull = isPremium || dailyViewsUsed < dailyViewLimit;
  const sourceConfig = SOURCE_CONFIG[source.toLowerCase()];

  const handleSave = async () => {
    if (!telegramId) {
      toast.error('Please open this app in Telegram');
      return;
    }
    setSaving(true);
    try {
      if (isSaved) {
        await fetch('/api/saved', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId, jobId: id }),
        });
        removeSavedJob(id);
        toast.success('Job removed from saved');
      } else {
        await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId, jobId: id }),
        });
        addSavedJob(id);
        toast.success('Job saved');
      }
    } catch {
      toast.error('Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const text = `${title}${company ? ` at ${company}` : ''}${location ? ` — ${location}` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: url || window.location.href });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text + '\n' + (url || window.location.href));
      toast.success('Link copied to clipboard');
    }
  };

  const handleView = () => {
    addViewedJob(id);
    if (!isPremium) {
      incrementDailyViews();
      fetch('/api/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, jobId: id }),
      }).catch(() => {});
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-card rounded-xl border border-border/50 overflow-hidden ${sourceConfig?.borderColor || ''} ${isPriority ? 'ring-1 ring-emerald-500/30' : ''}`}
    >
      <div className="p-4">
        {/* Top Row: Source badge + badges */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <SourceBadge source={source} />
            <span className="text-[11px] text-muted-foreground font-medium">
              {sourceConfig?.label || source}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isNew && (
              <Badge className="h-5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 font-bold">
                NEW
              </Badge>
            )}
            {isPriority && (
              <Badge className="h-5 bg-violet-500/20 text-violet-400 border-violet-500/30 text-[10px] px-1.5 font-bold">
                PRIORITY
              </Badge>
            )}
          </div>
        </div>

        {/* Title & Company — always visible */}
        <h3 className="font-semibold text-sm text-foreground leading-tight mb-1.5 line-clamp-2">
          {title}
        </h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          {company && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span className="line-clamp-1">{company}</span>
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{location}</span>
            </span>
          )}
        </div>

        {/* Job type — always visible */}
        {jobType && (
          <Badge variant="outline" className="text-[10px] h-5 border-border/50 text-muted-foreground mb-2">
            {jobType}
          </Badge>
        )}

        {/* Premium content — only for premium users */}
        {isPremium ? (
          <div className="space-y-2.5 mt-2">
            {salary && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-emerald-400 font-semibold">{salary}</span>
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {country && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {country}
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{description}</p>
            )}
            {source === 'remotive' && sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-purple-400 hover:underline"
              >
                via Remotive
              </a>
            )}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleView}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <ExternalLink className="h-3 w-3" />
                Apply Now
              </a>
            )}
          </div>
        ) : (
          /* Free user — limited view */
          <div className="mt-2">
            {!canViewFull && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>Daily limit reached — upgrade for unlimited</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Row: Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {postedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {postedAt}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {showUnsave ? (
              <button
                onClick={onUnsave}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                title="Remove from saved"
              >
                <BookmarkCheck className="h-4 w-4 text-emerald-400" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                title={isSaved ? 'Remove from saved' : 'Save job'}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              title="Share job"
            >
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
