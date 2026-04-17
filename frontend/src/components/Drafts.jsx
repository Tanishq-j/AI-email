import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Edit3, Trash2, Calendar, 
  Clock, CheckCircle, X, AlertCircle, Sparkles, Tag, Archive
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
        
        await axios.post(n8nWebhook, {
          email_action_id: draft.email_action_id,
          action: "confirm",
          start_time: selectedTime[id],
          recipient: draft.recipient
        });

        await axios.patch(`${API_BASE}/email-actions/${draft.email_action_id}/confirm`, {
          google_event_id: `PENDING_SYNC_${draft.email_action_id}`,
          scheduled_time: selectedTime[id]
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
    <div className="p-8 max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-10 min-h-full">
      <Toaster position="top-right" 
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '12px',
          }
        }} 
      />
      
      {/* Drafts Section */}
      <div className="flex-1 max-w-4xl">
        <header className="mb-10 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Intelligence Drafts
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
              AI recommendations awaiting final state transition
            </p>
          </div>
          <div className="px-4 py-2 bg-gray-100 dark:bg-[#111] rounded-full border border-gray-200 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 whitespace-nowrap self-start sm:self-auto">
             {drafts.length} Action{drafts.length !== 1 ? 's' : ''} Pending
          </div>
        </header>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-[#0a0a0a] animate-pulse w-full rounded-2xl" />)}
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-24 text-center bg-transparent border-2 border-dashed border-gray-200 dark:border-gray-800/80 rounded-3xl">
            <Archive size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-6" />
            <p className="text-gray-900 dark:text-gray-100 font-bold text-xl mb-2">Zero pending drafts.</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">New intelligence signals will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {drafts.map(draft => (
                <motion.div
                  key={draft.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800/60 rounded-3xl p-8 shadow-sm group relative"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-3">
                       <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-[11px] font-bold uppercase rounded-full tracking-wider">
                          <Sparkles size={12} /> {draft.type}
                        </span>
                        {(draft.tags || []).map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-bold uppercase rounded-full tracking-wider">
                             <Tag size={12} /> {tag}
                          </span>
                        ))}
                       </div>
                      <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 leading-tight">{draft.subject}</h3>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide">
                        <span className="uppercase tracking-widest text-[10px] mr-2">Recipient</span> 
                        {draft.recipient}
                      </p>
                    </div>
                    <button 
                      onClick={() => setEditingDraft(draft)}
                      className="p-3 bg-gray-50 dark:bg-[#111111] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors border border-gray-200 dark:border-gray-800"
                      title="Edit Draft"
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>

                  <div className="bg-gray-50/50 dark:bg-[#111111] p-6 rounded-2xl text-sm text-gray-700 dark:text-gray-300 mb-8 border border-gray-100 dark:border-gray-800/80 leading-relaxed font-sans shadow-inner whitespace-pre-wrap">
                    {draft.content}
                  </div>

                  {draft.type === 'Scheduling Proposal' && draft.suggested_slots && draft.suggested_slots.length > 0 && (
                    <div className="mb-8 p-5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                        <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest">Select a time to confirm mapping:</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {draft.suggested_slots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSlot(draft, slot)}
                            className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold border transition-all ${
                              selectedTime[draft.id] === slot 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-400'
                            }`}
                          >
                            {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(slot).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button 
                      onClick={() => handleExecute(draft)}
                      disabled={isExecuting[draft.id] || (draft.type === 'Scheduling Proposal' && !selectedTime[draft.id])}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center py-3.5 text-sm font-bold shadow-sm disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors"
                    >
                      <Send size={16} className={`mr-2 ${isExecuting[draft.id] ? 'animate-pulse' : ''}`} /> 
                      {isExecuting[draft.id] ? 'Processing Protocol...' : (selectedTime[draft.id] ? 'Confirm & Dispatch' : (draft.type === 'Scheduling Proposal' ? 'Select Slot to Dispatch' : 'Execute Command'))}
                    </button>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleIgnore(draft.email_action_id)}
                        className="px-6 py-3 bg-gray-50 dark:bg-[#111] text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-sm font-semibold flex items-center gap-2 transition-colors"
                        title="Archive Signal"
                      >
                        <X size={16} /> Ignore
                      </button>
                      <button 
                        onClick={() => handleDelete(draft.id)}
                        className="px-4 py-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl border border-red-100 dark:border-red-900/30 transition-colors"
                        title="Discard Draft Entirely"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Management Sidebar */}
      <div className="w-full lg:w-96 shrink-0 lg:pt-1">
        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800/60 rounded-3xl sticky top-8 p-7 shadow-sm">
          <header className="mb-8 pb-6 border-b border-gray-100 dark:border-gray-800/80">
            <h3 className="font-bold text-sm uppercase tracking-[0.15em] text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-md">
                <Calendar size={16} className="text-emerald-600 dark:text-emerald-500" strokeWidth={2.5} />
              </div>
              Lifecycle Hub
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 font-semibold uppercase tracking-wider">
              Monitoring Active Commitments
            </p>
          </header>

          {scheduled.length === 0 ? (
            <div className="py-14 text-center bg-gray-50 dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800/60">
              <Clock size={28} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">No Active Schedules</p>
            </div>
          ) : (
            <div className="space-y-5">
              {scheduled.map(item => (
                <div key={item.id} className="p-5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800/80 rounded-2xl hover:border-emerald-500/30 transition-colors shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{item.scheduling_status}</span>
                  </div>
                  <h4 className="font-bold text-sm mb-1.5 truncate text-gray-900 dark:text-gray-100">{item.subject}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-5">Party: {item.sender}</p>
                  
                  <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2.5 rounded-xl mb-5 border border-emerald-100 dark:border-emerald-900/30">
                    <Clock size={14} />
                    {item.scheduled_time 
                      ? `${new Date(item.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(item.scheduled_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                      : 'Awaiting sync...'
                    }
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button 
                      onClick={() => handleMeetingAction('reschedule', item)}
                      className="py-2.5 rounded-lg bg-white dark:bg-[#1a1a1a] text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#222]"
                    >
                      Reschedule
                    </button>
                    <button 
                      onClick={() => handleMeetingAction('cancel', item)}
                      className="py-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-8 p-4 bg-gray-50 dark:bg-[#111] rounded-xl text-xs text-gray-500 dark:text-gray-400 leading-relaxed border border-gray-200 dark:border-gray-800">
            <span className="font-bold text-gray-700 dark:text-gray-300">System Protocol:</span> Calendar blocks are continuously synchronized using the n8n Master Conflict layer. 
          </div>
        </div>
      </div>

      {/* Edit Overlay */}
      <AnimatePresence>
        {editingDraft && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setEditingDraft(null)}
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#0a0a0a] w-full max-w-3xl rounded-[32px] shadow-2xl relative z-10 overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#111111]">
                <div>
                   <h3 className="font-bold text-xl text-gray-900 dark:text-white">Review & Edit Draft</h3>
                   <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase mt-1.5 tracking-wider">Manual Content Override</p>
                </div>
                <button onClick={() => setEditingDraft(null)} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"><X size={20} strokeWidth={2.5} /></button>
              </div>
              <div className="p-6 sm:p-8 overflow-y-auto">
                <textarea 
                  className="w-full min-h-[300px] bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-[15px] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y font-sans leading-relaxed transition-shadow"
                  value={editingDraft.content}
                  onChange={(e) => setEditingDraft({...editingDraft, content: e.target.value})}
                />
              </div>
              <div className="p-6 sm:p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#111111] flex justify-end gap-3 sm:gap-4 shrink-0">
                <button 
                  onClick={() => setEditingDraft(null)} 
                  className="px-6 py-3.5 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={() => handleUpdate(editingDraft.id, editingDraft.content)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  Save & Synchronize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
