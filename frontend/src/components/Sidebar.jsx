import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Inbox, BarChart3, Eye,
  Settings, Sun, Moon, Zap, Edit3, Activity
} from 'lucide-react';
import { useTheme } from './ThemeContext';

const NAV = [
  { id: 'inbox',      icon: Inbox,           label: 'Intelligence Feed' },
  { id: 'drafts',     icon: Edit3,           label: 'Draft Hub' },
  { id: 'analytics',  icon: BarChart3,        label: 'Analytics' },
  { id: 'monitor',    icon: Activity,         label: 'Escalation Monitor' },
  { id: 'archive',    icon: Eye,             label: 'Vision Archive' },
];

function NavBtn({ id, icon: Icon, label, active, onClick }) {
  return (
    <motion.button
      onClick={() => onClick(id)}
      whileTap={{ scale: 0.96 }}
      className={`nav-btn${active ? ' active' : ''}`}
    >
      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </motion.button>
  );
}

export default function Sidebar({ active, onNav }) {
  const { isDark, toggle } = useTheme();

  return (
    <div className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <img src="/logo.png" height={34} width={34} alt="" />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.01em' }}>SoMailer</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>AI Email Brain</div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="sidebar-nav">
        <div className="nav-section">Workspace</div>
        {NAV.map(item => (
          <NavBtn key={item.id} {...item} active={active === item.id} onClick={onNav} />
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-foot">
        <NavBtn id="settings" icon={Settings} label="Settings" active={active === 'settings'} onClick={onNav} />
        <button
          onClick={toggle}
          className="nav-btn"
          style={{ marginTop: 2 }}
        >
          {isDark ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </div>
  );
}
