import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles } from 'lucide-react';

const CHIPS = ['Summarize urgent', 'Tasks for today', 'Cold outreach count'];

const INIT = [{ role:'bot', text:'How can I help you with your inbox today?' }];

export default function AssistantWidget() {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState(INIT);
  const [input, setInput]     = useState('');

  const send = (text) => {
    const t = text?.trim() || input.trim();
    if (!t) return;
    setMsgs(m => [
      ...m,
      { role:'user', text: t },
      { role:'bot',  text: `Analyzing: "${t}" against your 50-email dataset and LangGraph state...` },
    ]);
    setInput('');
  };

  return (
    <div className="assistant-widget">
      <AnimatePresence>
        {open && (
          <motion.div
            className="assistant-panel"
            initial={{ opacity:0, y:10, scale:.95 }}
            animate={{ opacity:1, y:0,  scale:1   }}
            exit={{    opacity:0, y:10, scale:.95 }}
            transition={{ duration:.17, ease:'easeOut' }}
          >
            {/* Header */}
            <div className="assistant-header">
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Sparkles size={13} color="var(--primary)" />
                <span>AI Assistant</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="assistant-messages">
              {msgs.map((m, i) => (
                <div key={i} className={`msg ${m.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
                  {m.text}
                </div>
              ))}
            </div>

            {/* Quick chips */}
            <div className="assistant-chips">
              {CHIPS.map(c => (
                <button key={c} className="chip" onClick={() => send(c)}>{c}</button>
              ))}
            </div>

            {/* Input */}
            <div className="assistant-input-row">
              <input
                className="assistant-input"
                placeholder="Ask something..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
              />
              <button className="send-btn" onClick={() => send()}>
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="assistant-fab"
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale:.92 }}
        title="AI Assistant"
      >
        {open ? <X size={19} /> : <Bot size={19} />}
      </motion.button>
    </div>
  );
}
