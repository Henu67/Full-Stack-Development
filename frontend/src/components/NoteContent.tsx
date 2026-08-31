import { Pencil, Trash2, Clock } from 'lucide-react';
import type { Task } from '../types';

function getDueDateStyle(dateString: string): React.CSSProperties {
  const due = new Date(dateString);
  const now = new Date();
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);
  
  if (diffDays < 0) {
    return { color: '#E63946', fontWeight: 700 }; // Overdue
  } else if (diffDays <= 2) {
    return { color: '#F59E0B', fontWeight: 600 }; // Due soon (2 days)
  }
  return { color: 'rgba(0,0,0,0.45)' };
}

interface NoteContentProps {
  task: Task;
  pinRotate: number;
  editable: boolean;
  deletable: boolean;
  onEdit?: (task: Task) => void;
  onRequestDelete?: (task: Task) => void;
}

export default function NoteContent({
  task,
  pinRotate,
  editable,
  deletable,
  onEdit,
  onRequestDelete,
}: NoteContentProps) {
  return (
    <>
      <div className="note-pin-wrap" style={{ transform: `rotate(${pinRotate}deg)` }} aria-hidden="true">
        <PinSvg />
      </div>

      {(editable || deletable) && (
        <div className="note-actions">
          {editable && (
            <button
              type="button"
              className="note-icon-btn note-edit"
              aria-label={`Edit "${task.title}"`}
              title="Edit"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(task);
              }}
            >
              <Pencil size={14} strokeWidth={2.4} />
            </button>
          )}
          {deletable && (
            <button
              type="button"
              className="note-icon-btn note-delete"
              aria-label={`Delete "${task.title}"`}
              title="Delete"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete?.(task);
              }}
            >
              <Trash2 size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
      )}

      <div className="note-body">
        <h4 className="note-title">{task.title}</h4>
        {task.description && <p className="note-desc">{task.description}</p>}
        
        {task.dueDate && (
          <div className="note-due" style={getDueDateStyle(task.dueDate)}>
            <Clock size={12} strokeWidth={2.4} />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="note-curl" aria-hidden="true" />
    </>
  );
}

function PinSvg() {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true">
      <ellipse cx="11" cy="23" rx="4" ry="1.4" fill="#000" opacity="0.15" />
      <line x1="11" y1="10" x2="9" y2="22" stroke="#8a1f2b" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="11" cy="8" r="7.5" fill="#e63946" />
      <circle cx="8.5" cy="5.3" r="2.6" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}
