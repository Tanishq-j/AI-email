import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Users, FileSearch, X, ExternalLink,
  BrainCircuit, Calendar, Search, Inbox
} from 'lucide-react';
import { useEmails } from '../hooks/useEmails';
import toast from 'react-hot-toast';
import axios from 'axios';

const CFG = {
  Urgent_Fire: { label: 'Urgent', badgeClass: 'badge-urgent', rowClass: 'row-urgent', icon: AlertTriangle },
  FYI_Read: { label: 'FYI', badgeClass: 'badge-fyi', rowClass: 'row-fyi', icon: CheckCircle2 },
  Action_Required: { label: 'Action', badgeClass: 'badge-action', rowClass: 'row-action', icon: Clock },
  Cold_Outreach: { label: 'Cold', badgeClass: 'badge-cold', rowClass: 'row-default', icon: null },
  Scheduling: { label: 'Schedule', badgeClass: 'badge-schedule', rowClass: 'row-team', icon: Calendar },
  Individual: { label: 'Team', badgeClass: 'badge-team', rowClass: 'row-team', icon: Users },
};

const getCfg = (type) => CFG[type] ?? CFG['FYI_Read'];

const FILTERS = ['All', 'Urgent_Fire', 'Action_Required', 'Scheduling', 'FYI_Read'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 200 } }
};

