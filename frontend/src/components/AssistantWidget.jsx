import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, MessageSquare } from 'lucide-react';
import axios from 'axios';

const CHIPS = ['Draft a professional reply', 'Identify urgent tasks', 'Analyze Vision Archive'];

const SPRING_CONFIG = { type: 'spring', stiffness: 300, damping: 30 };

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API = `${BASE_URL}/chat-assistant`;

export default function AssistantWidget({ pageContext = 'Home' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your SoMailer Assistant. How can I help you manage your networking intelligence today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const onSend = async (text) => {
    const val = text || input;
    if (!val || loading) return;

    const userMsg = { role: 'user', text: val };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Token Management: Truncate history to last 10 turns
      const history = messages.slice(-10);

      const response = await axios.post(API, {
        message: val,
        page_context: pageContext,
        history: history
      });

      setMessages(prev => [...prev, { role: 'bot', text: response.data.text }]);
    } catch (err) {
      console.error("Assistant Error:", err);
      setMessages(prev => [...prev, { role: 'bot', text: "I'm having trouble connecting to the brain right now. Please try again shortly." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assistant-widget">
      <AnimatePresence>
        {open && (
          <motion.div
            className="assistant-panel"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={SPRING_CONFIG}
          >
            {/* Header */}
            <div className="assistant-header">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--primary)]" />
                <span className="tracking-tight">SoMailer Intelligence</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Context Breadcrumb */}
            <div className="px-4 py-2 bg-[var(--surface2)] border-bottom border-[var(--border)] text-[10px] uppercase font-bold tracking-widest text-[var(--text-3)] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              Focus: {pageContext.replace(/([A-Z])/g, ' $1').trim()}
            </div>

            {/* Messages */}
            <div className="assistant-messages" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
                  {m.text}
                </div>
              ))}
              {loading && (
                <div className="msg msg-bot flex items-center gap-3">
                  <div className="thinking-glow" />
                  <span className="text-[11px] font-medium italic opacity-70">Analyzing logs...</span>
                </div>
              )}
            </div>

            {/* Chips */}
            <div className="assistant-chips">
              {CHIPS.map(c => (
                <button key={c} className="chip" onClick={() => onSend(c)}>{c}</button>
              ))}
            </div>

            {/* Input */}
            <div className="assistant-input-row">
              <input
                className="assistant-input"
                placeholder="Ask your brain..."
                value={input}
                disabled={loading}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSend()}
              />
              <button className="send-btn" onClick={() => onSend()} disabled={loading || !input.trim()}>
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="assistant-fab ring-4 ring-offset-2 ring-transparent active:ring-[var(--primary-bg)]"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {open ? <MessageSquare size={22} /> : <Bot size={22} />}
      </motion.button>
    </div>
  );
}
