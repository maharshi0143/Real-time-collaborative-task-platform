import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Project, Workspace } from '../types';
import { Loader2, LayoutGrid, Trash2, Plus, X, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { toast } from 'sonner';
import { canManage } from '../utils/roles';

export default function ProjectPage() {
  const { slug, projectId } = useParams<{ slug: string; projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState<string | null>(null);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);

  const handleDeleteBoard = async (boardId: string) => {
    setDeletingBoard(true);
    try {
      const res = await api.delete(`/boards/${boardId}`);
      if (res.data.success) {
        setProject((prev) => {
          if (!prev) return prev;
          return { ...prev, boards: (prev.boards || []).filter((b) => b.id !== boardId) };
        });
        toast.success('Board deleted.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete board.');
    } finally {
      setDeletingBoard(false);
      setConfirmDeleteBoard(null);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;
    setCreatingBoard(true);
    try {
      const res = await api.post(`/projects/${projectId}/boards`, { name: boardName });
      if (res.data.success) {
        setProject((prev) => {
          if (!prev) return prev;
          return { ...prev, boards: [...(prev.boards || []), res.data.data.board] };
        });
        setShowCreateBoard(false);
        setBoardName('');
        toast.success('Board created.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to create board.');
    } finally {
      setCreatingBoard(false);
    }
  };

  useEffect(() => {
    if (!slug || !projectId) return;
    (async () => {
      try {
        const wsRes = await api.get(`/workspaces/${slug}`);
        if (!wsRes.data.success) { setError('Workspace not found.'); return; }
        setWorkspace(wsRes.data.data.workspace);

        const projRes = await api.get(`/projects/${projectId}`);
        if (!projRes.data.success) { setError('Project not found.'); return; }
        setProject(projRes.data.data.project);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load project.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project || !workspace) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error || 'Project not found.'}</p>
          <Link to={`/workspaces/${slug}`} className="text-primary hover:underline">Back to Workspace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb crumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: workspace.name, href: `/workspaces/${workspace.slug}` },
        { label: project.name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            to={`/workspaces/${workspace.slug}`}
            className="p-2 rounded-xl hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
        {canManage(workspace.role) && (
          <Button onClick={() => setShowCreateBoard(true)} className="shadow-md">
            <Plus className="mr-1.5 h-4 w-4" /> New Board
          </Button>
        )}
      </div>

      {(!project.boards || project.boards.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-border/60">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <LayoutGrid className="h-10 w-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No boards yet</h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Create a board to organize your tasks into columns like To Do, In Progress, and Done.
          </p>
          {canManage(workspace.role) && (
            <Button onClick={() => setShowCreateBoard(true)} size="lg" className="shadow-lg">
              <Plus className="mr-2 h-5 w-5" /> Create Board
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {project.boards.map((board) => (
            <div key={board.id} className="group bg-white rounded-xl border border-border/60 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200/50 transition-all duration-200 relative">
              <Link
                to={`/workspaces/${workspace.slug}/projects/${project.id}/boards/${board.id}`}
                className="block p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 shadow-sm" />
                  <h3 className="font-semibold text-foreground">{board.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground">Click to open kanban board</p>
                <div className="flex items-center text-sm font-medium text-indigo-600 mt-5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                  Open board <LayoutGrid className="ml-1.5 h-4 w-4" />
                </div>
              </Link>
              {canManage(workspace.role) && (
                confirmDeleteBoard === board.id ? (
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <button
                      onClick={() => handleDeleteBoard(board.id)}
                      disabled={deletingBoard}
                      className="bg-red-500 text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-600 transition-colors shadow-sm font-medium"
                    >
                      {deletingBoard ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteBoard(null)}
                      className="bg-secondary text-xs px-2.5 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteBoard(board.id); }}
                    className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                    title="Delete board"
                  >
                    <Trash2 size={15} />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateBoard(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create Board</h2>
              <button onClick={() => setShowCreateBoard(false)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleCreateBoard} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Board Name</label>
                <Input
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="e.g., Sprint 1"
                  disabled={creatingBoard}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateBoard(false)} disabled={creatingBoard}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingBoard || !boardName.trim()} className="shadow-md">
                  {creatingBoard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Board
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
