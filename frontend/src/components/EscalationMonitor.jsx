import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Activity, RefreshCw, AlertTriangle, CheckCircle, 
  Info, Zap, Clock, ShieldAlert, ChevronRight, 
  Mail, Fingerprint, Calendar
} from 'lucide-react';

const API = 'http://127.0.0.1:8000/api/v1/monitor/escalations?limit=15';
const POLL_INTERVAL = 12000;

// ── Status config mapping to index.css tokens ────────────────────────────────

const STATUS_MAP = {
  critical_escalation: {
    label: 'Critical',
    color: '#e11d48',
    badge: 'badge-urgent',
    icon: ShieldAlert,
    pulse: true
  },
  flagated_high: {
    label: 'High',
    color: '#d97706',
    badge: 'badge-urgent',
    icon: AlertTriangle,
    pulse: false
  },
  flagged_medium: {
    label: 'Medium',
    color: '#2563eb',
    badge: 'badge-action',
    icon: Info,
    pulse: false
  },
  flagged_low: {
    label: 'Low',
    color: '#2563eb',
    badge: 'badge-team',
    icon: Info,
    pulse: false
  },
  resolved: {
    label: 'Resolved',
    color: '#16a34a',
    badge: 'badge-fyi',
    icon: CheckCircle,
    pulse: false
  },
  false_positive: {
    label: 'False +',
    color: '#64748b',
    badge: 'badge-cold',
    icon: CheckCircle,
    pulse: false
  },
  New: {
    label: 'Unprocessed',
    color: '#94a3b8',
    badge: 'badge-schedule',
    icon: Clock,
    pulse: false
  },
};

const getStatus = (key) => STATUS_MAP[key] ?? {
  label: key || 'Pending',
  color: '#94a3b8',
  badge: 'badge-cold',
  icon: Clock,
  pulse: false
};

// ── Components ───────────────────────────────────────────────────────────────

const ScoreBar = ({ score, color }) => {
  const pct = Math.min(Math.max(score ?? 0, 0), 100);
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden border border-border/30">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'circOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: '#10b981' }} 
        />
      </div>
      <span className="text-[10px] font-bold tabular-nums min-w-[30px]" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
};

