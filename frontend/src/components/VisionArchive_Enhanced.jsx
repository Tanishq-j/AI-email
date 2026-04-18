import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, FilePieChart, ExternalLink, Search, Calendar, DollarSign, CheckCircle2, ChevronRight } from 'lucide-react';
import { useEmails } from '../hooks/useEmails';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

// Advanced cleaning for markdown and known AI boilerplates
function cleanVisionText(text) {
  if (!text) return '';
  let cleaned = text.replace(/\*{2,3}/g, '');
  
  // Remove the specific boilerplate requested by the user
  const boilerplates = [
    /Based on the provided technical specification, here is the high-depth intelligence analysis formatted for an executive workspace\./gi,
    /Document Type: Technical Specification \/ Internal/gi,
    /Document Type: Technical Specification \/ System Architecture Documentation/gi,
    /This analysis provides high-depth intelligence extracted from the/gi
  ];
  
  boilerplates.forEach(re => {
    cleaned = cleaned.replace(re, '');
  });
  
  return cleaned.trim();
}

function getIcon(docType = '') {
  const t = docType.toLowerCase();
  if (t.includes('invoice') || t.includes('receipt') || t.includes('payment') || t.includes('financial')) return DollarSign;
  if (t.includes('image') || t.includes('photo') || t.includes('picture') || t.includes('blueprint')) return ImageIcon;
  if (t.includes('data') || t.includes('chart') || t.includes('table') || t.includes('report') || t.includes('specification')) return FilePieChart;
  if (t.includes('schedule') || t.includes('meeting') || t.includes('calendar')) return Calendar;
  return FileText;
}

function VisionCard({ email }) {
  const visionData = email.vision_data;
  
  if (!visionData) {
    return null;
  }

  const Icon = getIcon(visionData.type || '');
  const cleanedRaw = cleanVisionText(visionData.raw);

  return (
    <motion.div
      variants={item}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 flex flex-col hover:border-[var(--primary)] hover:shadow-sm transition-all duration-200 group relative"
    >
      {/* Header Label */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded bg-[var(--surface2)] flex items-center justify-center text-[var(--primary)] border border-[var(--border)] group-hover:border-[var(--primary)] transition-colors">
          <Icon size={16} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)]">
            Intelligence
          </span>
          <span className="text-[11px] font-semibold text-[var(--text-2)] uppercase">
            {visionData.type || 'Document'}
          </span>
        </div>
      </div>

      {/* Subject */}
      <h3 className="font-bold text-[14px] text-[var(--text)] mb-3 leading-snug group-hover:text-[var(--primary)] transition-colors">
        {cleanVisionText(email.subject) || 'Untitled Analysis'}
      </h3>

      {/* Description Snippet */}
      {cleanedRaw && (
        <p className="text-[12px] text-[var(--text-2)] mb-4 line-clamp-2 leading-relaxed opacity-90">
          {cleanedRaw}
        </p>
      )}

      {/* Key Points Section */}
      {visionData.intelligence && visionData.intelligence.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-[1px] flex-1 bg-[var(--border)]"></div>
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)]">Extraction</h4>
            <div className="h-[1px] flex-1 bg-[var(--border)]"></div>
          </div>
          <ul className="space-y-1.5">
            {visionData.intelligence.slice(0, 3).map((pt, idx) => {
              const cleanedPt = cleanVisionText(pt);
              if (!cleanedPt) return null;
              return (
                <li key={idx} className="text-[11.5px] text-[var(--text-2)] flex items-start gap-2 leading-tight">
                  <CheckCircle2 size={12} className="text-[var(--primary)] mt-0.5 flex-shrink-0 opacity-60" />
                  <span>{cleanedPt}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Amounts / Metadata Row */}
      {(visionData.amounts?.length > 0 || visionData.dates?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {visionData.amounts && visionData.amounts.map((amt, idx) => (
            <div key={idx} className="px-1.5 py-0.5 bg-[var(--primary-bg)] text-[var(--primary)] border border-[var(--primary)]/10 rounded text-[9px] font-bold">
              {amt}
            </div>
          ))}
          {visionData.dates && visionData.dates.map((date, idx) => (
            <div key={idx} className="px-1.5 py-0.5 bg-[var(--surface2)] text-[var(--text-2)] border border-[var(--border)] rounded text-[9px] font-bold">
              {date}
            </div>
          ))}
        </div>
      )}

      {/* Action Block */}
      {visionData.action && (
        <div className="bg-[var(--surface2)]/40 rounded p-2.5 mb-4 border-l-2 border-[var(--primary)] group-hover:bg-[var(--surface2)] transition-colors">
          <p className="text-[11px] text-[var(--text-2)] leading-relaxed font-medium">
            <span className="text-[9px] uppercase font-bold text-[var(--primary)] block mb-0.5">Next Action</span>
            {cleanVisionText(visionData.action)}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className="flex flex-col gap-0.5 max-w-[80%]">
          <span className="text-[10px] font-semibold text-[var(--text-2)] truncate">
            {email.sender_email}
          </span>
          <span className="text-[9px] text-[var(--text-3)]">
            {email.timestamp ? new Date(email.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
          </span>
        </div>
        <ChevronRight size={13} className="text-[var(--text-3)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.div>
  );
}

export default function VisionArchive() {
  const { emails, loading } = useEmails();

  // Deduplication logic: More aggressive by stripping boilerplate before comparing
  const getDeduplicatedEmails = (all) => {
    const seen = new Set();
    return all.filter(e => {
      const sub = (e.subject || '').replace(/Review Required: /gi, '').trim();
      const ana = (e.attachment_analysis || '').slice(0, 100).trim();
      const hash = `${sub}|${ana}`;
      
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    });
  };

  const visionEmails = getDeduplicatedEmails(
    emails.filter(e => {
      const text = (e.attachment_analysis || '').trim().toLowerCase();
      return text !== '' && text !== 'no attachment' && text !== 'none';
    })
  );

  if (loading && visionEmails.length === 0) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-[var(--surface2)] animate-pulse rounded-lg border border-[var(--border)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[var(--primary-bg)] text-[var(--primary)] text-[9px] font-bold uppercase tracking-widest mb-3 border border-[var(--primary)]/10">
          <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse"></span>
          Vision Pipeline Hub
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Vision Archive</h1>
        <p className="text-[13px] text-[var(--text-3)] mt-1.5 max-w-2xl leading-relaxed">
          Centralized visual intelligence repository. Technical specifications, blueprints, and invoices are automatically indexed with structured key extraction.
        </p>
      </header>

      {visionEmails.length === 0 ? (
        <div className="p-16 text-center border border-[var(--border)] rounded-xl bg-[var(--surface)]">
          <div className="mb-4 inline-flex p-4 bg-[var(--surface2)] rounded-full text-[var(--text-3)]">
            <Search size={28} />
          </div>
          <h3 className="font-bold text-[var(--text)]">Archive Clear</h3>
          <p className="text-[var(--text-3)] max-w-sm mx-auto mt-1 text-sm">
            AI-extracted visual data will populate here upon ingestion.
          </p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {visionEmails.map((email) => (
            <VisionCard key={email.id} email={email} />
          ))}
        </motion.div>
      )}
    </div>
  );
}


