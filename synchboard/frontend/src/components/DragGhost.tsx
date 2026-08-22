import type { Task } from '../types';
import { getNoteTilt, getPinRotate } from '../utils/noteStyle';
import NoteContent from './NoteContent';

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
  const tilt = clamp(tiltDelta / 9, -14, 14);

  const style: React.CSSProperties = {
    transform: `rotate(${(baseTilt + tilt).toFixed(2)}deg) scale(1.08)`,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 15px 25px -5px rgba(0, 0, 0, 0.2)',
    opacity: 0.95,
    filter: 'brightness(1.05)',
  };

  return (
    <div style={style} className={`sticky-note note-${task.color} is-dragging drag-ghost`}>
      <NoteContent task={task} pinRotate={pinRotate} editable={false} deletable={false} />
    </div>
  );
}
