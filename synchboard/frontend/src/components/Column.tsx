import { useDroppable } from '@dnd-kit/core';
import type { ColumnConfig, Task } from '../types';
import { isAdjacentMove } from '../types';
import TaskCard from './TaskCard';

interface ColumnProps {
  config: ColumnConfig;
  tasks: Task[];
  activeTask: Task | null;
  onEdit: (task: Task) => void;
  onRequestDelete: (task: Task) => void;
}

export default function Column({ config, tasks, activeTask, onEdit, onRequestDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: config.id });

  const isDropTarget = !!activeTask && activeTask.status !== config.id;
  const isInvalid = isOver && !!activeTask && !isAdjacentMove(activeTask.status, config.id);
  const isValidHover = isOver && !isInvalid && isDropTarget;

  return (
    <div className="column">
      <div className="column-header">
        <h3>{config.title}</h3>
        <span className="column-count">{tasks.length}</span>
      </div>
      <p className="column-hint">{config.hint}</p>

      <div
        ref={setNodeRef}
        className={[
          'column-drop-zone',
          isDropTarget ? 'is-droppable' : '',
          isValidHover ? 'is-hover-valid' : '',
          isInvalid ? 'is-hover-invalid' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {tasks.length === 0 ? (
          <div className="empty-state">
            <span>Nothing here yet</span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onRequestDelete={onRequestDelete} />
          ))
        )}
      </div>
    </div>
  );
}
