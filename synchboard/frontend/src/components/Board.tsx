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
import { motion } from 'framer-motion';
import { Pin as PinIcon, Plus, AlertCircle, MapPin, Edit2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useTasks } from '../hooks/useTasks';
import type { NoteColor, Task, TaskStatus } from '../types';
import { COLUMNS } from '../types';
import Column from './Column';
import ConfirmDialog from './ConfirmDialog';
import DragGhost from './DragGhost';
import TaskModal from './TaskModal';

export default function Board() {
  const { tasks, addTask, updateTask, deleteTask, moveTask } = useTasks();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [shakeColumn, setShakeColumn] = useState<TaskStatus | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], 'in-progress': [], done: [] };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

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
      // Pro touch: subtle haptic feedback on drop back to same place
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      return;
    }

    const result = moveTask(task.id, target);
    if (!result.ok) {
      setShakeColumn(target);
      setTimeout(() => setShakeColumn(null), 420);
      const message =
        result.reason === 'terminal'
          ? 'Done is final — this task can\'t move back.'
          : 'Must pass through "In Progress" first.';
      toast.error(message, { icon: <AlertCircle size={18} color="#EF4444" /> });
      // Pro touch: error vibration pattern
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([10, 30, 10]);
      return;
    }

    const label = COLUMNS.find((c) => c.id === target)?.title;
    toast.success(`Moved to ${label}`, { icon: <MapPin size={18} color="#10B981" /> });
    // Pro touch: success vibration
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

  function handleModalSubmit(title: string, description: string, color: NoteColor) {
    if (modalMode === 'add') {
      addTask(title, description, color);
      toast.success('Task pinned to the board', { icon: <PinIcon size={18} color="#3B82F6" /> });
    } else if (editingTask) {
      updateTask(editingTask.id, { title, description, color });
      toast.success('Task updated', { icon: <Edit2 size={18} color="#F59E0B" /> });
    }
    setModalOpen(false);
  }

  function handleConfirmDelete() {
    if (pendingDelete) {
      deleteTask(pendingDelete.id);
      toast('Note removed', { icon: <Trash2 size={18} color="#6B7280" /> });
      setPendingDelete(null);
    }
  }

  const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.9',
        },
      },
    }),
    duration: 150, // Ultra-fast snap
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)', // Bouncy snappy feel
  };

  return (
    <div className="board-page">
      <Toaster position="bottom-center" toastOptions={{ className: 'app-toast', duration: 2400 }} />

      <header className="board-header">
        <div className="board-brand">
          <span className="brand-pin">
            <PinIcon size={20} strokeWidth={2.4} />
          </span>
          <div>
            <h1>SynchBoard</h1>
            {/* <p>Session 1 · front-end kanban prototype</p> */}
          </div>
        </div>
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
