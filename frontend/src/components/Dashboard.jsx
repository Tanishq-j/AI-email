import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Mail, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';

const Dashboard = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        // Points to our FastAPI Gateway
        const response = await axios.get('http://127.0.0.1:8000/process-email');
        setEmails(response.data.emails || []);
      } catch (error) {
        console.error("Migration data fetch failed, using fallback mock:", error);
        // Fallback mock data for the 50 migration emails
        setEmails([
          { id: 1, sender_email: "ceo@corp.com", subject: "Urgent: Q2 Strategy", classification: "Urgent_Fire" },
          { id: 2, sender_email: "hr@corp.com", subject: "New Policy Update", classification: "FYI_Read" },
          { id: 3, sender_email: "dev@corp.com", subject: "Server Maintenance", classification: "Action_Required" },
          { id: 4, sender_email: "sales@outside.com", subject: "Get 50% Off", classification: "Cold_Outreach" },
          { id: 5, sender_email: "marketing@corp.com", subject: "Weekly Newsletter", classification: "FYI_Read" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  const getClassificationStyles = (type) => {
    switch (type) {
      case 'Urgent_Fire': return 'neon-urgent';
      case 'FYI_Read': return 'neon-fyi';
      default: return 'border-transparent border-l-2';
    }
  };

  const getLabelColor = (type) => {
    switch (type) {
      case 'Urgent_Fire': return 'text-brand-accent bg-brand-accent/10';
      case 'FYI_Read': return 'text-brand-primary bg-brand-primary/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="flex-1 ml-[240px] p-8">
      <header className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Intelligence Feed</h2>
        <p className="text-sm text-gray-500">Monitoring real-time enterprise communication</p>
      </header>

      <div className="bg-surface rounded-lg border border-white/5 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-semibold">Sender</th>
              <th className="px-6 py-4 font-semibold">Subject</th>
              <th className="px-6 py-4 font-semibold">Classification</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {emails.map((email, index) => (
                <motion.tr
                  key={email.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${getClassificationStyles(email.classification)} hover:bg-white/[0.02] transition-colors`}
                >
                  <td className="px-6 py-4 text-sm font-medium">{email.sender_email}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{email.subject}</td>
                  <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">
                    <span className={`px-2 py-1 rounded ${getLabelColor(email.classification)}`}>
                      {email.classification.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand-secondary text-xs hover:underline">View Analysis</button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        
        {loading && (
          <div className="p-10 text-center animate-pulse text-gray-600 italic">
            Fetching neural intelligence...
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
