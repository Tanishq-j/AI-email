import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Activity, RefreshCw, AlertTriangle, CheckCircle, Info, Zap, Clock } from 'lucide-react';

const API = 'http://127.0.0.1:8000/api/v1/monitor/escalations?limit=15';
const POLL_INTERVAL = 12000; // 12 seconds

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  critical_escalation: {
    label: 'Critical',
    color: '#e11d48',
    bg: 'rgba(225,29,72,0.08)',
    border: 'rgba(225,29,72,0.25)',
    pulse: true,
    icon: AlertTriangle,
  },
  flagated_high: {
    label: 'High',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.25)',
    pulse: false,
    icon: AlertTriangle,
  },
  flagged_medium: {
    label: 'Medium',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.25)',
    pulse: false,
    icon: Info,
  },
  flagged_low: {
    label: 'Low',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.06)',
    border: 'rgba(37,99,235,0.18)',
    pulse: false,
    icon: Info,
  },
  resolved: {
    label: 'Resolved',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.08)',
    border: 'rgba(22,163,74,0.25)',
    pulse: false,
    icon: CheckCircle,
  },
  false_positive: {
    label: 'False +',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.08)',
    border: 'rgba(100,116,139,0.2)',
    pulse: false,
    icon: CheckCircle,
  },
  New: {
    label: 'Unprocessed',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.06)',
    border: 'rgba(100,116,139,0.15)',
    pulse: false,
    icon: Clock,
  },
};

const DEFAULT_STATUS = {
  label: 'Pending',
  color: '#94a3b8',
  bg: 'rgba(148,163,184,0.08)',
  border: 'rgba(148,163,184,0.2)',
  pulse: false,
  icon: Clock,
};

function getStatus(key) {
  return STATUS_CONFIG[key] ?? DEFAULT_STATUS;
}

// ── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, color }) {
  const pct = Math.min(Math.max(score ?? 0, 0), 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 4, borderRadius: 2,
        background: 'var(--surface2)', overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 2, background: color }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 30, textAlign: 'right' }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Single incident card ─────────────────────────────────────────────────────

function IncidentCard({ item, isNew }) {
  const cfg = getStatus(item.scheduling_status);
  const Icon = cfg.icon;

  const ts = item.created_at
    ? new Date(item.created_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
        hour12: true,
      })
    : '—';

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 7,
        padding: '13px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pulsing overlay for critical */}
      {cfg.pulse && (
        <motion.div
          animate={{ opacity: [0.06, 0.14, 0.06] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0,
            background: cfg.color,
            pointerEvents: 'none', borderRadius: 7,
          }}
        />
      )}

      {/* Row 1: status badge + id + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10.5, fontWeight: 700,
          padding: '2px 7px', borderRadius: 4,
          background: cfg.bg, color: cfg.color,
          border: `1px solid ${cfg.border}`,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {cfg.pulse && (
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block' }}
            />
          )}
          <Icon size={10} />
          {cfg.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
          #{item.id}
        </span>
        {item.classification && (
          <span style={{
            fontSize: 10.5, color: 'var(--text-3)',
            border: '1px solid var(--border)',
            padding: '1px 6px', borderRadius: 3,
          }}>
            {item.classification.replace(/_/g, ' ')}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>
          {ts}
        </span>
      </div>

      {/* Row 2: subject / summary */}
      <div>
        {item.subject && (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
            {item.subject}
          </div>
        )}
        {item.summary && (
          <div style={{
            fontSize: 12, color: 'var(--text-2)',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.summary}
          </div>
        )}
      </div>

      {/* Row 3: score bar */}
      {typeof item.urgency_score === 'number' && (
        <ScoreBar score={item.urgency_score} color={cfg.color} />
      )}

      {/* Row 4: sender */}
      {item.sender_email && (
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          From: <span style={{ color: 'var(--text-2)' }}>{item.sender_email}</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 7, padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="skeleton" style={{ width: 60, height: 18, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: 36, height: 14, borderRadius: 3 }} />
        <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 3, marginLeft: 'auto' }} />
      </div>
      <div className="skeleton" style={{ width: '70%', height: 16, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: '90%', height: 13, borderRadius: 3 }} />
      <div className="skeleton" style={{ width: '100%', height: 4, borderRadius: 2 }} />
    </div>
  );
}

// ── Tier legend ──────────────────────────────────────────────────────────────

function TierLegend() {
  const tiers = [
    { label: 'Tier 1', desc: '0–50%', color: '#2563eb' },
    { label: 'Tier 2', desc: '51–70%', color: '#2563eb' },
    { label: 'Tier 3', desc: '71–85%', color: '#d97706' },
    { label: 'Tier 4', desc: '86–100%', color: '#e11d48' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {tiers.map(t => (
        <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.desc}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

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
      setError('Could not reach backend. Is FastAPI running on port 8000?');
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
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ padding: '24px 26px', maxWidth: 860 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={16} color="var(--primary)" strokeWidth={2} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            Escalation Monitor
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px',
            borderRadius: 4, background: 'var(--primary-bg)', color: 'var(--primary)',
            border: '1px solid rgba(225,29,72,0.2)',
          }}>
            Live
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastSync && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Synced {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <motion.button
            onClick={() => fetchData(true)}
            animate={spinning ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-2)', cursor: 'pointer',
              fontSize: 12, fontWeight: 500,
            }}
          >
            <RefreshCw size={12} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Tier legend */}
      <div style={{
        marginBottom: 16,
        padding: '10px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
      }}>
        <TierLegend />
        {/* Status counts */}
        <div style={{ display: 'flex', gap: 12 }}>
          {Object.entries(counts).map(([status, n]) => {
            const cfg = getStatus(status);
            return (
              <span key={status} style={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>
                {n} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 6, marginBottom: 14,
          background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.2)',
          color: '#e11d48', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Zap size={13} /> {error}
        </div>
      )}

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : items.length === 0 ? (
          <div style={{
            padding: '32px 0', textAlign: 'center',
            color: 'var(--text-3)', fontSize: 13,
          }}>
            No escalation records found. Run a tier test to see results here.
          </div>
        ) : (
          <AnimatePresence>
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
    </motion.div>
  );
}
