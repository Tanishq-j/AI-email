import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API = `${BASE_URL}/process-email`;
const POLL_INTERVAL = 5000;

export function useEmails() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEmails = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const response = await axios.get(API, { timeout: 3000 });
      const data = response.data?.emails || [];
      
      // Update state: filter out duplicates if any, or just set if incoming is full list
      setEmails(prev => {
        // Simple heuristic: if the first ID is different, we might have new data
        // For the demo, we'll just replacement because the backend returns the last 50
        return data;
      });
      setError(null);
    } catch (err) {
      console.error("Email fetch failed:", err);
      setError("Failed to sync with intelligence layer.");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails(true);
    const id = setInterval(() => fetchEmails(false), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchEmails]);

  return { emails, loading, error, refetch: () => fetchEmails(true) };
}
