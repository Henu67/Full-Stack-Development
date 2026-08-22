import { AnimatePresence, motion } from 'framer-motion';
import type { Task } from '../types';

interface ConfirmDialogProps {
  task: Task | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({ task, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {task && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="confirm-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <h3>Remove this note?</h3>
            <p>
              "<strong>{task.title}</strong>" will be pulled off the board for good.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                Keep it
              </button>
              <button type="button" className="btn btn-danger" onClick={onConfirm}>
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
