import { AnimatePresence, motion } from 'framer-motion';
import { X, Calendar, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { NoteColor, Task } from '../types';
import { NOTE_COLORS } from '../types';

interface TaskModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: Task | null;
  onClose: () => void;
  onSubmit: (title: string, description: string, color: NoteColor, dueDate?: string | null, subtasks?: { title: string, completed: boolean }[]) => Promise<void> | void;
}

export default function TaskModal({ open, mode, initial, onClose, onSubmit }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<NoteColor>('yellow');
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<{ title: string, completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setColor(initial?.color ?? 'yellow');
      setDueDate(initial?.dueDate ? new Date(initial.dueDate).toISOString().split('T')[0] : '');
      setSubtasks(initial?.subtasks?.map(st => ({ title: st.title, completed: st.completed })) ?? []);
      setNewSubtaskTitle('');
      setError('');
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => titleRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleToggleSubtask = (index: number) => {
    setSubtasks(subtasks.map((st, i) => i === index ? { ...st, completed: !st.completed } : st));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!title.trim()) {
      setError('Give the task a title before pinning it up.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(title, description, color, dueDate || null, subtasks);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            className={`modal-card note-${color}`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24, scale: 0.92, rotate: -3 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94, rotate: 2 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          >
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>

            <h2>{mode === 'add' ? 'New task' : 'Edit task'}</h2>

            <label className="field-label" htmlFor="task-title">
              Title
            </label>
            <input
              id="task-title"
              ref={titleRef}
              className="field-input"
              value={title}
              maxLength={60}
              placeholder="e.g. Design the login page"
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              disabled={isSubmitting}
            />

            <label className="field-label" htmlFor="task-desc">
              Details <span className="field-optional">(optional)</span>
            </label>
            <textarea
              id="task-desc"
              className="field-textarea"
              value={description}
              maxLength={180}
              rows={3}
              placeholder="Any notes for the team..."
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
            
            <label className="field-label" htmlFor="task-due-date" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> Due Date <span className="field-optional">(optional)</span>
            </label>
            <input
              id="task-due-date"
              type="date"
              className="field-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSubmitting}
            />

            <label className="field-label">
              Subtasks <span className="field-optional">(optional)</span>
            </label>
            <div className="flex flex-col gap-2 mb-4">
              {subtasks.map((st, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/50 p-2 rounded border border-black/10">
                  <input 
                    type="checkbox" 
                    checked={st.completed} 
                    onChange={() => handleToggleSubtask(i)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`flex-1 text-sm ${st.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {st.title}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSubtask(i)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Add a subtask..."
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="flex-1 field-input !mb-0 text-sm py-1.5"
                  disabled={isSubmitting}
                />
                <button 
                  type="button" 
                  onClick={handleAddSubtask}
                  className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors"
                  disabled={isSubmitting || !newSubtaskTitle.trim()}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <span className="field-label">Note color</span>
            <div className="color-swatches">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`swatch swatch-${c.id} ${color === c.id ? 'is-selected' : ''}`}
                  style={{ background: c.hex }}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setColor(c.id)}
                  disabled={isSubmitting}
                >
                  {color === c.id && <span className="swatch-pin" />}
                </button>
              ))}
            </div>

            {error && <p className="field-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (mode === 'add' ? 'Pin it up' : 'Save changes')}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}