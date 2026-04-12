import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Filter, RefreshCw, AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';

const API = 'http://127.0.0.1:8000/process-email';
const POLL_MS = 5000;

/* ── Seed data (50 migration entries) ─────────────────── */
const SEED = [
  { id:1,  sender_email:'ceo@acmecorp.com',          subject:'URGENT: Prod DB cluster is down',          classification:'Urgent_Fire',     urgency_score:9,  content:'Server unreachable, need immediate action.' },
  { id:2,  sender_email:'hr@acmecorp.com',            subject:'PTO policy updated for Q2',                classification:'FYI_Read',         urgency_score:2,  content:'Please review the updated leave calendar.' },
  { id:3,  sender_email:'manager@kitcoek.in',         subject:'Project Alpha milestone — action required',classification:'Action_Required',  urgency_score:7,  content:'Submit deliverable by EOD Friday.' },
  { id:4,  sender_email:'recruiter@salesvendor.io',   subject:'Exclusive talent bundle offer',             classification:'Cold_Outreach',    urgency_score:1,  content:'We have 500 contacts for your team.' },
  { id:5,  sender_email:'ops@acmecorp.com',           subject:'Weekly ops digest',                         classification:'FYI_Read',         urgency_score:2,  content:'All systems nominal for the week.' },
  { id:6,  sender_email:'devops@acmecorp.com',        subject:'CI/CD failure on main — hotfix needed',    classification:'Urgent_Fire',      urgency_score:8,  content:'Build #422 failed. Deploy blocked.' },
  { id:7,  sender_email:'sales@partnerco.com',        subject:'Scheduling: Q3 kickoff call',              classification:'Scheduling',       urgency_score:5,  content:'Can we do Thursday 3pm?' },
  { id:8,  sender_email:'legal@acmecorp.com',         subject:'Contract renewal — sign by Friday',        classification:'Action_Required',  urgency_score:7,  content:'NDA renewal attached.' },
  { id:9,  sender_email:'newsletter@techcrunch.com',  subject:'This Week in AI: What you missed',         classification:'FYI_Read',         urgency_score:1,  content:'GPT-6 rumors, Gemini 2.5 Pro, and more.' },
  { id:10, sender_email:'cto@acmecorp.com',           subject:'Architecture decision for Q2',             classification:'Action_Required',  urgency_score:6,  content:'Monolith vs microservices debate due.' },
  { id:11, sender_email:'finance@acmecorp.com',       subject:'Q1 budget variance report',                classification:'FYI_Read',         urgency_score:3,  content:'Overage on cloud costs by 12%.' },
  { id:12, sender_email:'security@acmecorp.com',      subject:'Phishing attempt detected',                classification:'Urgent_Fire',      urgency_score:9,  content:'Employee clicked suspicious link at 09:14.' },
  { id:13, sender_email:'infra@acmecorp.com',         subject:'Disk usage at 87% on primary node',        classification:'Action_Required',  urgency_score:6,  content:'Cleanup required within 48 hours.' },
  { id:14, sender_email:'partner@cloudvendor.com',    subject:'Contract proposal attached',               classification:'Scheduling',       urgency_score:4,  content:'License renewal terms enclosed.' },
  { id:15, sender_email:'exampletcj@gmail.com',       subject:'Personal: Code review notes',              classification:'FYI_Read',         urgency_score:2,  content:'Left comments on your PR.' },
  ...Array.from({length:35}, (_, i) => ({
    id: 16 + i,
    sender_email: `user${i+1}@acmecorp.com`,
    subject: `Migration email ${i+1} — batch processed`,
    classification: ['FYI_Read','Action_Required','Cold_Outreach','Scheduling'][i % 4],
    urgency_score: (i % 7) + 1,
    content: 'Migrated from historical INBOX batch.',
  })),
];

/* ── Classification config ─────────────────────────────── */
const CFG = {
  Urgent_Fire:    { label:'Urgent',    badgeClass:'badge-urgent',   rowClass:'row-urgent',  icon: AlertTriangle },
  FYI_Read:       { label:'FYI',       badgeClass:'badge-fyi',      rowClass:'row-fyi',     icon: CheckCircle2  },
  Action_Required:{ label:'Action',    badgeClass:'badge-action',   rowClass:'row-action',  icon: Clock         },
  Cold_Outreach:  { label:'Cold',      badgeClass:'badge-cold',     rowClass:'row-default', icon: null          },
  Scheduling:     { label:'Schedule',  badgeClass:'badge-schedule', rowClass:'row-team',    icon: null          },
  Individual:     { label:'Team',      badgeClass:'badge-team',     rowClass:'row-team',    icon: Users         },
};

