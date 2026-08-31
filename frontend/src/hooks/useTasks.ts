import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { NoteColor, Task, TaskStatus } from '../types';
import { canDelete, canEdit, isAdjacentMove } from '../types';
import toast from 'react-hot-toast';

export type MoveResult =
  | { ok: true }
  | { ok: false; reason: 'skip-column' | 'terminal' | 'not-found' };

const API_URL = '/api/tasks';

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('synchboard_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync tasks to localStorage for offline persistence
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('synchboard_tasks', JSON.stringify(tasks));
    }
  }, [tasks]);
  const { token, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchTasks = async () => {
      try {
        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error('Session expired');
        }
        if (!res.ok) throw new Error('Failed to fetch tasks');
        const data = await res.json();
        // Map _id to id for frontend compatibility
        setTasks(
          data.map((t: any) => ({
            ...t,
            id: t._id,
          }))
        );
      } catch (error) {
        toast.error('Failed to load tasks');
      }
    };

    fetchTasks();
  }, [isAuthenticated, token, logout]);

  const addTask = useCallback(
    async (title: string, description: string, color: NoteColor, dueDate?: string | null) => {
      if (!token) return;
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, description, color, status: 'todo', dueDate }),
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error('Session expired');
        }
        if (!res.ok) throw new Error('Failed to create task');
        const data = await res.json();
        const newTask = { ...data, id: data._id };
        setTasks((prev) => [...prev, newTask]);
        return newTask;
      } catch (error) {
        toast.error('Failed to create task');
      }
    },
    [token]
  );

  const updateTask = useCallback(
    async (id: string, updates: { title: string; description: string; color: NoteColor; dueDate?: string | null }) => {
      if (!token) return false;
      
      // Optimistic update
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
            dueDate: updates.dueDate,
            updatedAt: Date.now(),
          };
        })
      );

      if (!didUpdate) return false;

      // API update
      try {
        const res = await fetch(`${API_URL}/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error('Session expired');
        }
        if (!res.ok) throw new Error('Failed to update task');
        return true;
      } catch (error) {
        toast.error('Failed to update task on server');
        return false;
      }
    },
    [token]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      if (!token) return false;

      // Optimistic delete
      let didDelete = false;
      setTasks((prev) => {
        const task = prev.find((t) => t.id === id);
        if (!task || !canDelete(task.status)) return prev;
        didDelete = true;
        return prev.filter((t) => t.id !== id);
      });

      if (!didDelete) return false;

      // API delete
      try {
        const res = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error('Session expired');
        }
        if (!res.ok) throw new Error('Failed to delete task');
        return true;
      } catch (error) {
        toast.error('Failed to delete task on server');
        return false;
      }
    },
    [token]
  );

  const moveTask = useCallback(
    (id: string, to: TaskStatus): MoveResult => {
      let result: MoveResult = { ok: false, reason: 'not-found' };
      let originalTask: Task | undefined;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          originalTask = t;
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

      if (result.ok && originalTask && originalTask.status !== to) {
        // API update in background
        if (token) {
          fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: to }),
          }).then(res => {
            if (res.status === 401 || res.status === 403) {
              logout();
            }
          }).catch(() => {
            toast.error('Failed to sync move to server');
            // Revert state if necessary, but skipping for simplicity in this prototype
          });
        }
      }

      return result;
    },
    [token]
  );

  return { tasks, addTask, updateTask, deleteTask, moveTask };
}
