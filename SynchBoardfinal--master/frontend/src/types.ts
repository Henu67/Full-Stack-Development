export type TaskStatus = string;

export type NoteColor = 'yellow' | 'pink' | 'sky' | 'mint' | 'lilac';

export interface Subtask {
  _id?: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  color: NoteColor;
  status: TaskStatus;
  dueDate?: string | null;
  subtasks?: Subtask[];
  createdAt: number;
  updatedAt: number;
}

export interface ColumnConfig {
  id: string;
  title: string;
  order: number;
  hint?: string;
}

export const NOTE_COLORS: { id: NoteColor; label: string; hex: string }[] = [
  { id: 'yellow', label: 'Yellow', hex: '#FFE066' },
  { id: 'pink', label: 'Pink', hex: '#FFAFC5' },
  { id: 'sky', label: 'Sky', hex: '#8ECAE6' },
  { id: 'mint', label: 'Mint', hex: '#B7E4C7' },
  { id: 'lilac', label: 'Lilac', hex: '#C9B6E4' },
];

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'todo', title: 'To Do', order: 0, hint: 'Write it down, pin it up' },
  { id: 'in-progress', title: 'In Progress', order: 1, hint: 'Being worked on' },
  { id: 'done', title: 'Done', order: 2, hint: 'Shipped it' },
];

export function isAdjacentMove(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return true; // Allow free dragging across custom columns
}

export function canEdit(_status?: TaskStatus): boolean {
  return true; // Any task can be edited now
}

export function canDelete(_status?: TaskStatus): boolean {
  return true; // Any task can be deleted now
}