const get = (type) => CFG[type] ?? CFG['FYI_Read'];

/* ── Row animation ─────────────────────────────────────── */
const rowVar = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.22, ease: 'easeOut' } }),
};

/* ── UrgencyBar ────────────────────────────────────────── */
function UrgencyBar({ score }) {
  const pct = ((score ?? 5) / 10) * 100;
  const color = score >= 7 ? '#e11d48' : score >= 4 ? '#d97706' : '#16a34a';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
      <div style={{ width:52, height:4, borderRadius:2, background:'var(--border)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2 }} />
      </div>
      <span style={{ fontSize:11.5, color:'var(--text-3)', fontVariantNumeric:'tabular-nums', minWidth:24 }}>
        {score ?? 5}
      </span>
    </div>
  );
}

/* ── FILTERS ───────────────────────────────────────────── */
const FILTERS = ['All', 'Urgent_Fire', 'Action_Required', 'Scheduling', 'FYI_Read', 'Cold_Outreach'];

/* ═══════════════════════════════════════════════════════
   IntelligenceFeed
══════════════════════════════════════════════════════ */
export default function IntelligenceFeed() {
  const [rows, setRows]       = useState(SEED);
  const [filter, setFilter]   = useState('All');
  const [loading, setLoading] = useState(false);
  const timerRef              = useRef(null);

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await axios.get(API, { timeout: 3000 });
      if (res.data?.emails?.length) setRows(res.data.emails);
    } catch {
      /* keep seed / current data silently */
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    timerRef.current = setInterval(fetchData, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  const displayed = filter === 'All' ? rows : rows.filter(r => r.classification === filter);

  /* ── stat counts ── */
  const urgent = rows.filter(r => r.classification === 'Urgent_Fire').length;
  const action = rows.filter(r => r.classification === 'Action_Required').length;
  const fyi    = rows.filter(r => r.classification === 'FYI_Read').length;

  return (
    <div style={{ padding:'24px 26px' }}>
      {/* Stat cards */}
      <div className="stats-grid">
        {[
          { label:'Urgent',           val: urgent, color:'#e11d48', bg:'rgba(225,29,72,.09)',   icon: AlertTriangle },
          { label:'Action Required',  val: action, color:'#d97706', bg:'rgba(215,119,6,.09)',   icon: Clock         },
          { label:'FYI / Read',       val: fyi,    color:'#16a34a', bg:'rgba(22,163,74,.09)',   icon: CheckCircle2  },
        ].map(({ label, val, color, bg, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={18} color={color} strokeWidth={2} />
            </div>
            <div>
              <div className="stat-val">{val}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="filter-row">
        <Filter size={13} color="var(--text-3)" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-pill${filter === f ? ' active' : ''}`}
          >
            {f === 'All' ? 'All' : get(f).label}
          </button>
        ))}
        <button
          className="btn btn-ghost"
          onClick={() => fetchData(true)}
          style={{ marginLeft:'auto', padding:'4px 10px', fontSize:12 }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:3, padding:0 }}></th>
              <th>Sender</th>
              <th>Subject</th>
              <th>Classification</th>
              <th style={{ textAlign:'right', paddingRight:20 }}>Urgency</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({length:6}).map((_, i) => (
                  <tr key={i}>
                    <td style={{ padding:0, width:3 }} />
                    <td colSpan={4} style={{ padding:'11px 16px' }}>
                      <div className="skeleton" style={{ height:12, width:`${55 + i*7}%` }} />
                    </td>
                  </tr>
                ))
              : (
                <AnimatePresence>
                  {displayed.map((email, i) => {
                    const cfg = get(email.classification);
                    return (
                      <motion.tr
                        key={email.id}
                        custom={i}
                        variants={rowVar}
                        initial="hidden"
                        animate="visible"
                        className={cfg.rowClass}
                      >
                        <td style={{ padding:0, width:3 }} />
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div className="avatar">
                              {email.sender_email?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <span style={{ fontWeight:500, fontSize:13 }}>
                              {email.sender_email}
                            </span>
                          </div>
                        </td>
                        <td style={{ color:'var(--text-2)', fontSize:13, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {email.subject}
                        </td>
                        <td>
                          <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
                        </td>
                        <td style={{ paddingRight:20 }}>
                          <UrgencyBar score={email.urgency_score} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
