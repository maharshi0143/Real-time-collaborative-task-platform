import { useState, useEffect } from 'react';
import api from '../services/api';

export function useWorkspaceRole(workspaceId?: string) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/workspaces/${workspaceId}`);
        if (res.data.success) {
          setRole(res.data.data.role || null);
        }
      } catch {
        console.error('Failed to fetch workspace role');
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId]);

  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || role === 'admin';
  const isMember = role === 'member' || role === 'manager' || role === 'admin';

  return { role, loading, isAdmin, isManager, isMember };
}
