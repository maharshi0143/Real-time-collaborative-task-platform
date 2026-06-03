import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Board, Task } from '../../types';
import { TaskCard } from './TaskCard';
import { cn } from '../../utils/cn';
import { Plus } from 'lucide-react';

interface BoardColumnProps {
  board: Board;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
}

const statusColors: Record<string, string> = {
  'To Do': 'border-t-gray-400',
  'In Progress': 'border-t-blue-500',
  'In Review': 'border-t-amber-500',
  'Done': 'border-t-green-500',
};

export function BoardColumn({ board, tasks, onTaskClick, onAddTask }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: board.id,
    data: { type: 'column', board },
  });

  return (
    <div className="kanban-column flex flex-col max-h-full">
      <div className={cn('border-t-2 -mt-3 mx-3 mb-2 rounded-full', statusColors[board.name] || 'border-t-gray-400')}>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {board.name}
            </h3>
            <span className="text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5">
              {tasks.length}
            </span>
          </div>
          <button onClick={onAddTask} className="p-1 hover:bg-secondary rounded transition-colors">
            <Plus size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto space-y-2 mt-3 px-0.5 min-h-[100px] transition-colors rounded-lg',
          isOver && 'bg-primary/5'
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border-2 border-dashed border-border rounded-lg">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
