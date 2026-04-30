'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Eye, EyeOff, Send, ExternalLink, Copy, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { LTC_ADDRESS, LTC_AMOUNT, CPA_DAYS, CRYPTO_DAYS, UPGRADE_WEBSITE_URL, SUPPORT_CHANNEL } from '@/lib/constants';
import { toast } from 'sonner';

export function PremiumTab() {
  const { isPremium, planType, planExpiresAt, telegramId } = useAppStore();
  const [showAddress, setShowAddress] = useState(false);
  const [txid, setTxid] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const daysRemaining = (() => {
    if (!planExpiresAt) return null;
    const diff = new Date(planExpiresAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  })();

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(LTC_ADDRESS);
      toast.success('LTC address copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSubmitTxid = async () => {
    if (!txid.trim()) {
      toast.error('Please enter a transaction ID');
      return;
    }
    if (!telegramId) {
      toast.error('Please open this app in Telegram');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, txid: txid.trim(), amount: LTC_AMOUNT }),
      });
      if (res.ok) {
        toast.success('Transaction submitted! We\'ll verify it shortly.');
        setTxid('');
      } else {
        toast.error('Failed to submit transaction');
      }
    } catch {
      toast.error('Failed to submit transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
        {/* Upgrade Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* CPA Offer Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-2xl border border-border/50 bg-card overflow-hidden shimmer-border"
          >
            <div className="relative z-10 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                  RECOMMENDED
                </Badge>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Complete an Offer</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Complete an offer to get {CPA_DAYS} days Premium. Some offers may require a small payment on your phone (as low as $0.50) to support us. Choose billable or non-billable offers.
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400">FREE</span>
                <span className="text-xs text-muted-foreground">or from $0.50</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {CPA_DAYS} Days
              </div>
              <Button
                asChild
                className="w-full bg-emerald-600 hover:bg-emerald-700 cta-shadow"
              >
                <a href={UPGRADE_WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Go to Upgrade Website
                </a>
              </Button>
            </div>
          </motion.div>

          {/* Litecoin Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-2xl border border-border/50 bg-card overflow-hidden premium-glow"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-[10px] font-bold">
                  BEST VALUE
                </Badge>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Pay with Litecoin</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Don&apos;t want to complete offers? Send ${LTC_AMOUNT} in Litecoin to get {CRYPTO_DAYS} days Premium.
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-violet-400">${LTC_AMOUNT}</span>
                <span className="text-xs text-muted-foreground">LTC</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {CRYPTO_DAYS} Days
              </div>

              {/* LTC Address */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-xs font-mono break-all text-foreground">
                    {showAddress ? LTC_ADDRESS : '•••••••••••••••••••••••'}
                  </div>
                  <button
                    onClick={() => setShowAddress(!showAddress)}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    title={showAddress ? 'Hide address' : 'Show address'}
                  >
                    {showAddress ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={handleCopyAddress}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    title="Copy address"
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* TXID submission */}
              <div className="space-y-2">
                <Input
                  placeholder="Enter your transaction ID (txid)"
                  value={txid}
                  onChange={(e) => setTxid(e.target.value)}
                  className="h-9 text-xs bg-muted/50 border-border/50"
                />
                <Button
                  onClick={handleSubmitTxid}
                  disabled={submitting || !txid.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-700 h-9"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {submitting ? 'Submitting...' : 'Submit TXID'}
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground h-8"
                >
                  <a href={SUPPORT_CHANNEL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
                    <ExternalLink className="h-3 w-3" />
                    Submit to Support Channel
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Premium Status */}
        {isPremium && daysRemaining !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/20 p-2">
                <Crown className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">
                  Premium Active
                </p>
                <p className="text-xs text-emerald-400/70">
                  {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Expired'}
                  {' '}({planType} plan)
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Telegram ID */}
        {telegramId && (
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <p className="text-xs text-muted-foreground">Your Telegram ID</p>
            <p className="text-sm font-mono text-foreground mt-1">{telegramId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
