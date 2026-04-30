'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import { PremiumLock } from '@/components/premium-lock';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';

export function AiTab() {
  const { isPremium } = useAppStore();
  const [iframeError, setIframeError] = useState(false);
  const [showFallbackBtn, setShowFallbackBtn] = useState(false);

  useEffect(() => {
    if (isPremium && !iframeError) {
      const timer = setTimeout(() => {
        setShowFallbackBtn(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPremium, iframeError]);

  if (!isPremium) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <PremiumLock
          title="AI Assistant"
          description="Upgrade to Premium to chat with AI about visas, CVs, and job applications"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {iframeError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="rounded-full bg-emerald-500/15 p-5 mb-2">
            <Sparkles className="h-10 w-10 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">AI Assistant</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            The embedded AI couldn&apos;t load. Open it in a new tab instead.
          </p>
          <Button
            asChild
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 cta-shadow"
          >
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open AI Assistant
            </a>
          </Button>
        </div>
      ) : (
        <div className="flex-1 relative">
          <iframe
            src="https://gemini.google.com"
            className="absolute inset-0 w-full h-full border-0"
            title="AI Assistant"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onError={() => setIframeError(true)}
            onLoad={(e) => {
              try {
                const iframe = e.target as HTMLIFrameElement;
                if (!iframe.contentWindow) {
                  setIframeError(true);
                }
              } catch {
                setIframeError(true);
              }
            }}
          />
          {showFallbackBtn && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIframeError(true)}
                className="w-full bg-card/90 backdrop-blur-sm border-border/50"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Having trouble? Open in new tab
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
