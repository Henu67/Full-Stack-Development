import { useDraggable } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import type { Task } from '../types';
import { canDelete, canEdit } from '../types';
import { getNoteTilt, getPinRotate } from '../utils/noteStyle';
import NoteContent from './NoteContent';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onRequestDelete: (task: Task) => void;
}

export default function TaskCard({ task, onEdit, onRequestDelete }: TaskCardProps) {
  const isLocked = task.status === 'done';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
    disabled: isLocked,
  });
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 480);
    return () => clearTimeout(t);
  }, []);

  const baseTilt = getNoteTilt(task.id);
  const pinRotate = getPinRotate(task.id);
  const editable = canEdit(task.status);
  const deletable = canDelete(task.status);

  const style: React.CSSProperties = {
    transform: `rotate(${baseTilt}deg)`,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sticky-note note-${task.color} ${isDragging ? 'is-dragging' : ''} ${entering ? 'note-enter' : ''} ${isLocked ? 'is-locked' : ''}`}
      {...listeners}
      {...attributes}
    >
      <NoteContent
        task={task}
        pinRotate={pinRotate}
        editable={editable}
        deletable={deletable}
        onEdit={onEdit}
        onRequestDelete={onRequestDelete}
      />
    </div>
  );
}
