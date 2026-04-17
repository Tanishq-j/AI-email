import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Edit3, Trash2, Calendar, 
  Clock, CheckCircle, X, AlertCircle, Sparkles, Tag
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

        // We rely entirely on n8n successfully updating the backend database with the real event ID.

        // 3. Mark the draft as executed in the database so it disappears
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

    // Fallback: If the draft is a proposal, simplify the text to a confirmation format
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
      // Trigger Unified Master Meeting Controller
      const n8nWebhook = "http://localhost:5678/webhook/meeting-logic";
      await axios.post(n8nWebhook, {
        email_action_id: item.id,
        google_event_id: item.google_event_id,
        action: action,
        start_time: item.scheduled_time, // for confirm
        recipient: item.sender, // for confirm
      });
      
      toast.success(`Meeting ${action === 'cancel' ? 'cancelled' : action === 'confirm' ? 'confirmed' : 'marked for rescheduling'}.`, { id: t });
      fetchContent();
    } catch (err) {
      toast.error("Lifecycle sync failed.", { id: t });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex gap-10">
      <Toaster position="top-right" />
      
      {/* Drafts Section */}
      <div className="flex-1">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-text to-text-3 bg-clip-text text-transparent">
              Intelligence Drafts
            </h2>
            <p className="text-sm text-text-3 mt-1 font-medium italic">
              AI recommendations awaiting state transition
            </p>
          </div>
          <div className="px-4 py-2 bg-surface2 rounded-2xl border border-border text-[11px] font-bold uppercase tracking-wider text-text-3">
             {drafts.length} pending
          </div>
        </header>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 w-full rounded-[32px]" />)}
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-20 text-center glass-card border-dashed">
            <Sparkles size={40} className="mx-auto text-primary mb-6 opacity-30" />
            <p className="text-text-2 font-bold text-lg">Your draft hub is clear.</p>
            <p className="text-text-3 text-sm mt-2">Incoming signals will appear here for review.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            <AnimatePresence>
              {drafts.map(draft => (
                <motion.div
                  key={draft.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card group relative p-8"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-2">
                       <div className="flex gap-2">
                        <span className="badge badge-primary flex items-center gap-1.5">
                          <Sparkles size={10} /> {draft.type}
                        </span>
                        {(draft.tags || []).map(tag => (
                          <span key={tag} className="badge badge-cold flex items-center gap-1">
                             <Tag size={10} /> {tag}
                          </span>
                        ))}
                       </div>
                      <h3 className="font-bold text-xl text-text leading-tight">{draft.subject}</h3>
                      <p className="text-xs font-bold text-text-3 uppercase tracking-widest">Recipient: {draft.recipient}</p>
                    </div>
                    <button 
                      onClick={() => setEditingDraft(draft)}
                      className="p-3 bg-surface hover:bg-surface2 rounded-2xl text-text-3 hover:text-primary transition-all shadow-inner border border-border/50"
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>

                  <div className="bg-black/10 backdrop-blur-md p-6 rounded-3xl text-sm text-text-2 mb-6 border border-white/5 leading-relaxed font-sans shadow-inner whitespace-pre-wrap">
                    {draft.content}
                  </div>

                  {/* RALPH LOOP: Interactive Slot Selection Buttons */}
                  {draft.type === 'Scheduling Proposal' && draft.suggested_slots && draft.suggested_slots.length > 0 && (
                    <div className="mb-8">
                      <p className="text-[10px] font-bold text-text-3 uppercase tracking-widest mb-3 ml-1">Select a time to confirm:</p>
                      <div className="flex flex-wrap gap-2">
                        {draft.suggested_slots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSlot(draft, slot)}
                            className={`px-4 py-2.5 rounded-2xl text-[11px] font-bold border transition-all ${
                              selectedTime[draft.id] === slot 
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                : 'bg-surface2 border-border text-text-2 hover:border-primary/40'
                            }`}
                          >
                            {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(slot).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleExecute(draft)}
                      disabled={isExecuting[draft.id] || (draft.type === 'Scheduling Proposal' && !selectedTime[draft.id])}
                      className="flex-1 btn btn-primary justify-center py-4 text-sm font-bold shadow-xl shadow-primary/25 disabled:opacity-40 disabled:scale-100 group-hover:scale-[1.01] transition-transform"
                    >
                      <Send size={16} className={isExecuting[draft.id] ? 'animate-pulse' : ''} /> 
                      {isExecuting[draft.id] ? 'Processing...' : (selectedTime[draft.id] ? 'Confirm & Dispatch' : (draft.type === 'Scheduling Proposal' ? 'Select Slot to Confirm' : 'Execute Command'))}
                    </button>
                    <button 
                      onClick={() => handleIgnore(draft.email_action_id)}
                      className="px-5 btn btn-ghost bg-surface2 text-text-3 hover:text-text border border-border flex items-center gap-2"
                      title="Ignore signal and archive"
                    >
                      <X size={16} /> Ignore
                    </button>
                    <button 
                      onClick={() => handleDelete(draft.id)}
                      className="px-4 btn btn-ghost bg-red-500/5 text-red-400 hover:bg-red-500/10 border-red-500/20"
                      title="Discard draft"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Management Sidebar */}
      <div className="w-96 shrink-0">
        <div className="glass-card sticky top-8 p-8 border-primary/10 bg-primary/2">
          <header className="mb-8 border-b border-border/50 pb-6">
            <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-primary flex items-center gap-3">
              <Calendar size={16} strokeWidth={2.5} /> Lifecycle Hub
            </h3>
            <p className="text-[10px] text-text-3 mt-2 font-bold">MONITORING ACTIVE STATES</p>
          </header>

          {scheduled.length === 0 ? (
            <div className="py-12 text-center bg-black/5 rounded-[28px] border border-white/5">
              <Clock size={24} className="mx-auto text-text-3 mb-4 opacity-20" />
              <p className="text-[11px] text-text-3 font-bold uppercase tracking-widest">No Active Commitments</p>
            </div>
          ) : (
            <div className="space-y-6">
              {scheduled.map(item => (
                <div key={item.id} className="p-6 bg-surface border border-border rounded-[28px] shadow-sm hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-2">{item.scheduling_status}</span>
                  </div>
                  <h4 className="font-bold text-sm mb-1.5 truncate text-text">{item.subject}</h4>
                  <p className="text-[11px] text-text-3 line-clamp-1 mb-5">Engagement: {item.sender}</p>
                  
                  <div className="flex items-center gap-3 text-[11px] font-bold text-primary bg-primary/5 px-4 py-3 rounded-2xl mb-6 border border-primary/10">
                    <Clock size={14} />
                    {item.scheduled_time 
                      ? `${new Date(item.scheduled_time + (item.scheduled_time.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(item.scheduled_time + (item.scheduled_time.endsWith('Z') ? '' : 'Z')).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                      : 'Time Pending Sync...'
                    }
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleMeetingAction('reschedule', item)}
                      className="py-2.5 rounded-xl bg-surface2 text-[10px] font-bold border border-border hover:bg-surface transition-all active:scale-95"
                    >
                      Reschedule
                    </button>
                    <button 
                      onClick={() => handleMeetingAction('cancel', item)}
                      className="py-2.5 rounded-xl bg-red-500/5 text-red-500 text-[10px] font-bold border border-red-500/10 hover:bg-red-500/10 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-10 p-5 bg-black/10 rounded-2xl text-[10px] text-text-3 leading-relaxed border border-white/5 italic">
            <strong>System Note:</strong> Confirmed meetings are synced with n8n Conflict Check protocols every 15 minutes.
          </div>
        </div>
      </div>

      {/* Edit Overlay */}
      <AnimatePresence>
        {editingDraft && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setEditingDraft(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="glass-card w-full max-w-3xl rounded-[40px] shadow-3xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-border/50 flex justify-between items-center bg-white/2">
                <div>
                   <h3 className="font-bold text-lg">Commit Intelligence</h3>
                   <p className="text-[10px] font-bold text-text-3 uppercase mt-1">Manual Content Override</p>
                </div>
                <button onClick={() => setEditingDraft(null)} className="p-2 hover:bg-surface rounded-xl"><X size={20} /></button>
              </div>
              <div className="p-8">
                <textarea 
                  className="w-full h-80 bg-black/20 border border-white/10 rounded-[30px] p-6 text-base text-text-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-sans leading-relaxed shadow-inner"
                  value={editingDraft.content}
                  onChange={(e) => setEditingDraft({...editingDraft, content: e.target.value})}
                />
              </div>
              <div className="p-8 bg-black/10 flex justify-end gap-4">
                <button onClick={() => setEditingDraft(null)} className="px-6 py-3 rounded-2xl font-bold text-sm text-text-3 hover:bg-surface transition-colors">Abort</button>
                <button 
                  onClick={() => handleUpdate(editingDraft.id, editingDraft.content)}
                  className="btn btn-primary px-10 py-3 text-sm font-bold shadow-lg shadow-primary/20"
                >
                  Synchronize State
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
