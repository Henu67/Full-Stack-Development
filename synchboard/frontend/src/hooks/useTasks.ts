import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { NoteColor, Task, TaskStatus } from '../types';
import { canDelete, canEdit, isAdjacentMove } from '../types';

const STORAGE_KEY = 'collabboard.tasks.v1';

function loadInitialTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Task[];
  } catch {
    // corrupted storage, fall back to seed data
  }
  const now = Date.now();
  return [
    {
      id: uuidv4(),
      title: 'Set up project repo',
      description: 'Init Vite + React + TS, agree on branch strategy.',
      color: 'yellow',
      status: 'done',
      createdAt: now - 400000,
      updatedAt: now - 400000,
    },
    {
      id: uuidv4(),
      title: 'Design Kanban UI',
      description: 'Sticky-note cards, drag and drop between columns.',
      color: 'sky',
      status: 'in-progress',
      createdAt: now - 200000,
      updatedAt: now - 200000,
    },
    {
      id: uuidv4(),
      title: 'Wire up Express API',
      description: 'routes/controllers/models structure for tasks.',
      color: 'pink',
      status: 'todo',
      createdAt: now - 100000,
      updatedAt: now - 100000,
    },
    {
      id: uuidv4(),
      title: 'Plan MongoDB schema',
      description: 'Task + Board + User models via Mongoose.',
      color: 'mint',
      status: 'todo',
      createdAt: now - 50000,
      updatedAt: now - 50000,
    },
  ];
}

export type MoveResult =
  | { ok: true }
  | { ok: false; reason: 'skip-column' | 'terminal' | 'not-found' };

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadInitialTasks);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // storage full or unavailable — in-memory state still works for this session
    }
  }, [tasks]);

  const addTask = useCallback((title: string, description: string, color: NoteColor) => {
    const now = Date.now();
    const newTask: Task = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim(),
      color,
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    };
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  }, []);

  const updateTask = useCallback(
    (id: string, updates: { title: string; description: string; color: NoteColor }) => {
      let didUpdate = false;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          if (!canEdit(t.status)) return t;
          didUpdate = true;
          return {
            ...t,
            title: updates.title.trim(),
            description: updates.description.trim(),
            color: updates.color,
            updatedAt: Date.now(),
          };
        })
      );
      return didUpdate;
    },
    []
  );

  const deleteTask = useCallback((id: string): boolean => {
    let didDelete = false;
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task || !canDelete(task.status)) return prev;
      didDelete = true;
      return prev.filter((t) => t.id !== id);
    });
    return didDelete;
  }, []);

  const moveTask = useCallback((id: string, to: TaskStatus): MoveResult => {
    let result: MoveResult = { ok: false, reason: 'not-found' };
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.status === to) {
          result = { ok: true };
          return t;
        }
        if (!isAdjacentMove(t.status, to)) {
          result = { ok: false, reason: t.status === 'done' ? 'terminal' : 'skip-column' };
          return t;
        }
        result = { ok: true };
        return { ...t, status: to, updatedAt: Date.now() };
      })
    );
    return result;
  }, []);

  return { tasks, addTask, updateTask, deleteTask, moveTask };
}