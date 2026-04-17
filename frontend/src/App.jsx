import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { Search, Bell } from 'lucide-react';

import { ThemeProvider } from './components/ThemeContext';
import AutomatedEmailHome from './components/AutomatedEmailHome';
import Sidebar       from './components/Sidebar';
import CommandCenter from './components/CommandCenter';
import IntelligenceFeed from './components/IntelligenceFeed';
import AssistantWidget  from './components/AssistantWidget';
import VisionArchive    from './components/VisionArchive_Enhanced';
import Analytics        from './components/Analytics';
import PersonalSpace    from './components/PersonalSpace';
import Drafts           from './components/Drafts';

/* ── Live status badge ─────────────────────────────────── */
function SystemStatus() {
  const [online, setOnline] = useState(null);

  const ping = async () => {
    try {
      await axios.get('http://127.0.0.1:8000/process-email', { timeout: 2000 });
      setOnline(true);
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    ping();
    const id = setInterval(ping, 8000);
    return () => clearInterval(id);
  }, []);

  if (online === null) return null;
  const cls = online ? 'online' : 'offline';

  return (
    <div className={`status-badge ${cls}`}>
      <div className={`status-dot ${cls}`} />
      {online ? 'Backend Connected' : 'Backend Offline'}
    </div>
  );
}

/* ── Placeholder page ──────────────────────────────────── */
const Placeholder = ({ title }) => (
  <motion.div
    initial={{ opacity:0, y:8 }}
    animate={{ opacity:1, y:0 }}
    style={{ padding:'32px 26px' }}
  >
    <div style={{ fontSize:15, fontWeight:700 }}>{title}</div>
    <div style={{ color:'var(--text-3)', marginTop:6, fontSize:13 }}>
      Phase 3 module — integration pending.
    </div>
  </motion.div>
);

/* ── App shell ─────────────────────────────────────────── */
function Shell() {
  const [tab, setTab]        = useState('command');
  const [search, setSearch]  = useState('');

  return (
    <div className="layout">
      <Sidebar active={tab} onNav={setTab} />

      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="search-wrap">
            <Search size={13} color="var(--text-3)" className="search-icon" />
            <input
              className="search-input"
              placeholder='Search emails, classifications…'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
            <SystemStatus />
            <button style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-3)', display:'flex' }}>
              <Bell size={17} strokeWidth={1.8} />
            </button>
            <div style={{
              width:30, height:30, borderRadius:'50%',
              background:'var(--primary)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', fontSize:12, fontWeight:700,
            }}>T</div>
          </div>
        </div>

        {/* Page */}
        <div className="page-body">
          <AnimatePresence mode="wait">
            <div key={tab}>
              {tab === 'command' && (
                <>
                  <CommandCenter />
                  <IntelligenceFeed />
                </>
              )}
              {tab === 'inbox'     && <IntelligenceFeed />}
              {tab === 'analytics' && <Analytics />}
              {tab === 'drafts'    && <Drafts />}
              {tab === 'archive'   && <VisionArchive />}
              {tab === 'settings'  && <PersonalSpace />}
            </div>
          </AnimatePresence>
        </div>
      </div>

      <AssistantWidget pageContext={tab} />
    </div>
  );
}

import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/" element={<AutomatedEmailHome />} />
          <Route path="/dashboard/*" element={<Shell />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
