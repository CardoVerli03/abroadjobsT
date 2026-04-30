'use client';

import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { FILTER_TAGS, JOB_TYPES, COUNTRIES } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface FilterBarProps {
  type: 'abroad' | 'remote';
}

export function FilterBar({ type }: FilterBarProps) {
  const {
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    activeJobType,
    setActiveJobType,
    activeCountry,
    setActiveCountry,
    resetFilters,
  } = useAppStore();

  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = activeFilters.length > 0 || activeJobType || activeCountry;

  return (
    <div className="space-y-3 px-4 pt-3">
      {/* Search Bar */}
      <div className="relative focus-ring-animate rounded-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs, companies, locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 h-10 bg-muted/50 border-border/50 focus-visible:ring-emerald-500/30"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Toggle Row */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-8 text-xs gap-1.5 ${showFilters ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-border/50'}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 h-4 w-4 rounded-full bg-emerald-500 text-[10px] text-white flex items-center justify-center font-bold">
              {(activeFilters.length + (activeJobType ? 1 : 0) + (activeCountry ? 1 : 0))}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Expandable Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-3"
          >
            {/* Tag Filters */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Benefits</p>
              <div className="flex flex-wrap gap-1.5">
                {FILTER_TAGS.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={activeFilters.includes(tag.id) ? 'default' : 'outline'}
                    className={`cursor-pointer text-xs h-7 transition-all ${
                      activeFilters.includes(tag.id)
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                    onClick={() => toggleFilter(tag.id)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Job Type */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Job Type</p>
              <div className="flex flex-wrap gap-1.5">
                {JOB_TYPES.map((jt) => (
                  <Badge
                    key={jt}
                    variant={activeJobType === jt ? 'default' : 'outline'}
                    className={`cursor-pointer text-xs h-7 transition-all ${
                      activeJobType === jt
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                    onClick={() => setActiveJobType(activeJobType === jt ? null : jt)}
                  >
                    {jt}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Country Filter */}
            {type === 'abroad' && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Country</p>
                <div className="flex flex-wrap gap-1.5">
                  {COUNTRIES.map((country) => (
                    <Badge
                      key={country.code}
                      variant={activeCountry === country.code ? 'default' : 'outline'}
                      className={`cursor-pointer text-xs h-7 transition-all ${
                        activeCountry === country.code
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                      }`}
                      onClick={() => setActiveCountry(activeCountry === country.code ? null : country.code)}
                    >
                      {country.flag} {country.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
