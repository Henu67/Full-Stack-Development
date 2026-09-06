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

const shadowGlows: Record<string, string> = {
  yellow: 'rgba(250, 204, 21, 0.35)',
  blue: 'rgba(96, 165, 250, 0.35)',
  pink: 'rgba(244, 114, 182, 0.35)',
  green: 'rgba(74, 222, 128, 0.35)',
  purple: 'rgba(192, 132, 252, 0.35)',
  orange: 'rgba(251, 146, 60, 0.35)'
};

export default function DragGhost({ task, tiltDelta }: DragGhostProps) {
  const baseTilt = getNoteTilt(task.id);
  const pinRotate = getPinRotate(task.id);
  
  const tiltX = clamp(tiltDelta / 4, -22, 22);
  const tiltY = clamp(tiltDelta / 10, -10, 10);
  
  const glowColor = shadowGlows[task.color] || 'rgba(0,0,0,0.2)';

  return (
    <motion.div
      initial={{ scale: 1, y: 0 }}
      animate={{ 
        scale: [1.15, 1.18, 1.15],
        y: -22,
        rotate: baseTilt + tiltX,
        rotateY: tiltY,
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 450, 
        damping: 22, 
        mass: 0.8,
        scale: {
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut"
        }
      }}
      className={`sticky-note note-${task.color} is-dragging drag-ghost`}
      style={{
        boxShadow: `0 40px 75px -15px rgba(0, 0, 0, 0.55), 0 25px 45px -10px ${glowColor}, 0 10px 20px -5px ${glowColor.replace('0.35', '0.6')}`,
        opacity: 0.98,
        filter: 'brightness(1.2) contrast(1.1) saturate(1.15)',
        cursor: 'grabbing',
        zIndex: 9999,
        transformOrigin: 'center center',
        willChange: 'transform, filter',
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%)',
          borderRadius: 'inherit',
          pointerEvents: 'none',
          zIndex: 10
        }} 
      />
      <NoteContent task={task} pinRotate={pinRotate} editable={false} deletable={false} />
    </motion.div>
  );
}
