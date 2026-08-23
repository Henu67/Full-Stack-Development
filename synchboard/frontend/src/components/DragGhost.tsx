import type { Task } from '../types';
import { getNoteTilt, getPinRotate } from '../utils/noteStyle';
import NoteContent from './NoteContent';
import { motion } from 'framer-motion';

interface DragGhostProps {
  task: Task;
  tiltDelta: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function DragGhost({ task, tiltDelta }: DragGhostProps) {
  const baseTilt = getNoteTilt(task.id);
  const pinRotate = getPinRotate(task.id);
  
  // Pro-level: Dynamic 3D tilt based on drag velocity
  const tiltX = clamp(tiltDelta / 6, -18, 18);
  const tiltY = clamp(tiltDelta / 12, -8, 8);

  return (
    <motion.div
      initial={{ scale: 1, y: 0 }}
      animate={{ 
        scale: 1.12,
        y: -15, // Lifts up
        rotate: baseTilt + tiltX,
        rotateY: tiltY,
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 350, 
        damping: 25, 
        mass: 1.2 
      }}
      className={`sticky-note note-${task.color} is-dragging drag-ghost`}
      style={{
        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4), 0 18px 36px -18px rgba(0, 0, 0, 0.25)',
        opacity: 0.95,
        filter: 'brightness(1.1) contrast(1.02)',
        cursor: 'grabbing',
        zIndex: 9999,
        transformOrigin: 'center center',
      }}
    >
      <NoteContent task={task} pinRotate={pinRotate} editable={false} deletable={false} />
    </motion.div>
  );
}