const IncidentCard = ({ item, isNew }) => {
  const cfg = getStatus(item.scheduling_status);
  const Icon = cfg.icon;

  const ts = item.created_at
    ? new Date(item.created_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Pending Sync';

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, scale: 0.98, y: -10 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col gap-4"
    >
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 w-1.5 h-full opacity-70" style={{ backgroundColor: cfg.color }} />
      
      {cfg.pulse && (
        <motion.div
          animate={{ opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: cfg.color }}
        />
      )}

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pl-1">
        <div className="flex items-center gap-3">
          <div className={`badge ${cfg.badge} flex items-center gap-1.5 shadow-sm`}>
            {cfg.pulse && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: cfg.color }}></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: cfg.color }}></span>
              </span>
            )}
            <Icon size={12} />
            {cfg.label}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-3 uppercase tracking-widest bg-surface2/40 px-2 py-0.5 rounded border border-border/50">
             <Fingerprint size={10} /> {item.id}
          </div>
          {item.classification && (
            <span className="text-[10px] font-bold text-text-2 bg-bg border border-border px-2 py-0.5 rounded-md uppercase tracking-wider">
              {item.classification.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-text-3 uppercase tracking-widest">
           <Calendar size={11} /> {ts}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-1.5 pl-1">
        <h4 className="text-[15px] font-bold text-text group-hover:text-primary transition-colors line-clamp-1">
          {item.subject || 'Internal System Alert'}
        </h4>
        <p className="text-[12px] text-text-2 leading-relaxed line-clamp-2">
          {item.summary || 'No detailed diagnostic summary available for this escalation event.'}
        </p>
      </div>

      {/* Urgency Score */}
      <div className="pl-1 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-text-3">
          <span>Urgency Level</span>
          <span style={{ color: cfg.color }}>Tier Analysis</span>
        </div>
        <ScoreBar score={item.urgency_score} color={cfg.color} />
      </div>

      {/* Footer Info */}
      {item.sender_email && (
        <div className="pt-3 border-t border-border/50 flex items-center justify-between pl-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-text-3">
            <Mail size={12} />
            Origin: <span className="text-text-2 font-bold">{item.sender_email}</span>
          </div>
          <button className="p-1.5 hover:bg-surface2 rounded-lg text-text-3 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
};

const SkeletonCard = () => (
  <div className="bg-surface border border-border rounded-xl p-5 space-y-4 animate-pulse">
    <div className="flex justify-between">
      <div className="h-6 w-24 bg-surface2 rounded-md" />
      <div className="h-4 w-32 bg-surface2 rounded-md" />
    </div>
    <div className="h-5 w-3/4 bg-surface2 rounded-md" />
    <div className="h-4 w-full bg-surface2 rounded-md" />
    <div className="h-2 w-full bg-surface2 rounded-full" />
  </div>
);

const TierLegend = () => {
  const tiers = [
    { label: 'T1', desc: 'Normal', color: '#2563eb' },
    { label: 'T2', desc: 'Priority', color: '#2563eb' },
    { label: 'T3', desc: 'Sensitive', color: '#d97706' },
    { label: 'T4', desc: 'Critical', color: '#e11d48' },
  ];
  return (
    <div className="flex flex-wrap gap-4 items-center">
      {tiers.map(t => (
        <div key={t.label} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
          <span className="text-[10px] font-bold text-text-2 uppercase tracking-tighter">{t.label}</span>
          <span className="text-[10px] text-text-3 font-medium">{t.desc}</span>
        </div>
      ))}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function EscalationMonitor() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [newIds, setNewIds]     = useState(new Set());
  const [spinning, setSpinning] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    try {
      const res = await axios.get(API);
      const incoming = res.data.escalations ?? [];

      setItems(prev => {
        const prevIds = new Set(prev.map(p => p.id));
        const fresh   = new Set(incoming.filter(i => !prevIds.has(i.id)).map(i => i.id));
        if (fresh.size > 0) {
          setNewIds(fresh);
          setTimeout(() => setNewIds(new Set()), 3000);
        }
        return incoming;
      });

      setLastSync(new Date());
      setError(null);
    } catch (e) {
      setError('System Node Offline: Failed to establish link to monitor gateway.');
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setSpinning(false), 600);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const counts = items.reduce((acc, item) => {
    const s = item.scheduling_status ?? 'unknown';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-full flex justify-center py-8 px-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[900px] flex flex-col gap-6"
      >
        {/* Header Block */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                <Activity size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text leading-none">
                  Escalation Monitor
                </h1>
                <p className="text-xs text-text-3 font-semibold uppercase tracking-widest mt-1">
                  Tier Analysis & Risk Mitigation
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-surface border border-border p-2 rounded-xl shadow-sm">
            <div className="flex flex-col items-end px-3">
              <span className="text-[10px] font-bold text-text-3 uppercase tracking-widest">Global Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-bold text-text">Operational</span>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <motion.button
              onClick={() => fetchData(true)}
              className="p-2.5 rounded-lg hover:bg-surface2 text-text-2 transition-colors relative"
              title="Force Re-sync"
            >
              <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
            </motion.button>
          </div>
        </header>

        {/* Diagnostic Meta Bar */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <TierLegend />
          
          <div className="flex items-center gap-4 border-l border-border pl-6">
            {Object.entries(counts).map(([status, n]) => {
              const cfg = getStatus(status);
              if (n === 0) return null;
              return (
                <div key={status} className="flex flex-col items-center">
                  <span className="text-lg font-bold tabular-nums leading-none" style={{ color: cfg.color }}>{n}</span>
                  <span className="text-[9px] font-bold text-text-3 uppercase mt-1 tracking-tighter">{cfg.label}</span>
                </div>
              );
            })}
            {lastSync && (
              <div className="flex flex-col items-end border-l border-border pl-6">
                <span className="text-[10px] font-bold text-text-3 uppercase tracking-widest">Last Pulse</span>
                <span className="text-xs font-bold text-text-2 mt-0.5">
                  {lastSync.toLocaleTimeString('en-IN', { hour12: false })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Critical Alerts / Errors */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-600 shadow-sm overflow-hidden"
            >
              <Zap size={18} />
              <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incident Feed Container */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : items.length === 0 ? (
            <div className="py-24 text-center bg-surface2/30 border-2 border-dashed border-border rounded-3xl flex flex-col items-center">
               <ShieldAlert size={40} className="text-text-3 opacity-30 mb-4" />
               <h3 className="text-lg font-bold text-text mb-1">Zero Escalations Found</h3>
               <p className="text-sm text-text-3 max-w-xs mx-auto font-medium">
                 The monitor hasn't detected any signals requiring high-tier intervention.
               </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {items.map(item => (
                <IncidentCard
                  key={item.id}
                  item={item}
                  isNew={newIds.has(item.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        <footer className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-text-3 text-[10px] font-bold uppercase tracking-[0.2em]">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-primary" />
             AI Risk Integrity Engine v2.4
           </div>
           <div>
             © 2026 Maileo Systems • Secure Monitor Link
           </div>
        </footer>
      </motion.div>
    </div>
  );
}
