export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type NoteColor = 'yellow' | 'pink' | 'sky' | 'mint' | 'lilac';

export interface Task {
  id: string;
  title: string;
  description: string;
  color: NoteColor;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ColumnConfig {
  id: TaskStatus;
  title: string;
  hint: string;
}

export const NOTE_COLORS: { id: NoteColor; label: string; hex: string }[] = [
  { id: 'yellow', label: 'Yellow', hex: '#FFE066' },
  { id: 'pink', label: 'Pink', hex: '#FFAFC5' },
  { id: 'sky', label: 'Sky', hex: '#8ECAE6' },
  { id: 'mint', label: 'Mint', hex: '#B7E4C7' },
  { id: 'lilac', label: 'Lilac', hex: '#C9B6E4' },
];

export const COLUMNS: ColumnConfig[] = [
  { id: 'todo', title: 'To Do', hint: 'Write it down, pin it up' },
  { id: 'in-progress', title: 'In Progress', hint: 'Being worked on' },
  { id: 'done', title: 'Done', hint: 'Shipped it' },
];

/**
 * Allowed transitions:
 *   todo <-> in-progress <-> done   (adjacent columns only, either direction)
 * except that once a card is "done" it's terminal — it can't move back to
 * In Progress or To Do. A card also can never jump straight between
 * To Do and Done; it must pass through In Progress.
 */
export function isAdjacentMove(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  if (from === 'done') return false; // done is terminal, no moves out of it
  const order: TaskStatus[] = ['todo', 'in-progress', 'done'];
  return Math.abs(order.indexOf(from) - order.indexOf(to)) === 1;
}

export function canEdit(status: TaskStatus): boolean {
  return status === 'todo';
}

export function canDelete(status: TaskStatus): boolean {
  return status === 'todo' || status === 'done';
}
