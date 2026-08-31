import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin as PinIcon, Plus, AlertCircle, MapPin, Edit2, Trash2, LogOut, Search, Bell } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../context/AuthContext';
import type { NoteColor, Task, TaskStatus } from '../types';
import { COLUMNS } from '../types';
import Column from './Column';
import ConfirmDialog from './ConfirmDialog';
import DragGhost from './DragGhost';
import TaskModal from './TaskModal';

interface Activity {
  id: string;
  message: string;
  time: Date;
}

export default function Board() {
  const { logout, user } = useAuth();
  const { tasks, addTask, updateTask, deleteTask, moveTask } = useTasks();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [shakeColumn, setShakeColumn] = useState<TaskStatus | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);

  // Pro Features State
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityLog, setActivityLog] = useState<Activity[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const notifiedTasks = useRef<Set<string>>(new Set());

  // Deadline notifications
  useEffect(() => {
    const now = new Date().getTime();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    tasks.forEach(task => {
      if (task.status === 'done' || !task.dueDate) return;
      
      const dueTime = new Date(task.dueDate).getTime();
      const timeUntilDue = dueTime - now;

      // Notify if due within 48 hours OR overdue
      if (timeUntilDue <= fortyEightHours) {
        if (!notifiedTasks.current.has(task.id)) {
          notifiedTasks.current.add(task.id);
          const isOverdue = timeUntilDue < 0;
          toast(
            isOverdue 
              ? `Task "${task.title}" is OVERDUE!` 
              : `Task "${task.title}" is due soon!`, 
            {
              icon: isOverdue ? '🚨' : '⚠️',
              style: { 
                border: `1px solid ${isOverdue ? '#dc2626' : '#f59e0b'}`, 
                padding: '16px', 
                color: isOverdue ? '#991b1b' : '#92400e' 
              },
              duration: 6000,
            }
          );
          addActivity(isOverdue ? `Overdue alert for "${task.title}"` : `Deadline warning for "${task.title}"`);
        }
      }
    });
  }, [tasks]);

  // Close notifications on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addActivity = (message: string) => {
    setActivityLog(prev => [{ id: Math.random().toString(), message, time: new Date() }, ...prev]);
    setHasUnread(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], 'in-progress': [], done: [] };
    const lowerQuery = searchQuery.toLowerCase();
    
    for (const t of tasks) {
      if (
        lowerQuery === '' || 
        t.title.toLowerCase().includes(lowerQuery) || 
        t.description.toLowerCase().includes(lowerQuery)
      ) {
        map[t.status].push(t);
      }
    }
    return map;
  }, [tasks, searchQuery]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
    setDragDeltaX(0);
  }

  function handleDragMove(event: DragMoveEvent) {
    setDragDeltaX(event.delta.x);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setDragDeltaX(0);
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const target = over.id as TaskStatus;
    if (target === task.status) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      return;
    }

    const result = moveTask(task.id, target);
    if (result.ok === false && 'reason' in result) {
      setShakeColumn(target);
      setTimeout(() => setShakeColumn(null), 420);
      const message =
        result.reason === 'terminal'
          ? 'Done is final — this task can\'t move back.'
          : 'Must pass through "In Progress" first.';
      toast.error(message, { icon: <AlertCircle size={18} color="#EF4444" /> });
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([10, 30, 10]);
      return;
    }

    const label = COLUMNS.find((c) => c.id === target)?.title;
    toast.success(`Moved to ${label}`, { icon: <MapPin size={18} color="#10B981" /> });
    addActivity(`Moved "${task.title}" to ${label}`);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
  }

  function openAddModal() {
    setModalMode('add');
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task: Task) {
    setModalMode('edit');
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleModalSubmit(title: string, description: string, color: NoteColor, dueDate?: string | null) {
    if (modalMode === 'add') {
      await addTask(title, description, color, dueDate);
      toast.success('Task pinned to the board', { icon: <PinIcon size={18} color="#3B82F6" /> });
      addActivity(`Created task "${title}"`);
    } else if (editingTask) {
      await updateTask(editingTask.id, { title, description, color, dueDate });
      toast.success('Task updated', { icon: <Edit2 size={18} color="#F59E0B" /> });
      addActivity(`Updated task "${title}"`);
    }
    setModalOpen(false);
  }

  function handleConfirmDelete() {
    if (pendingDelete) {
      deleteTask(pendingDelete.id);
      toast('Note removed', { icon: <Trash2 size={18} color="#6B7280" /> });
      addActivity(`Deleted task "${pendingDelete.title}"`);
      setPendingDelete(null);
    }
  }

  const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.95',
        },
      },
    }),
    duration: 250,
    easing: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    if (!notificationsOpen) setHasUnread(false);
  };

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-brand">
          <span className="brand-pin">
            <PinIcon size={20} strokeWidth={2.4} />
          </span>
          <div>
            <h1>SynchBoard</h1>
          </div>
        </div>
        
        <div className="board-tools">
          <div className="search-bar">
            <Search size={16} color="var(--ink-soft)" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="notification-wrapper" ref={notifRef}>
            <button className="notification-bell" onClick={toggleNotifications}>
              <Bell size={20} strokeWidth={2.4} />
              {hasUnread && <span className="notification-dot" />}
            </button>
            
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div 
                  className="notification-dropdown"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="notification-header">
                    <span>Activity Log</span>
                    {activityLog.length > 0 && (
                      <button className="notification-clear" onClick={() => setActivityLog([])}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="notification-list">
                    {activityLog.length === 0 ? (
                      <div className="notification-empty">No recent activity.</div>
                    ) : (
                      activityLog.map(act => (
                        <div key={act.id} className="notification-item">
                          <span>{act.message}</span>
                          <span className="notification-time">
                            {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-soft)', marginLeft: '8px', display: 'none' }} className="user-email-display">
            {user?.email}
          </span>
          
          <motion.button
            type="button"
            className="btn btn-add"
            onClick={openAddModal}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
          >
            <Plus size={18} strokeWidth={2.6} />
            Add task
          </motion.button>
          
          <motion.button
            type="button"
            onClick={logout}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pin-red)', borderColor: 'rgba(230,57,70,0.3)' }}
            title="Log out"
            whileHover={{ scale: 1.04, backgroundColor: 'rgba(230,57,70,0.05)' }}
            whileTap={{ scale: 0.96 }}
          >
            <LogOut size={18} strokeWidth={2.6} />
            <span>Logout</span>
          </motion.button>
        </div>
      </header>

      <main className="board-frame">
        <div className="board-frame-inner">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            <div className="board-columns">
              {COLUMNS.map((col) => (
                <div key={col.id} className={shakeColumn === col.id ? 'shake-wrap' : ''}>
                  <Column
                    config={col}
                    tasks={tasksByStatus[col.id]}
                    activeTask={activeTask}
                    onEdit={openEditModal}
                    onRequestDelete={setPendingDelete}
                  />
                </div>
              ))}
            </div>
            <DragOverlay dropAnimation={dropAnimationConfig}>
              {activeTask ? <DragGhost task={activeTask} tiltDelta={dragDeltaX} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
        <div className="board-tray" aria-hidden="true" />
      </main>

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        initial={editingTask}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />

      <ConfirmDialog task={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={handleConfirmDelete} />
    </div>
  );
}
