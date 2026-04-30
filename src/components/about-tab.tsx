'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Info, Search, FileText, Users, ShieldCheck,
  Lightbulb, MessageSquare, ExternalLink, Send,
  BookOpen, Plane, Building, Home, Briefcase,
} from 'lucide-react';
import { VisaGuide } from '@/components/visa-guide';
import { StatCounter } from '@/components/stat-counter';
import { SourceBadge } from '@/components/source-badge';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/app-store';
import { APP_NAME, APP_VERSION, VISA_GUIDES, CV_TIPS, TAG_DESCRIPTIONS, SOURCE_CONFIG, SUPPORT_CHANNEL } from '@/lib/constants';
import { toast } from 'sonner';

export function AboutTab() {
  const { telegramId } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitKeyword = async () => {
    if (!keyword.trim()) {
      toast.error('Please enter a keyword');
      return;
    }
    if (!telegramId) {
      toast.error('Please open this app in Telegram');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, keyword: keyword.trim() }),
      });
      if (res.ok) {
        toast.success('Keyword suggestion submitted!');
        setKeyword('');
      } else {
        toast.error('Failed to submit keyword');
      }
    } catch {
      toast.error('Failed to submit keyword');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar">
        {/* App Identity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center py-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-foreground">{APP_NAME}</h2>
            <div className="live-dot h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground font-mono">v{APP_VERSION}</p>
        </motion.div>

        {/* Stat Counters */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 4, label: 'Engines', icon: Search },
            { value: 20, suffix: '+', label: 'Countries', icon: Plane },
            { value: 24, label: 'Scrapes/Day', icon: FileText },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-card p-3 text-center"
            >
              <stat.icon className="h-4 w-4 text-emerald-400 mx-auto mb-2" />
              <StatCounter
                end={stat.value}
                suffix={stat.suffix || ''}
                className="text-lg text-foreground"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <Separator className="bg-border/30" />

        {/* What is Abroad JobsT? */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">What is {APP_NAME}?</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {APP_NAME} is a Telegram Mini App that aggregates abroad jobs with visa sponsorship from multiple engines. We search Adzuna, Reed, CareerJet, and Arbeitnow to bring you the latest opportunities across 20+ countries. Whether you&apos;re looking for skilled worker visas, EU Blue Cards, or LMIA-approved positions, we&apos;ve got you covered.
          </p>
        </div>

        <Separator className="bg-border/30" />

        {/* How It Works */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">How It Works</h3>
          </div>
          <div className="space-y-3">
            {[
              { step: 1, icon: Search, title: 'Browse Jobs', desc: 'Search thousands of abroad jobs filtered by country, type, and benefits.' },
              { step: 2, icon: ShieldCheck, title: 'Check Requirements', desc: 'See visa sponsorship details, relocation support, and other benefits.' },
              { step: 3, icon: Building, title: 'Apply Directly', desc: 'Click apply to go directly to the original job posting and submit your application.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-emerald-500/15 p-2">
                    <item.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  {item.step < 3 && <div className="w-px h-full bg-border/50 mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Tag Guide */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Tag Guide</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(TAG_DESCRIPTIONS).map(([tag, desc]) => (
              <div key={tag} className="rounded-lg border border-border/50 bg-card p-3">
                <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 mb-1.5">
                  {tag}
                </Badge>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Visa Guides */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Visa Guides</h3>
          </div>
          <div className="space-y-2">
            {VISA_GUIDES.map((guide) => (
              <VisaGuide key={guide.id} {...guide} />
            ))}
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* CV Tips */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">CV Tips</h3>
          </div>
          <div className="space-y-2">
            {CV_TIPS.map((tip, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-card p-3">
                <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tip.tip}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Suggest a Keyword */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Suggest a Keyword</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Help us improve our job search by suggesting keywords for new job categories or locations.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., data engineer, Singapore"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-9 text-xs bg-muted/50 border-border/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitKeyword()}
            />
            <Button
              onClick={handleSubmitKeyword}
              disabled={submitting}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Support Channel */}
        <div className="space-y-2">
          <Button
            asChild
            variant="outline"
            className="w-full border-border/50 h-9 text-xs"
          >
            <a href={SUPPORT_CHANNEL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Support Channel
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        <Separator className="bg-border/30" />

        {/* Source Badges Legend */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Source Legend</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2.5">
                <SourceBadge source={key} size="sm" />
                <span className="text-xs text-foreground">{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}
