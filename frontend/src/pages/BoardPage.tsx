import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import api from '../services/api';
import { Board as BoardType, Task } from '../types';
import { BoardColumn } from '../components/kanban/BoardColumn';
import { TaskCard } from '../components/kanban/TaskCard';
import { TaskDrawer } from '../components/kanban/TaskDrawer';
import { connectSocket, joinBoard, leaveBoard, getSocket, sendHeartbeat } from '../services/socket';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function BoardPage() {
  const { slug, projectId, boardId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const draggedTaskId = useRef<string | null>(null);
  const [creatingForBoard, setCreatingForBoard] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', priority: 'medium' });
  const [createError, setCreateError] = useState('');
  const selectedTaskId = searchParams.get('task');

  const resetCreateForm = () => {
    setCreateForm({ title: '', description: '', priority: 'medium' });
    setCreateError('');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !creatingForBoard) return;
    setCreateError('');
    setCreating(true);
    try {
      const res = await api.post(`/boards/${creatingForBoard}/tasks`, {
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        priority: createForm.priority,
      });
      if (res.data.success) {
        const task = res.data.data.task;
        setTasks((prev) => ({
          ...prev,
          [creatingForBoard]: [...(prev[creatingForBoard] || []), task],
        }));
        setCreatingForBoard(null);
        resetCreateForm();
      }
    } catch (err: any) {
      setCreateError(err?.response?.data?.error?.message || 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadProject();
    const socket = connectSocket();
    if (boardId) joinBoard(boardId);

    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 25000);

    return () => {
      clearInterval(heartbeatInterval);
      if (boardId) {
        leaveBoard(boardId);
      }
    };
  }, [projectId, boardId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTaskCreated = (data: any) => {
      if (data.task?.boardId) {
        setTasks((prev) => ({
          ...prev,
          [data.task.boardId]: [...(prev[data.task.boardId] || []), data.task],
        }));
      }
    };

    const handleTaskMoved = (data: any) => {
      if (data.taskId === draggedTaskId.current) return;

      setTasks((prev) => {
        const newTasks = { ...prev };
        for (const boardId of Object.keys(newTasks)) {
          newTasks[boardId] = newTasks[boardId].filter((t) => t.id !== data.taskId);
        }
        if (data.toBoardId) {
          const movedTask = Object.values(prev).flat().find((t) => t.id === data.taskId);
          if (movedTask) {
            newTasks[data.toBoardId] = [
              ...(newTasks[data.toBoardId] || []),
              { ...movedTask, boardId: data.toBoardId, position: data.position },
            ];
          }
        }
        return newTasks;
      });
    };

    const handleTaskDeleted = (data: any) => {
      setTasks((prev) => {
        const newTasks = { ...prev };
        for (const bId of Object.keys(newTasks)) {
          newTasks[bId] = newTasks[bId].filter((t) => t.id !== data.taskId);
        }
        return newTasks;
      });
    };

    const handleTaskUpdated = (data: any) => {
      if (!data.task?.id) return;
      setTasks((prev) => {
        const newTasks = { ...prev };
        for (const bId of Object.keys(newTasks)) {
          newTasks[bId] = newTasks[bId].map((t) =>
            t.id === data.task.id ? { ...t, ...data.task } : t
          );
        }
        return newTasks;
      });
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:updated', handleTaskUpdated);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:updated', handleTaskUpdated);
    };
  }, []);

  const loadProject = async () => {
    try {
      const projRes = await api.get(`/projects/${projectId}`);
      if (projRes.data.success && projRes.data.data.project) {
        setBoards(projRes.data.data.project.boards || []);
        const boardIds = (projRes.data.data.project.boards || []).map((b: BoardType) => b.id);
        const taskPromises = boardIds.map((id: string) =>
          api.get(`/boards/${id}/tasks?limit=100`).then((r) => r.data)
        );
        const taskResults = await Promise.all(taskPromises);
        const taskMap: Record<string, Task[]> = {};
        boardIds.forEach((id: string, i: number) => {
          const result = taskResults[i];
          taskMap[id] = result.success ? result.data.tasks : [];
        });
        setTasks(taskMap);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskData = active.data.current?.task as Task;
    if (taskData) {
      setActiveTask(taskData);
      draggedTaskId.current = taskData.id;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    draggedTaskId.current = null;
    const { active, over } = event;
    if (!over) return;

    const activeTaskData = active.data.current?.task as Task;
    if (!activeTaskData) return;

    const fromBoardId = activeTaskData.boardId;
    let toBoardId: string;

    const overData = over.data.current;
    if (overData?.type === 'column') {
      toBoardId = over.id as string;
    } else if (overData?.type === 'task') {
      const overTask = overData.task as Task;
      toBoardId = overTask.boardId;
    } else {
      return;
    }

    if (fromBoardId === toBoardId && active.id === over.id) return;

    // Optimistic update
    setTasks((prev) => {
      const newTasks = { ...prev };
      const fromTasks = [...(newTasks[fromBoardId] || [])];
      const taskIndex = fromTasks.findIndex((t) => t.id === activeTaskData.id);
      if (taskIndex === -1) return prev;

      const [movedTask] = fromTasks.splice(taskIndex, 1);
      movedTask.boardId = toBoardId;

      if (fromBoardId === toBoardId) {
        const toTasks = [...fromTasks];
        const overIndex = toTasks.findIndex((t) => t.id === over.id);
        if (overIndex !== -1) {
          newTasks[toBoardId] = arrayMove(toTasks, taskIndex, overIndex);
        } else {
          newTasks[toBoardId] = [...fromTasks, movedTask];
        }
      } else {
        newTasks[fromBoardId] = fromTasks;
        const toTasks = [...(newTasks[toBoardId] || [])];
        const overIndex = toTasks.findIndex((t) => t.id === over.id);
        if (overIndex !== -1) {
          toTasks.splice(overIndex, 0, movedTask);
        } else {
          toTasks.push(movedTask);
        }
        newTasks[toBoardId] = toTasks;
      }
      return newTasks;
    });

    const targetBoard = boards.find((b) => b.id === toBoardId);
    if (targetBoard) {
      try {
        const res = await api.patch(`/tasks/${activeTaskData.id}/move`, {
          boardId: toBoardId,
          position: 65536.0,
        });
        if (!res.data.success) loadProject();
      } catch {
        console.error('Failed to move task');
        loadProject();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/workspaces/${slug}/projects/${projectId}`)}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <h2 className="text-lg font-semibold">Kanban Board</h2>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {boards.map((board) => (
            <BoardColumn
              key={board.id}
              board={board}
              tasks={tasks[board.id] || []}
              onTaskClick={(task) => setSearchParams({ task: task.id })}
              onAddTask={() => { setCreatingForBoard(board.id); resetCreateForm(); }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} onClick={() => {}} isDragging />}
        </DragOverlay>
      </DndContext>

      {creatingForBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreatingForBoard(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Task</h2>
              <button onClick={() => setCreatingForBoard(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional details..."
                  disabled={creating}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, priority: e.target.value }))}
                  disabled={creating}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreatingForBoard(null)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || !createForm.title.trim()}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          onClose={() => setSearchParams({})}
          onTaskUpdated={(updatedTask) => {
            setTasks((prev) => {
              const newTasks = { ...prev };
              for (const bId of Object.keys(newTasks)) {
                newTasks[bId] = newTasks[bId].map((t) => t.id === updatedTask.id ? updatedTask : t);
              }
              return newTasks;
            });
          }}
        />
      )}
    </div>
  );
}
