import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { AnalyticsSummary } from '../types';
import { Loader2 } from 'lucide-react';
import { subDays, format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const { slug } = useParams();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const wsRes = await api.get('/workspaces');
      if (!wsRes.data.success) { setError('Failed to load workspace.'); return; }
      const workspace = wsRes.data.data.workspaces.find((w: any) => w.slug === slug);
      if (!workspace) { setError('Workspace not found.'); return; }

      const res = await api.get(`/workspaces/${workspace.id}/analytics/summary?startDate=${startDate}&endDate=${endDate}`);
      if (res.data.success) setData(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-16"><p className="text-lg text-red-600 mb-4">{error}</p></div>;
  }

  if (!data) {
    return <div className="text-center text-muted-foreground py-16">No analytics data available.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
          <span className="text-muted-foreground">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-muted-foreground">Tasks Created</p><p className="text-2xl font-bold">{data.summary.totalTasksCreated}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{data.summary.totalTasksCompleted}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-muted-foreground">Completion Rate</p><p className="text-2xl font-bold">{data.summary.completionRate}%</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-muted-foreground">Overdue</p><p className="text-2xl font-bold text-red-500">{data.summary.overdueTasksCount}</p></div>
      </div>

      {/* Member Performance Table */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <h2 className="font-semibold mb-4">Member Performance</h2>
        <table data-testid="member-performance-table" className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">
                <button onClick={() => handleSort('username')} className="flex items-center gap-1">
                  Member {sortConfig?.key === 'username' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th className="pb-2 font-medium">
                <button onClick={() => handleSort('assigned')} className="flex items-center gap-1">
                  Assigned {sortConfig?.key === 'assigned' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th className="pb-2 font-medium">
                <button onClick={() => handleSort('completed')} className="flex items-center gap-1">
                  Completed {sortConfig?.key === 'completed' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th className="pb-2 font-medium">
                <button onClick={() => handleSort('avgTime')} className="flex items-center gap-1">
                  Avg Time (hrs) {sortConfig?.key === 'avgTime' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const sortedMembers = sortConfig
                ? [...data.tasksByMember].sort((a, b) => {
                    let aVal: any, bVal: any;
                    switch (sortConfig.key) {
                      case 'username': aVal = a.user.username.toLowerCase(); bVal = b.user.username.toLowerCase(); break;
                      case 'assigned': aVal = a.assigned; bVal = b.assigned; break;
                      case 'completed': aVal = a.completed; bVal = b.completed; break;
                      case 'avgTime': aVal = a.avgCompletionTimeHours; bVal = b.avgCompletionTimeHours; break;
                      default: return 0;
                    }
                    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                  })
                : data.tasksByMember;
              return sortedMembers.map((m) => (
                <tr key={m.user.id} className="border-b last:border-0">
                  <td className="py-2">{m.user.username}</td>
                  <td className="py-2">{m.assigned}</td>
                  <td className="py-2">{m.completed}</td>
                  <td className="py-2">{m.avgCompletionTimeHours}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 h-72">
          <h3 className="font-semibold text-sm mb-2">Completion Trend</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data.completionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(v) => format(new Date(v), 'MMM d, yyyy')} />
              <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" dot={false} />
              <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border p-4 h-72">
          <h3 className="font-semibold text-sm mb-2">Tasks by Priority</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={Object.entries(data.tasksByPriority).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                {Object.entries(data.tasksByPriority).map(([name]) => {
                  const colors: Record<string, string> = {
                    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280',
                  };
                  return <Cell key={name} fill={colors[name] || '#6b7280'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border p-4 h-72">
          <h3 className="font-semibold text-sm mb-2">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={Object.entries(data.tasksByStatus).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                {Object.entries(data.tasksByStatus).map(([name]) => {
                  const colors: Record<string, string> = {
                    todo: '#6b7280', in_progress: '#3b82f6', in_review: '#f97316', done: '#22c55e',
                  };
                  return <Cell key={name} fill={colors[name] || '#6b7280'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
