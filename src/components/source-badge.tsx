'use client';

import { SOURCE_CONFIG } from '@/lib/constants';

interface SourceBadgeProps {
  source: string;
  size?: 'sm' | 'md';
}

export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source.toLowerCase()] || {
    letter: '?',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: source,
  };

  const sizeClasses = size === 'sm' ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm';

  return (
    <div
      className={`${sizeClasses} ${config.bgColor} ${config.color} rounded-full flex items-center justify-center font-bold shrink-0`}
      title={config.label}
    >
      {config.letter}
    </div>
  );
}
