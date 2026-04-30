'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Users, CreditCard, FileText, Briefcase,
  CheckCircle, XCircle, Trash2, Star, Hash, Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { ADMIN_TELEGRAM_ID } from '@/lib/constants';
import { toast } from 'sonner';

interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  totalJobs: number;
  todayJobs: number;
  pendingPayments: number;
}

interface AdminUser {
  telegram_id: string;
  plan_type: string;
  plan_expires_at: string | null;
  daily_views_used: number;
  last_view_reset: string | null;
  created_at: string;
  updated_at: string;
}

interface CryptoPayment {
  id: string;
  user_telegram_id: string;
  txid: string;
  amount: string | null;
  status: string;
  approved_at: string | null;
  created_at: string;
}

interface PostbackLog {
  id: string;
  user_id: string;
  status: string | null;
  profit: string | null;
  raw_data: string | null;
  processed: number;
  created_at: string;
}

interface AdminJob {
  id: string;
  title: string;
  company: string | null;
  source: string;
  priority: number;
  created_at: string;
}

interface KeywordSuggestion {
  id: string;
  user_telegram_id: string;
  keyword: string;
  created_at: string;
}

type AdminSection = 'overview' | 'users' | 'payments' | 'postbacks' | 'jobs' | 'keywords';

export function AdminTab() {
  const { telegramId, isAdmin, setAdmin, setTelegramId, setPremium, setPlanType } = useAppStore();
  const [inputId, setInputId] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [cleaning, setCleaning] = useState(false);

  // Track the effective admin ID for API calls — this is the ID we actually use
  // It can come from the store (Telegram WebApp) or from manual input
  const effectiveAdminId = useRef<string | null>(null);

  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<CryptoPayment[]>([]);
  const [postbacks, setPostbacks] = useState<PostbackLog[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-auth if admin from Telegram
  useEffect(() => {
    if (telegramId === ADMIN_TELEGRAM_ID || isAdmin) {
      setAuthorized(true);
      effectiveAdminId.current = telegramId || ADMIN_TELEGRAM_ID;
    }
  }, [telegramId, isAdmin]);

  const fetchData = useCallback(async (section: AdminSection) => {
    const adminId = effectiveAdminId.current;
    if (!adminId) return;
    setLoading(true);
    try {
      switch (section) {
        case 'overview': {
          const res = await fetch(`/api/admin/stats?telegramId=${adminId}`);
          if (res.ok) setStats(await res.json());
          break;
        }
        case 'users': {
          const res = await fetch(`/api/admin/users?telegramId=${adminId}`);
          if (res.ok) {
            const data = await res.json();
            setUsers(data.users || []);
          }
          break;
        }
        case 'payments': {
          const res = await fetch(`/api/admin/payments?telegramId=${adminId}`);
          if (res.ok) {
            const data = await res.json();
            setPayments(data.payments || []);
          }
          break;
        }
        case 'postbacks': {
          const res = await fetch(`/api/admin/postbacks?telegramId=${adminId}`);
          if (res.ok) {
            const data = await res.json();
            setPostbacks(data.postbacks || []);
          }
          break;
        }
        case 'jobs': {
          const res = await fetch(`/api/admin/jobs?telegramId=${adminId}`);
          if (res.ok) {
            const data = await res.json();
            setJobs(data.jobs || []);
          }
          break;
        }
        case 'keywords': {
          const res = await fetch(`/api/keywords?admin=true&telegramId=${adminId}`);
          if (res.ok) {
            const data = await res.json();
            setKeywords(data.keywords || data.suggestions || []);
          }
          break;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch ${section}:`, e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized && effectiveAdminId.current) {
      fetchData(activeSection);
    }
  }, [authorized, activeSection, fetchData]);

  const getAdminId = () => effectiveAdminId.current || telegramId;

  const handleApprovePayment = async (paymentId: string) => {
    const adminId = getAdminId();
    try {
      const res = await fetch('/api/admin/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, telegramId: adminId }),
      });
      if (res.ok) {
        toast.success('Payment approved');
        fetchData('payments');
      } else {
        toast.error('Failed to approve');
      }
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const adminId = getAdminId();
    try {
      const res = await fetch('/api/admin/payments/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, telegramId: adminId }),
      });
      if (res.ok) {
        toast.success('Payment rejected');
        fetchData('payments');
      } else {
        toast.error('Failed to reject');
      }
    } catch {
      toast.error('Failed to reject');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const adminId = getAdminId();
    try {
      const res = await fetch('/api/admin/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, telegramId: adminId }),
      });
      if (res.ok) {
        toast.success('Job deleted');
        fetchData('jobs');
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleCleanup = async () => {
    const adminId = getAdminId();
    setCleaning(true);
    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: adminId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Cleaned up ${data.deleted || 0} old jobs`);
        fetchData('overview');
      } else {
        toast.error('Failed to cleanup');
      }
    } catch {
      toast.error('Failed to cleanup');
    } finally {
      setCleaning(false);
    }
  };

  const handleAuth = async () => {
    if (inputId === ADMIN_TELEGRAM_ID) {
      setAuthorized(true);
      setAdmin(true);
      effectiveAdminId.current = inputId;

      // Also set telegramId in store so other tabs work
      if (!telegramId) {
        setTelegramId(inputId);
      }

      // Grant owner plan to admin
      try {
        await fetch(`/api/user?telegramId=${inputId}`);
        const store = useAppStore.getState();
        store.setPremium(true);
        store.setPlanType('owner');
      } catch (e) {
        console.warn('Failed to grant owner plan:', e);
      }
    } else {
      toast.error('Access denied — invalid admin ID');
    }
  };

  // Not authorized
  if (!authorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-full bg-muted/50 p-5"
        >
          <Shield className="h-10 w-10 text-muted-foreground" />
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground">Admin Access</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Enter your Telegram ID to access admin panel
        </p>
        <div className="flex gap-2 w-full max-w-xs">
          <Input
            placeholder="Telegram ID"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            className="h-9 text-xs bg-muted/50 border-border/50"
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          />
          <Button
            onClick={handleAuth}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 h-9 px-4"
          >
            Go
          </Button>
        </div>
      </div>
    );
  }

  const sections: { id: AdminSection; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'postbacks', label: 'Postbacks', icon: FileText },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'keywords', label: 'Keywords', icon: Hash },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Section Tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted/50 text-muted-foreground border border-border/30 hover:text-foreground'
              }`}
            >
              <section.icon className="h-3.5 w-3.5" />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <>
            {/* Overview */}
            {activeSection === 'overview' && stats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-emerald-400' },
                    { label: 'Premium Users', value: stats.premiumUsers, icon: Star, color: 'text-violet-400' },
                    { label: 'Total Jobs', value: stats.totalJobs, icon: Briefcase, color: 'text-cyan-400' },
                    { label: "Today's Jobs", value: stats.todayJobs, icon: FileText, color: 'text-orange-400' },
                    { label: 'Pending LTC', value: stats.pendingPayments, icon: CreditCard, color: 'text-yellow-400' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border/50 bg-card p-4">
                      <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
                      <p className="text-xl font-bold text-foreground">{item.value}</p>
                      <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                {/* Cleanup Button */}
                <Button
                  onClick={handleCleanup}
                  disabled={cleaning}
                  variant="outline"
                  className="w-full border-border/50 h-9 text-xs gap-2 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                >
                  <Trash className="h-3.5 w-3.5" />
                  {cleaning ? 'Cleaning...' : 'Cleanup Jobs Older Than 14 Days'}
                </Button>
              </motion.div>
            )}

            {/* Users */}
            {activeSection === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
                ) : (
                  users.map((user) => (
                    <div key={user.telegram_id} className="rounded-lg border border-border/50 bg-card p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-foreground">{user.telegram_id}</span>
                        <Badge className={`text-[10px] h-5 ${
                          user.plan_type !== 'free'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-muted/50 text-muted-foreground border-border/30'
                        }`}>
                          {user.plan_type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Views: {user.daily_views_used}</span>
                        {user.plan_expires_at && (
                          <span>Expires: {new Date(user.plan_expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Payments */}
            {activeSection === 'payments' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No crypto payments</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-foreground">{payment.user_telegram_id}</span>
                        <Badge className={`text-[10px] h-5 ${
                          payment.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : payment.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground break-all">
                        TXID: {payment.txid}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">${payment.amount || '0'} LTC</span>
                        {payment.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleApprovePayment(payment.id)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Postbacks */}
            {activeSection === 'postbacks' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {postbacks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No postback logs</p>
                ) : (
                  postbacks.map((pb) => (
                    <div key={pb.id} className="rounded-lg border border-border/50 bg-card p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">User: {pb.user_id || 'N/A'}</span>
                        <Badge className={`text-[10px] h-5 ${
                          pb.processed === 1
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {pb.processed === 1 ? 'Processed' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Status: {pb.status || 'N/A'}</span>
                        <span>Profit: ${pb.profit || '0'}</span>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Jobs */}
            {activeSection === 'jobs' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No jobs in database</p>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground line-clamp-1">{job.title}</p>
                          <p className="text-[11px] text-muted-foreground">{job.company || 'Unknown'} via {job.source}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {job.priority === 1 && (
                            <Badge className="text-[10px] h-5 bg-violet-500/20 text-violet-400 border-violet-500/30">P</Badge>
                          )}
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                            title="Delete job"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Keywords */}
            {activeSection === 'keywords' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {keywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No keyword suggestions</p>
                ) : (
                  keywords.map((kw) => (
                    <div key={kw.id} className="rounded-lg border border-border/50 bg-card p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{kw.keyword}</p>
                        <p className="text-[11px] text-muted-foreground">From: {kw.user_telegram_id}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(kw.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeSection === 'overview' && !stats && (
              <div className="flex flex-col items-center py-8 gap-2">
                <Shield className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Could not load stats</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
