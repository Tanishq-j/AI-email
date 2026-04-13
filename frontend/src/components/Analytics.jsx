import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, Zap, ShieldAlert, FileText, Calendar, Clock } from 'lucide-react';
import { useEmails } from '../hooks/useEmails';

const COLORS = {
  Urgent_Fire: '#e11d48', // Red
  Action_Required: '#f59e0b', // Amber
  FYI_Read: '#16a34a', // Green
  Scheduling: '#2563eb', // Blue
  Cold_Outreach: '#94a3b8' // Slate
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

export default function Analytics() {
  const { emails, loading } = useEmails();

  const analyticsData = useMemo(() => {
    if (!emails.length) return null;

    // 1. Sender Frequency
    const senderCounts = {};
    emails.forEach(e => {
      senderCounts[e.sender_email] = (senderCounts[e.sender_email] || 0) + 1;
    });
    const topSenders = Object.entries(senderCounts)
      .map(([name, value]) => ({ name: name.split('@')[0], fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 2. Classification Mix
    const classCounts = {};
    emails.forEach(e => {
      const cls = e.classification || 'FYI_Read';
      classCounts[cls] = (classCounts[cls] || 0) + 1;
    });
    const classificationMix = Object.entries(classCounts).map(([name, value]) => ({ name, value }));

    // 3. Rising Relationships (First 25 vs Last 25)
    // Backend returns LIMIT 50 ORDER BY created_at DESC, so [0-24] is NEW, [25-49] is OLD
    const newHalf = emails.slice(0, 25);
    const oldHalf = emails.slice(25, 50);

    const newCounts = {};
    newHalf.forEach(e => newCounts[e.sender_email] = (newCounts[e.sender_email] || 0) + 1);
    
    const oldCounts = {};
    oldHalf.forEach(e => oldCounts[e.sender_email] = (oldCounts[e.sender_email] || 0) + 1);

    const rising = Object.keys(newCounts)
      .map(email => {
        const countNew = newCounts[email];
        const countOld = oldCounts[email] || 0;
        return { email, diff: countNew - countOld, count: countNew };
      })
      .filter(item => item.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 5);

    return { topSenders, classificationMix, rising, total: emails.length };
  }, [emails]);

  if (loading && !analyticsData) {
    return (
      <div className="p-8 space-y-8">
        <div className="h-12 w-48 skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 skeleton" />
          <div className="h-80 skeleton" />
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <motion.div 
      className="p-8 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight">Networking Intelligence</h1>
        <p className="text-[var(--text-3)] text-sm mt-1">
          Behavioral insights generated from {analyticsData.total} signals using Gemini 2.0 Flash.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* TOP SENDERS BAR CHART */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <Users size={18} className="text-[var(--primary)]" />
            <h2 className="font-bold text-lg">Relationship Heatmap</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.topSenders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                  interval={0}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: 'var(--surface2)' }}
                  contentStyle={{ 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="var(--primary)" 
                  radius={[4, 4, 0, 0]} 
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* CLASSIFICATION DONUT */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={18} className="text-[var(--amber)]" />
            <h2 className="font-bold text-lg">Signals Breakdown</h2>
          </div>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.classificationMix}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {analyticsData.classificationMix.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-[11px] text-[var(--text-2)]">{value.replace('_', ' ')}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* RISING RELATIONSHIPS */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={18} className="text-[var(--green)]" />
          <h2 className="font-bold text-lg">Rising Relationships</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {analyticsData.rising.map((item, idx) => (
            <div key={item.email} className="bg-[var(--surface2)] rounded-xl p-4 border border-[var(--border)] relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-bg)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                  {item.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center text-[var(--green)] text-[10px] font-bold">
                   +{item.diff} <TrendingUp size={10} className="ml-0.5" />
                </div>
              </div>
              <div className="text-[13px] font-semibold truncate group-hover:text-[var(--primary)] transition-colors">
                {item.email.split('@')[0]}
              </div>
              <div className="text-[10px] text-[var(--text-3)] truncate mb-3">
                {item.email}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1 flex-1 bg-[var(--border)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--primary)] rounded-full" 
                    style={{ width: `${(item.count / 25) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium">{item.count}</span>
              </div>
            </div>
          ))}
          {analyticsData.rising.length === 0 && (
            <div className="col-span-full py-8 text-center text-[var(--text-3)] text-sm">
              Insufficient data to identify rising trends.
            </div>
          )}
        </div>
      </motion.div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <StatCard icon={ShieldAlert} title="High Urgency" value={analyticsData.classificationMix.find(c => c.name === 'Urgent_Fire')?.value || 0} color="var(--primary)" />
        <StatCard icon={FileText} title="Information" value={analyticsData.classificationMix.find(c => c.name === 'FYI_Read')?.value || 0} color="var(--green)" />
        <StatCard icon={Calendar} title="Schedules" value={analyticsData.classificationMix.find(c => c.name === 'Scheduling')?.value || 0} color="var(--blue)" />
        <StatCard icon={Clock} title="Unique Senders" value={analyticsData.topSenders.length} color="var(--text-2)" />
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, title, value, color }) {
  return (
    <motion.div variants={itemVariants} className="glass-card rounded-xl p-5 flex items-center gap-4">
      <div className="p-3 rounded-lg" style={{ background: `${color}15`, color: color }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">{title}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </motion.div>
  );
}
