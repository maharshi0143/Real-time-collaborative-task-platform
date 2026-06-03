import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { cn } from '../../utils/cn';
import { Avatar } from '../ui/avatar';
import { MessageSquare, Calendar } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-500',
};

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const isDueSoon = task.dueDate && !isOverdue && new Date(task.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'task-card group',
        isDragging && 'task-card-dragging'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={cn('text-[10px] font-semibold text-white px-2 py-0.5 rounded', priorityColors[task.priority] || 'bg-gray-500')}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className={cn('text-[10px] flex items-center gap-1', isOverdue && 'text-red-500', isDueSoon && 'text-yellow-600', !isOverdue && !isDueSoon && 'text-gray-400')}>
            <Calendar size={10} />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      <p data-testid="task-title" className="text-sm font-medium text-foreground leading-snug mb-2">
        {task.title}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar
              src={task.assignee.avatarUrl}
              fallback={task.assignee.username}
              size="sm"
              title={task.assignee.username}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {task.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>
              )}
            </div>
          )}
          <span data-testid="comment-count" className="text-xs text-muted-foreground flex items-center gap-1">
            <MessageSquare size={12} />
            {task.commentCount}
          </span>
        </div>
      </div>
    </div>
  );
}
