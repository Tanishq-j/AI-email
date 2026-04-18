import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Edit3, Trash2, Calendar, 
  Clock, CheckCircle, X, AlertCircle, Sparkles, Tag, Archive,
  LayoutGrid, Activity, MoreHorizontal, ChevronRight,
  ShieldCheck, ArrowUpRight, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function Drafts() {
  const [drafts, setDrafts] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState({});
  const [editingDraft, setEditingDraft] = useState(null);
  const [selectedTime, setSelectedTime] = useState({});

  const fetchContent = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/drafts`),
        axios.get(`${API_BASE}/scheduled-emails`)
      ]);
      setDrafts(dRes.data.drafts);
      setScheduled(sRes.data.scheduled);
    } catch (err) {
      console.error("Fetch error:", err);
      if (!silent) toast.error("Connection sync failed.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
    const interval = setInterval(() => fetchContent(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async (draft) => {
    const id = draft.id;
    setIsExecuting(prev => ({ ...prev, [id]: true }));
    const t = toast.loading(selectedTime[id] ? "Confirming appointment..." : "Executing draft via n8n...");
    
    try {
      if (selectedTime[id] && draft.type === 'Scheduling Proposal') {
        const n8nWebhook = "http://localhost:5678/webhook/meeting-logic";
        
        // 0. Proactively save the chosen time slot in the database
        await axios.patch(`${API_BASE}/email-actions/${draft.email_action_id}/set-time`, {
          scheduled_time: selectedTime[id]
        });

        // 1. Trigger the n8n logic
        await axios.post(n8nWebhook, {
          email_action_id: draft.email_action_id,
          action: "confirm",
          start_time: selectedTime[id],
          recipient: draft.recipient
        });

        await axios.post(`${API_BASE}/execute-draft/${id}`);
        toast.success("Meeting confirmed! Syncing with calendar...", { id: t });
      } else {
        await axios.post(`${API_BASE}/execute-draft/${id}`);
        toast.success("Draft dispatched successfully!", { id: t });
      }
      fetchContent();
    } catch (err) {
      console.error("Execution error:", err);
      toast.error("Execution pipeline error.", { id: t });
    } finally {
      setIsExecuting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSelectSlot = (draft, isoString) => {
    const humanTime = new Date(isoString).toLocaleString('en-IN', { 
      weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' 
    });

    const newContent = draft.content.replace(
      /\[DYNAMIC_SLOTS_HERE\]|I've confirmed our meeting for .* \(IST\)\./g, 
      `I've confirmed our meeting for ${humanTime} (IST).`
    ).replace(
      /I have the following availability \(IST\):\n\n(.*\n)*\nDo any of these times work/g,
      `I have confirmed our meeting for ${humanTime} (IST).\n\nDoes this time still work`
    );

    const finalizedContent = draft.type === 'Scheduling Proposal' ? 
      `Hi,\n\nI've confirmed our meeting for ${humanTime} (IST). I've added it to our calendars.\n\nLooking forward to speaking!` 
      : newContent;

    setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, content: finalizedContent } : d));
    setSelectedTime(prev => ({ ...prev, [draft.id]: isoString }));
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/drafts/${id}`);
      toast.success("Draft discarded.");
      fetchContent();
    } catch (err) {
      toast.error("Discard failed.");
    }
  };

  const handleIgnore = async (actionId) => {
    if (!actionId) return;
    try {
      await axios.put(`${API_BASE}/email-actions/${actionId}/ignore`);
      toast.success("Signal silenced.");
      fetchContent();
    } catch (err) {
      toast.error("Failed to silence signal.");
    }
  };

  const handleUpdate = async (id, content) => {
    try {
      await axios.put(`${API_BASE}/drafts/${id}`, { content });
      toast.success("Draft synchronized.");
      setEditingDraft(null);
      fetchContent();
    } catch (err) {
      toast.error("Update failed.");
    }
  };

  const handleMeetingAction = async (action, item) => {
    const t = toast.loading(`${action === 'cancel' ? 'Cancelling' : action === 'confirm' ? 'Confirming' : 'Initiating Reschedule'}...`);
    try {
      const n8nWebhook = "http://localhost:5678/webhook/meeting-logic";
      await axios.post(n8nWebhook, {
        email_action_id: item.id,
        google_event_id: item.google_event_id,
        action: action,
        start_time: item.scheduled_time, 
        recipient: item.sender, 
      });
      
      toast.success(`Meeting ${action === 'cancel' ? 'cancelled' : action === 'confirm' ? 'confirmed' : 'marked for rescheduling'}.`, { id: t });
      fetchContent();
    } catch (err) {
      toast.error("Lifecycle sync failed.", { id: t });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 min-h-full font-sans">
      <Toaster position="top-right" />
      
      {/* ── Main Draft Hub Section ────────────────────────── */}
      <div className="flex-1 min-w-0">
        <header className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2.5">
              Draft Hub
              <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full uppercase tracking-widest animate-pulse">
                Live Sync
              </span>
            </h2>
            <p className="text-xs text-text-3 font-medium">
              Validate AI suggestions before final command execution
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-7 h-7 rounded-full bg-surface2 border-2 border-surface flex items-center justify-center text-[10px] font-bold text-text-3">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div className="h-6 w-px bg-border mx-2" />
            <div className="bg-surface border border-border px-3 py-1.5 rounded-lg shadow-sm text-[11px] font-bold text-text-2 flex items-center gap-2">
              <Activity size={12} className="text-primary" />
              {drafts.length} Action{drafts.length !== 1 ? 's' : ''} Needed
            </div>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full skeleton" />
                  <div className="h-4 w-32 skeleton rounded" />
                </div>
                <div className="h-20 w-full skeleton rounded-xl" />
                <div className="h-10 w-full skeleton rounded-xl" />
              </div>
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="py-24 text-center bg-surface2/30 border-2 border-dashed border-border rounded-3xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-6 text-text-3 shadow-inner">
              <Archive size={30} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-text mb-2">Zero Active Drafts</h3>
            <p className="text-sm text-text-3 max-w-xs mx-auto leading-relaxed">
              Your intelligence pipeline is clear. New signals will appear here for manual override.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {drafts.map(draft => (
                <motion.div
                  key={draft.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-border/50 flex flex-col sm:flex-row justify-between gap-4 bg-surface2/20">
                    <div className="flex gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                        <Sparkles size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/10">
                            {draft.type}
                          </span>
                          {(draft.tags || []).map(tag => (
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-text-3 bg-surface border border-border px-2 py-0.5 rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="font-bold text-[15px] text-text truncate group-hover:text-primary transition-colors">
                          {draft.subject}
                        </h3>
                        <p className="text-[11px] text-text-3 mt-0.5 flex items-center gap-1.5 font-medium">
                          Recipient: <span className="text-text-2">{draft.recipient}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                       <button 
                        onClick={() => setEditingDraft(draft)}
                        className="p-2.5 rounded-xl bg-surface border border-border text-text-3 hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                        title="Modify Content"
                       >
                        <Edit3 size={16} />
                       </button>
                    </div>
                  </div>

                  {/* Card Content Area */}
                  <div className="p-5">
                    <div className="bg-bg border border-border p-4 rounded-xl text-[13px] text-text-2 leading-relaxed whitespace-pre-wrap font-medium shadow-inner">
                      {draft.content}
                    </div>

                    {/* Scheduling Helper */}
                    {draft.type === 'Scheduling Proposal' && draft.suggested_slots && draft.suggested_slots.length > 0 && (
                      <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar size={13} className="text-primary" />
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Select Meeting Anchor:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {draft.suggested_slots.map((slot, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectSlot(draft, slot)}
                              className={`px-3 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                                selectedTime[draft.id] === slot 
                                  ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' 
                                  : 'bg-surface border-border text-text-2 hover:border-primary/50'
                              }`}
                            >
                              {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(slot).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="px-5 pb-5 pt-1 flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleExecute(draft)}
                      disabled={isExecuting[draft.id] || (draft.type === 'Scheduling Proposal' && !selectedTime[draft.id])}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center py-3 text-sm font-bold shadow-sm shadow-primary/20 disabled:opacity-50 transition-all group/btn"
                    >
                      {isExecuting[draft.id] ? (
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Send size={16} className="mr-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-0.5 transition-transform" /> 
                      )}
                      {isExecuting[draft.id] ? 'Executing Command...' : (selectedTime[draft.id] ? 'Confirm & Dispatch' : (draft.type === 'Scheduling Proposal' ? 'Select Slot to Proceed' : 'Dispatch Draft'))}
                    </button>
                    
                    <div className="flex gap-2.5">
                      <button 
                        onClick={() => handleIgnore(draft.email_action_id)}
                        className="flex-1 sm:flex-none px-5 py-3 bg-surface text-text-2 border border-border rounded-xl hover:bg-surface2 hover:text-text text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Archive size={14} /> Ignore
                      </button>
                      <button 
                        onClick={() => handleDelete(draft.id)}
                        className="px-4 py-3 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                        title="Delete Permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Lifecycle Hub Sidebar ────────────────────────── */}
      <aside className="w-full lg:w-[380px] shrink-0">
        <div className="bg-surface border border-border rounded-2xl sticky top-8 p-6 shadow-sm flex flex-col h-fit">
          <header className="mb-6 flex items-center justify-between border-b border-border pb-5">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" strokeWidth={2.5} />
                Lifecycle Hub
              </h3>
              <p className="text-[10px] text-text-3 font-bold uppercase tracking-widest">
                Active System State
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface2 border border-border flex items-center justify-center text-text-3">
              <Activity size={14} />
            </div>
          </header>

          <div className="space-y-4">
            {scheduled.length === 0 ? (
              <div className="py-12 text-center bg-bg/50 border border-dashed border-border rounded-2xl">
                <Clock size={24} className="mx-auto text-text-3 mb-3 opacity-30" />
                <p className="text-[11px] text-text-3 font-bold uppercase tracking-wider">No Active Schedules</p>
              </div>
            ) : (
              scheduled.map(item => (
                <div key={item.id} className="p-4 bg-bg border border-border rounded-xl hover:border-primary/30 transition-all group/status">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-2">{item.scheduling_status}</span>
                    </div>
                    <button className="text-text-3 hover:text-text transition-colors">
                       <MoreHorizontal size={14} />
                    </button>
                  </div>
                  
                  <h4 className="font-bold text-[13px] text-text truncate mb-1">{item.subject}</h4>
                  <p className="text-[11px] text-text-3 truncate mb-4">Partner: {item.sender}</p>
                  
                  <div className="flex items-center gap-2 text-[11px] font-bold text-primary bg-primary/10 px-3 py-2 rounded-lg border border-primary/10 mb-4">
                    <Calendar size={13} />
                    {item.scheduled_time 
                      ? (() => {
                          const normalized = item.scheduled_time.replace(' ', 'T');
                          const dateObj = new Date(normalized.endsWith('Z') ? normalized : normalized + 'Z');
                          return `${dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} • ${dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}`;
                        })()
                      : 'Awaiting sync...'
                    }
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleMeetingAction('reschedule', item)}
                      className="py-2 rounded-lg bg-surface text-[11px] font-bold text-text-2 border border-border hover:bg-surface2 transition-colors flex items-center justify-center gap-1.5"
                    >
                      Reschedule
                    </button>
                    <button 
                      onClick={() => handleMeetingAction('cancel', item)}
                      className="py-2 rounded-lg bg-red-500/10 text-red-600 text-[11px] font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Footer Insight */}
          <div className="mt-6 p-4 bg-surface2/50 border border-border rounded-xl space-y-2">
             <div className="flex items-center gap-2 text-text-2 font-bold text-[10px] uppercase tracking-wider">
               <AlertCircle size={12} className="text-primary" />
               System Protocol
             </div>
             <p className="text-[11px] text-text-3 leading-relaxed">
               Meeting conflicts are resolved using the <span className="text-text-2 font-semibold">n8n Master Conflict layer</span>. Synchronization happens every 15s.
             </p>
          </div>
        </div>
      </aside>

      {/* ── Manual Review Overlay ─────────────────────────── */}
      <AnimatePresence>
        {editingDraft && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setEditingDraft(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-border flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-surface2/30">
                <div className="space-y-1">
                   <h3 className="font-bold text-lg text-text">Review Signal Payload</h3>
                   <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Manual Command Override</p>
                </div>
                <button onClick={() => setEditingDraft(null)} className="p-2 hover:bg-surface2 rounded-full transition-colors text-text-3"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto bg-bg">
                <textarea 
                  className="w-full min-h-[300px] bg-surface border border-border rounded-2xl p-5 text-[14px] text-text-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y font-sans leading-relaxed transition-shadow shadow-inner"
                  value={editingDraft.content}
                  onChange={(e) => setEditingDraft({...editingDraft, content: e.target.value})}
                />
              </div>
              <div className="p-6 border-t border-border bg-surface2/30 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setEditingDraft(null)} 
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-text-3 hover:bg-surface2 transition-colors"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={() => handleUpdate(editingDraft.id, editingDraft.content)}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all flex items-center gap-2"
                >
                  Save & Sync <ArrowUpRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
