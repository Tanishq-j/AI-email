import React, { useEffect, useState } from 'react';
import { Brain, Zap, Database, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import IntelligenceFeed from './IntelligenceFeed';

const SYS = [
  { label:'AI Brain',   val:'Online',  sub:'LangGraph active',  icon:Brain,    color:'#16a34a' },
  { label:'Gateway',    val:':8000',   sub:'FastAPI ready',      icon:Zap,      color:'#2563eb' },
  { label:'Database',   val:'Ready',   sub:'Postgres + vector',  icon:Database, color:'#7c3aed' },
  { label:'Queue',      val:'Active',  sub:'Redis connected',    icon:Activity, color:'#d97706' },
];

export default function CommandCenter() {
  return (
    <motion.div
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:.2 }}
      style={{ padding:'24px 26px' }}
    >
      {/* Hero banner */}
      <div className="hero">
        <div className="hero-sub">System Control</div>
        <div className="hero-title">SoMailer Brain — All Systems Operational</div>
        <div className="hero-desc">LangGraph pipeline processing incoming email signals in real-time</div>

        <div style={{ display:'flex', gap:12, marginTop:20, flexWrap:'wrap' }}>
          {SYS.map(({ label, val, sub, icon:Icon, color }) => (
            <div key={label} style={{
              background:'rgba(255,255,255,.12)',
              borderRadius:7,
              padding:'10px 14px',
              minWidth:120,
              backdropFilter:'blur(4px)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
                <Icon size={12} strokeWidth={2} />
                <span style={{ fontSize:10.5, fontWeight:700, opacity:.8 }}>{label}</span>
              </div>
              <div style={{ fontSize:15, fontWeight:700 }}>{val}</div>
              <div style={{ fontSize:11, opacity:.6, marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feed heading */}
      <div style={{ marginBottom:4 }}>
        <div style={{ fontSize:15, fontWeight:700, letterSpacing:'-.01em' }}>Intelligence Feed</div>
        <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
          AI-classified emails · 5s live polling · LangGraph pipeline
        </div>
      </div>
    </motion.div>
  );
}