/* ── Detail Slide-Over ────────────────────────────────── */
const EmailDetail = ({ email, onClose }) => {
  if (!email) return null;
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="detail-panel flex flex-col h-full bg-surface"
    >
      {/* Header */}
      <div className="p-5 border-b border-border flex justify-between items-center bg-surface shrink-0">
        <div>
          <h3 className="font-bold text-[15px] text-text">Intelligence Analysis</h3>
          <p className="text-[10px] text-text-3 uppercase tracking-widest mt-0.5">Signal ID: #{email.id}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-surface2 rounded-full transition-colors text-text-2">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-bg">
        {/* Profile Section */}
        <section className="bg-surface border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 shrink-0">
              {email.sender_email?.[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-text text-[13px] leading-tight truncate">{email.sender_email}</p>
              <p className="text-xs text-text-2 mt-0.5 truncate">{email.subject}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${getCfg(email.classification).badgeClass}`}>
              {getCfg(email.classification).label}
            </span>
            <span className="badge badge-cold">
              Urgency: {email.urgency_score || 0}%
            </span>
          </div>
        </section>

        {/* Intelligence Breakdown */}
        <section className="space-y-3">
          <h4 className="text-[10px] font-bold text-text-3 uppercase tracking-widest flex items-center gap-1.5">
            <ExternalLink size={12} /> Extracted Content
          </h4>
          <div className="bg-surface p-4 rounded-xl text-[12px] text-text-2 leading-relaxed whitespace-pre-wrap border border-border shadow-sm">
            {email.content || "No content extracted by pipeline."}
          </div>
        </section>

        {/* Vision Section */}
        {email.attachment_analysis && (
          <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
              <BrainCircuit size={12} /> Vision Insight
            </h4>
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl text-[12px] text-text border-l-2 border-l-primary leading-relaxed shadow-sm">
              {email.attachment_analysis}
            </div>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-surface shrink-0">
        <button
          onClick={() => {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            const t = toast.loading("Promoting intelligence to Hub...");
            axios.post(`${API_BASE}/drafts`, {
              email_action_id: email.id,
              content: email.suggested_draft || "DRAFT: Manual review required.",
              recipient: email.sender_email,
              subject: `Re: ${email.subject}`,
              type: email.classification === 'Scheduling' ? 'Scheduling' : 'General',
              reasoning: email.intelligence_reasoning,
              tags: [email.classification, "Manual-Promotion"]
            }).then(() => {
              toast.success("Ready for review in Draft Hub!", { id: t });
              onClose();
            }).catch(e => toast.error("Promotion pipeline break.", { id: t }));
          }}
          className="w-full bg-primary hover:bg-primary/90 text-white transition-colors py-3 rounded-lg flex items-center justify-center text-xs font-bold shadow-md shadow-primary/20"
        >
          Stage for Review
        </button>
      </div>
    </motion.div>
  );
};

/* ── Main Component ───────────────────────────────────── */
export default function IntelligenceFeed({ embedded = false }) {
  const { emails, loading, error, refetch } = useEmails();
  const [filter, setFilter] = useState('All');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBySearch = searchQuery
    ? emails.filter(e =>
      e.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.sender_email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : emails;

  const displayed = filter === 'All' ? filteredBySearch : filteredBySearch.filter(e => e.classification === filter);

  return (
    <div className={`min-h-full font-sans ${embedded ? '' : 'bg-bg pb-6 pt-3'}`}>
      <motion.div
        className={embedded ? '' : 'w-full max-w-[1800px] px-3 md:px-5 mx-auto'}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {!embedded && (
          <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-2.5">
            <h1 className="text-lg font-bold tracking-tight text-text flex items-center gap-2">
              Intelligence Feed
            </h1>
            <div className="flex items-center gap-3">
              <button onClick={refetch} className="flex items-center gap-1.5 text-xs font-semibold text-text-2 bg-surface shadow-sm border border-border px-3 py-1.5 rounded-md hover:bg-surface2 transition-colors">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Top Actions & Filters Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
          {/* Minimal Categorization Tabs */}
          <div className="flex gap-5 border-b border-border overflow-x-auto w-full md:w-auto scrollbar-none">
            {FILTERS.map(f => {
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`pb-2 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors relative ${isActive ? 'text-text' : 'text-text-3 hover:text-text-2'}`}
                >
                  {f === 'All' ? 'All Signals' : getCfg(f).label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabFeed"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-text"
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="relative w-full md:w-auto">
            <input
              type="text"
              placeholder="Search signals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-full md:w-[220px] bg-surface border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-shadow text-text shadow-sm"
            />
            <Search size={13} className="absolute left-3 top-2 text-text-3" />
          </div>
        </div>

        {/* Full-Width Horizontal Cards List */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-3"
        >
          <AnimatePresence initial={false}>
            {loading && emails.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-10 h-10 rounded-full skeleton shrink-0" />
                  <div className="flex-1 space-y-2 w-full">
                    <div className="skeleton h-4 w-1/4 rounded" />
                    <div className="skeleton h-3 w-3/4 rounded" />
                  </div>
                  <div className="skeleton h-8 w-24 rounded shrink-0 hidden md:block" />
                </div>
              ))
            ) : (
              displayed.map((email) => {
                const cfg = getCfg(email.classification);

                // Determine accent color
                let accentColor = 'bg-transparent';
                if (cfg.rowClass.includes('urgent')) accentColor = 'bg-[#e11d48]'; // rose-600
                else if (cfg.rowClass.includes('team')) accentColor = 'bg-[#2563eb]'; // blue-600
                else if (cfg.rowClass.includes('fyi')) accentColor = 'bg-[#16a34a]'; // green-600

                return (
                  <motion.div
                    key={email.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    layout
                    onClick={() => setSelectedEmail(email)}
                    className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group flex flex-col md:flex-row items-start md:items-center gap-4 relative overflow-hidden"
                  >
                    {/* Accent line */}
                    <div className={`absolute top-0 left-0 w-1 md:w-1.5 h-full ${accentColor} opacity-80`} />

                    {/* Sender Info (Left) */}
                    <div className="flex items-center gap-3 min-w-[200px] md:max-w-[240px] pl-2 shrink-0">
                      <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center text-[13px] font-bold border border-border group-hover:border-primary/40 transition-colors text-text-2 shrink-0">
                        {email.sender_email?.[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <span className="truncate font-semibold text-[13px] text-text">{email.sender_email}</span>
                        <span className="text-[10px] text-text-3 uppercase tracking-wider mt-0.5 font-medium">#{email.id ? email.id.toString().substring(0, 6) : 'SYS'}</span>
                      </div>
                    </div>

                    {/* Content (Center) */}
                    <div className="flex-1 min-w-0 md:border-l md:border-border/50 md:pl-6">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[14px] text-text leading-tight truncate group-hover:text-primary transition-colors">
                          {email.subject}
                        </h3>
                        {email.attachment_analysis && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20 text-primary shrink-0">
                            <FileSearch size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Vision</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[12px] text-text-2 line-clamp-1 leading-relaxed">
                        {email.content || "No extracted content available."}
                      </p>
                    </div>

                    {/* Meta & Actions (Right) */}
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto md:min-w-[280px] pt-3 md:pt-0 border-t md:border-t-0 border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`badge ${cfg.badgeClass} shadow-sm px-2.5 py-1`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="w-9 h-9 rounded-lg bg-surface2 flex items-center justify-center text-text-3 group-hover:bg-primary group-hover:text-white transition-all shrink-0 border border-transparent group-hover:border-primary/30 shadow-sm ml-2">
                        <BrainCircuit size={16} />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}

            {/* Empty State */}
            {!loading && displayed.length === 0 && (
              <div className="py-16 flex flex-col items-center justify-center text-text-3 bg-surface border border-dashed border-border rounded-xl w-full">
                <Inbox size={36} className="mb-3 opacity-40" />
                <span className="text-sm font-semibold">No signals match the current criteria.</span>
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {error && !loading && (
          <div className="mt-6 p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-lg text-center font-bold tracking-wide">
            ⚠️ {error}. Trying to reconnect brain layers...
          </div>
        )}
      </motion.div>

      {/* Slide-Over Overlay Hub */}
      <AnimatePresence>
        {selectedEmail && (
          <div className="fixed inset-0 z-[1500]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmail(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <EmailDetail email={selectedEmail} onClose={() => setSelectedEmail(null)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
