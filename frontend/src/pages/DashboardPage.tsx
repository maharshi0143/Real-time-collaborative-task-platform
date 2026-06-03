import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Workspace } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, ArrowRight, Loader2, X, Layout, Users, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await api.get('/workspaces');
      if (res.data.success) setWorkspaces(res.data.data.workspaces);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load workspaces.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const updateSlug = (name: string) => {
    setForm((prev) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Workspace name is required.'); return; }
    if (!form.slug.trim()) { setFormError('Slug is required.'); return; }

    setCreating(true);
    try {
      const res = await api.post('/workspaces', { name: form.name, slug: form.slug });
      if (res.data.success) {
        setWorkspaces((prev) => [...prev, res.data.data.workspace]);
        setShowDialog(false);
        setForm({ name: '', slug: '' });
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.error?.message || 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{user?.username}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Select a workspace to continue or create a new one</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="shadow-md hover:shadow-lg transition-shadow">
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <Sparkles className="h-10 w-10 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">No workspaces yet</h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Create your first workspace to start collaborating with your team on projects and tasks.
          </p>
          <Button onClick={() => setShowDialog(true)} size="lg" className="shadow-lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Workspace
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => {
            const roleColors: Record<string, string> = {
              admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
              manager: 'bg-emerald-100 text-emerald-700 border-emerald-200',
              member: 'bg-amber-100 text-amber-700 border-amber-200',
              guest: 'bg-gray-100 text-gray-700 border-gray-200',
            };
            return (
              <Link
                key={ws.id}
                to={`/workspaces/${ws.slug}`}
                className="group bg-white rounded-xl border border-border/60 p-6 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200/50 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${roleColors[ws.role || 'member'] || roleColors.member}`}>
                    {ws.role}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-foreground group-hover:text-indigo-600 transition-colors">{ws.name}</h3>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    {ws.memberCount} {ws.memberCount === 1 ? 'member' : 'members'}
                  </span>
                </div>
                <div className="flex items-center text-sm font-medium text-indigo-600 mt-5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                  Open workspace <ArrowRight className="ml-1.5 h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create Workspace</h2>
              <button onClick={() => setShowDialog(false)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Workspace Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => updateSlug(e.target.value)}
                  placeholder="My Workspace"
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Slug</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="my-workspace"
                  disabled={creating}
                />
                <p className="text-xs text-muted-foreground mt-1.5">Used in URLs: /workspaces/<strong>{form.slug || 'slug'}</strong></p>
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="shadow-md">
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Workspace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
