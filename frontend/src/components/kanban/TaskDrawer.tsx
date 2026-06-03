import React, { useEffect, useState, useRef } from 'react';
import { X, Loader2, Send, Calendar, Clock, User, Tag, MessageSquare, Activity } from 'lucide-react';
import { Task, Comment as CommentType, ActivityLog } from '../../types';
import api from '../../services/api';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { formatDistanceToNow, format } from 'date-fns';

interface TaskDrawerProps {
  taskId: string;
  onClose: () => void;
  onTaskUpdated?: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low: 'text-gray-600 bg-gray-50 border-gray-200',
};

const statusColors: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700',
  'in_progress': 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
};

export function TaskDrawer({ taskId, onClose, onTaskUpdated }: TaskDrawerProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [members, setMembers] = useState<Array<{ id: string; username: string; fullName?: string; avatarUrl?: string }>>([]);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showMemberList, setShowMemberList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details');

  useEffect(() => {
    loadTask();
  }, [taskId]);

  useEffect(() => {
    if (!showAssigneePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.assignee-picker-container')) {
        setShowAssigneePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssigneePicker]);

  const loadTask = async () => {
    setLoading(true);
    try {
      const [taskRes, commentsRes, activityRes] = await Promise.all([
        api.get(`/tasks/${taskId}`),
        api.get(`/tasks/${taskId}/comments`),
        api.get(`/tasks/${taskId}/activity`),
      ]);
      if (taskRes.data.success) setTask(taskRes.data.data.task);
      if (commentsRes.data.success) setComments(commentsRes.data.data.comments);
      if (activityRes.data.success) setActivity(activityRes.data.data.activity);

      // Load workspace members for assignee picker and @mentions
      try {
        if (taskRes.data.data.task.board?.projectId) {
          const projRes = await api.get(`/projects/${taskRes.data.data.task.board.projectId}`);
          if (projRes.data.success && projRes.data.data.project?.workspaceId) {
            const memRes = await api.get(`/workspaces/${projRes.data.data.project.workspaceId}/members`);
            if (memRes.data.success) {
              setMembers((memRes.data.data.members || []).map((m: any) => ({
                id: m.userId,
                username: m.username,
                fullName: m.fullName,
                avatarUrl: m.avatarUrl,
              })));
            }
          }
        }
      } catch {
        console.error('Failed to load workspace members');
      }
    } catch {
      console.error('Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (field: string, value: any) => {
    setSaving(true);
    setEditingField(null);
    try {
      const res = await api.patch(`/tasks/${taskId}`, { [field]: value });
      if (res.data.success && res.data.data.task) {
        setTask(res.data.data.task);
        if (onTaskUpdated) onTaskUpdated(res.data.data.task);
      }
    } catch {
      console.error('Failed to save task field');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { content: commentText.trim() });
      if (res.data.success) {
        setComments((prev) => [...prev, res.data.data.comment]);
        setCommentText('');
        loadTask();
      }
    } catch {
      console.error('Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCommentText(value);

    const textBeforeCursor = value.slice(0, pos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setMentionSearch(afterAt);
        setShowMemberList(true);
        setMentionStart(lastAtIndex);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMemberList(false);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMemberList) return;

    const filtered = members
      .filter((m) => m.username.toLowerCase().includes(mentionSearch.toLowerCase()))
      .slice(0, 8);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered.length > 0 && filtered[selectedMentionIndex]) {
        e.preventDefault();
        insertMention(filtered[selectedMentionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowMemberList(false);
    }
  };

  const insertMention = (member: { id: string; username: string }) => {
    if (mentionStart < 0) return;
    const before = commentText.slice(0, mentionStart);
    const after = commentText.slice(mentionStart + 1 + mentionSearch.length);
    const newText = `${before}@${member.username} ${after}`;
    setCommentText(newText);
    setShowMemberList(false);
    textareaRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-white shadow-xl h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-white shadow-xl h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Task not found</h2>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X size={20} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded border', priorityColors[task.priority] || priorityColors.low)}>
            {task.priority}
          </span>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {editingField === 'title' ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  defaultValue={task.title}
                  className="w-full text-lg font-semibold rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave('title', (e.target as HTMLInputElement).value);
                    if (e.key === 'Escape') setEditingField(null);
                  }}
                  onBlur={(e) => handleSave('title', e.target.value)}
                />
              </div>
            ) : (
              <h2
                className="text-lg font-semibold cursor-pointer hover:bg-secondary/50 rounded px-1 -mx-1 transition-colors"
                onClick={() => { setEditValue(task.title); setEditingField('title'); }}
              >
                {task.title}
              </h2>
            )}

            {editingField === 'description' ? (
              <textarea
                autoFocus
                defaultValue={task.description || ''}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingField(null);
                }}
                onBlur={(e) => handleSave('description', e.target.value || null)}
              />
            ) : (
              <div
                className={cn(
                  'text-sm text-muted-foreground rounded px-1 -mx-1 transition-colors min-h-[24px]',
                  task.description ? 'cursor-pointer hover:bg-secondary/50' : 'text-muted-foreground/40 italic cursor-pointer hover:bg-secondary/50'
                )}
                onClick={() => { setEditValue(task.description || ''); setEditingField('description'); }}
              >
                {task.description || 'Add description...'}
              </div>
            )}
          </div>

          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1 relative assignee-picker-container">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><User size={12} /> Assignee</span>
                <div className="relative">
                  <span
                    className="font-medium cursor-pointer hover:bg-secondary/50 rounded px-1 -mx-1 transition-colors inline-block"
                    onClick={() => { setShowAssigneePicker(!showAssigneePicker); setAssigneeSearch(''); }}
                  >
                    {task.assignee?.username || 'Unassigned'}
                  </span>
                  {showAssigneePicker && (
                    <div
                      className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-20 min-w-[180px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        type="text"
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Search members..."
                        className="w-full border-b border-input px-2 py-1.5 text-sm focus-visible:outline-none rounded-t-md"
                      />
                      <div className="max-h-32 overflow-y-auto">
                        <button
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/50 flex items-center gap-2 text-muted-foreground',
                            !task.assignee && 'bg-primary/10 font-medium'
                          )}
                          onMouseDown={(e) => { e.preventDefault(); handleSave('assigneeId', null); setShowAssigneePicker(false); }}
                        >
                          Unassigned
                        </button>
                        {members
                          .filter((m) => m.username.toLowerCase().includes(assigneeSearch.toLowerCase()))
                          .map((member) => (
                            <button
                              key={member.id}
                              className={cn(
                                'w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/50 flex items-center gap-2',
                                task.assignee?.id === member.id && 'bg-primary/10 font-medium'
                              )}
                              onMouseDown={(e) => { e.preventDefault(); handleSave('assigneeId', member.id); setShowAssigneePicker(false); }}
                            >
                              <span>{member.username}</span>
                              {member.fullName && <span className="text-xs text-muted-foreground ml-auto">{member.fullName}</span>}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag size={12} /> Status</span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded', statusColors[task.status] || 'bg-gray-100')}>{task.status.replace('_', ' ')}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={12} /> Due Date</span>
                {editingField === 'dueDate' ? (
                  <input
                    autoFocus
                    type="date"
                    defaultValue={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                    className="w-full rounded-md border border-input bg-transparent px-2 py-0.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    onBlur={(e) => handleSave('dueDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingField(null); }}
                  />
                ) : (
                  <span
                    className="font-medium cursor-pointer hover:bg-secondary/50 rounded px-1 -mx-1 transition-colors"
                    onClick={() => setEditingField('dueDate')}
                  >
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'Not set'}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> Created</span>
                <span className="font-medium">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <span className="text-[10px]">#</span> Priority
              </span>
              <select
                value={task.priority}
                onChange={(e) => handleSave('priority', e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Tags</span>
              {editingField === 'tags' ? (
                <input
                  autoFocus
                  type="text"
                  defaultValue={task.tags.join(', ')}
                  placeholder="Enter tags separated by commas"
                  className="w-full rounded-md border border-input bg-transparent px-2 py-0.5 text-sm mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onBlur={(e) => {
                    const tags = e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean);
                    handleSave('tags', tags);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingField(null); }}
                />
              ) : (
                <div
                  className="flex flex-wrap gap-1 mt-1 cursor-pointer hover:bg-secondary/50 rounded p-1 -mx-1 transition-colors min-h-[24px]"
                  onClick={() => setEditingField('tags')}
                >
                  {task.tags.length > 0 ? (
                    task.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">{tag}</span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground/40 italic">Add tags...</span>
                  )}
                </div>
              )}
            </div>

            {task.creator && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar src={task.creator.avatarUrl} fallback={task.creator.username} size="sm" />
                <span>Created by <strong>{task.creator.username}</strong></span>
              </div>
            )}
          </div>

          <div className="border-t">
            <div className="flex border-b">
              {(['details', 'comments', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors',
                    activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'details' && 'Details'}
                  {tab === 'comments' && `Comments (${comments.length})`}
                  {tab === 'activity' && 'Activity'}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'details' && (
                <div className="text-sm text-muted-foreground space-y-3">
                  <div className="flex justify-between">
                    <span>Task ID</span>
                    <span className="font-mono text-xs">{task.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Board</span>
                    <span className="font-medium">{task.board?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updated</span>
                    <span>{formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Position</span>
                    <span>{task.position}</span>
                  </div>
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={textareaRef}
                        value={commentText}
                        onChange={handleCommentChange}
                        onKeyDown={handleCommentKeyDown}
                        placeholder="Write a comment... Use @ to mention someone"
                        className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        disabled={postingComment}
                      />
                      {showMemberList && members.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded-md shadow-lg max-h-32 overflow-y-auto z-10">
                          {members
                            .filter((m) => m.username.toLowerCase().includes(mentionSearch.toLowerCase()))
                            .slice(0, 8)
                            .map((member, i) => (
                              <button
                                key={member.id}
                                className={cn(
                                  'w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/50 flex items-center gap-2',
                                  i === selectedMentionIndex && 'bg-secondary/50'
                                )}
                                onMouseDown={(e) => { e.preventDefault(); insertMention(member); }}
                              >
                                <span className="font-medium">@{member.username}</span>
                                {member.fullName && <span className="text-xs text-muted-foreground">{member.fullName}</span>}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <Button type="submit" size="icon" disabled={postingComment || !commentText.trim()}>
                      {postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
                    </Button>
                  </form>
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <Avatar
                            src={comment.author?.avatarUrl}
                            fallback={comment.author?.username || '?'}
                            size="sm"
                            className="mt-0.5"
                          />
                          <div className="flex-1 bg-secondary/30 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">{comment.author?.username || 'Unknown'}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm mt-0.5">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
                  ) : (
                    activity.map((entry) => (
                      <div key={entry.id} className="flex gap-2 items-start">
                        <Activity size={14} className="text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">
                              <span className="font-medium">{entry.actor?.username || 'System'}</span>
                              {' '}
                              <span className="text-muted-foreground">{entry.action.replace(/\./g, ' ')}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {saving && (
          <div className="absolute bottom-4 right-4 bg-primary text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </div>
        )}
      </div>
    </div>
  );
}
