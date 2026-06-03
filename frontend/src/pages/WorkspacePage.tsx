import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Workspace, Project } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { Plus, Loader2, LayoutGrid, X, Users, BarChart3, Trash2, FolderOpen } from 'lucide-react';
import { isAdmin, isManager } from '../utils/roles';
import { toast } from 'sonner';

export default function WorkspacePage() {
  const { slug } = useParams<{ slug: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const wsRes = await api.get(`/workspaces/${slug}`);
        if (!wsRes.data.success) { setError('Workspace not found.'); return; }
        setWorkspace(wsRes.data.data.workspace);

        const projRes = await api.get(`/workspaces/${wsRes.data.data.workspace.id}/projects`);
        if (projRes.data.success) setProjects(projRes.data.data.projects);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load workspace.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProject(projectId);
    try {
      const res = await api.delete(`/workspaces/${workspace?.id}/projects/${projectId}`);
      if (res.data.success) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        toast.success('Project deleted.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to delete project.';
      toast.error(msg);
    } finally {
      setDeletingProject(null);
      setConfirmDelete(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Project name is required.'); return; }
    if (!workspace) return;

    setCreating(true);
    try {
      const res = await api.post(`/workspaces/${workspace.id}/projects`, {
        name: form.name,
        description: form.description || undefined,
      });
      if (res.data.success) {
        setProjects((prev) => [res.data.data.project, ...prev]);
        setShowDialog(false);
        setForm({ name: '', description: '' });
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.error?.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error || 'Workspace not found.'}</p>
          <Link to="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-indigo-100 text-indigo-700',
    manager: 'bg-emerald-100 text-emerald-700',
    member: 'bg-amber-100 text-amber-700',
    guest: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb crumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: workspace.name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md">
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{workspace.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${roleColors[workspace.role || 'member'] || roleColors.member}`}>
                {workspace.role}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Users size={14} /> {workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}</span>
              <span className="flex items-center gap-1.5"><FolderOpen size={14} /> {projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/workspaces/${workspace.slug}/analytics`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-1.5 h-4 w-4" /> Analytics
            </Button>
          </Link>
          {isManager(workspace.role) && (
            <Button onClick={() => setShowDialog(true)} className="shadow-md">
              <Plus className="mr-1.5 h-4 w-4" /> New Project
            </Button>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-border/60">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <FolderOpen className="h-10 w-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No projects yet</h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Create your first project to organize your work into boards and tasks.
          </p>
          {isManager(workspace.role) && (
            <Button onClick={() => setShowDialog(true)} size="lg" className="shadow-lg">
              <Plus className="mr-2 h-5 w-5" /> Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="group bg-white rounded-xl border border-border/60 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200/50 transition-all duration-200 relative">
              <Link
                to={`/workspaces/${workspace.slug}/projects/${project.id}`}
                className="block p-6"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4 shadow-sm">
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-semibold text-lg text-foreground group-hover:text-indigo-600 transition-colors truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <LayoutGrid size={14} /> {project.boardCount || 0} boards
                  </span>
                  {project.createdBy && (
                    <span>by {project.createdBy.username}</span>
                  )}
                </div>
                <div className="flex items-center text-sm font-medium text-indigo-600 mt-5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                  Open project <LayoutGrid className="ml-1.5 h-4 w-4" />
                </div>
              </Link>
              {isAdmin(workspace.role) && (
                confirmDelete === project.id ? (
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={deletingProject === project.id}
                      className="bg-red-500 text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-600 transition-colors shadow-sm font-medium"
                    >
                      {deletingProject === project.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="bg-secondary text-xs px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(project.id); }}
                    className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                    title="Delete project"
                  >
                    <Trash2 size={15} />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create Project</h2>
              <button onClick={() => setShowDialog(false)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Project Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My Project"
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What is this project about?"
                  disabled={creating}
                  className="flex min-h-[80px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                />
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
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
