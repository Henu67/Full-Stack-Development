import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { NoteColor, Task } from '../types';
import { NOTE_COLORS } from '../types';

interface TaskModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: Task | null;
  onClose: () => void;
  onSubmit: (title: string, description: string, color: NoteColor) => void;
}

export default function TaskModal({ open, mode, initial, onClose, onSubmit }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<NoteColor>('yellow');
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset the form fields when the modal transitions from closed to open.
  // Done during render (not in an effect) so it doesn't trigger a second,
  // cascading render pass — see react-hooks/set-state-in-effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setColor(initial?.color ?? 'yellow');
      setError('');
    }
  }

  // Pure side effect (DOM focus), no setState here, so it stays an effect.
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Give the task a title before pinning it up.');
      return;
    }
    onSubmit(title, description, color);
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
            />

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
                >
                  {color === c.id && <span className="swatch-pin" />}
                </button>
              ))}
            </div>

            {error && <p className="field-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {mode === 'add' ? 'Pin it up' : 'Save changes'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}