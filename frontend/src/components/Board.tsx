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
import { Plus, AlertCircle, MapPin, Edit2, Trash2, Search, Bell, ArrowLeft } from 'lucide-react';
import { Moon, Sun, MessageSquare, Calendar as CalendarIcon, Phone } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import type { NoteColor, Task, TaskStatus } from '../types';
import Column from './Column';
import ConfirmDialog from './ConfirmDialog';
import DragGhost from './DragGhost';
import TaskModal from './TaskModal';
import ChatPanel from './ChatPanel';
import VoiceChat from './VoiceChat';
import CalendarView from './CalendarView';

interface Activity {
  id: string;
  message: string;
  time: Date;
}

export default function Board() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isPersonal = !roomId || roomId === 'personal';
  const actualRoomId = isPersonal ? undefined : roomId;

  const { user, token } = useAuth();
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const { tasks, setTasks, addTask, updateTask, deleteTask, moveTask } = useTasks(actualRoomId);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [shakeColumn, setShakeColumn] = useState<TaskStatus | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);

  // Live cursors state
  const [cursors, setCursors] = useState<{ [id: string]: { x: number, y: number, user: any } }>({});

  // Pro Features State
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityLog, setActivityLog] = useState<Activity[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isCalendarView, setIsCalendarView] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer'>('editor'); // default editor for personal
  const [columns, setColumns] = useState<any[]>([]);
  const [pendingDeleteColumn, setPendingDeleteColumn] = useState<string | null>(null);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  
  // Column Modal State
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [columnModalMode, setColumnModalMode] = useState<'add' | 'edit'>('add');
  const [editingColumn, setEditingColumn] = useState<any>(null);
  const [columnTitleInput, setColumnTitleInput] = useState('');

  // Fetch Room Role & Columns
  useEffect(() => {
    if (actualRoomId && token) {
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${actualRoomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.members) {
          const myMembership = data.members.find((m: any) => {
            if (m.user && m.user._id) return m.user._id === user?.id;
            return m === user?.id || (m._id && m._id === user?.id);
          });
          if (myMembership && myMembership.role) {
            setUserRole(myMembership.role);
          } else {
            setUserRole('editor');
          }
          setRoomMembers(data.members);
        }
        if (data.columns && data.columns.length > 0) {
          setColumns(data.columns.sort((a: any, b: any) => a.order - b.order));
        } else {
          import('../types').then(t => setColumns(t.DEFAULT_COLUMNS));
        }
      })
      .catch(err => console.error(err));
    } else if (token) {
      setUserRole('editor');
      // Fetch personal columns
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.personalColumns && data.personalColumns.length > 0) {
          setColumns(data.personalColumns.sort((a: any, b: any) => a.order - b.order));
        } else {
          import('../types').then(t => setColumns(t.DEFAULT_COLUMNS));
        }
      })
      .catch(err => console.error(err));
    }
  }, [actualRoomId, token, user]);

  // Room Join and Socket Events
  useEffect(() => {
    if (socket && isConnected && actualRoomId) {
      socket.emit('join-room', actualRoomId);

      const onTaskAdded = (newTask: any) => {
        const task = { ...newTask, id: newTask._id || newTask.id };
        setTasks(prev => {
          if (prev.find(t => t.id === task.id)) return prev;
          return [...prev, task];
        });
      };

      const onTaskUpdated = (updatedTask: any) => {
        const task = { ...updatedTask, id: updatedTask._id || updatedTask.id };
        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      };

      const onTaskDeleted = (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      };

      const onCursorMove = (data: any) => {
        setCursors(prev => ({
          ...prev,
          [data.socketId]: data
        }));
        // Remove cursor after inactivity
        setTimeout(() => {
          setCursors(p => {
            const copy = { ...p };
            delete copy[data.socketId];
            return copy;
          });
        }, 5000);
      };

      socket.on('task-added', onTaskAdded);
      socket.on('task-updated', onTaskUpdated);
      socket.on('task-deleted', onTaskDeleted);
      socket.on('cursor-move', onCursorMove);

      return () => {
        socket.off('task-added', onTaskAdded);
        socket.off('task-updated', onTaskUpdated);
        socket.off('task-deleted', onTaskDeleted);
        socket.off('cursor-move', onCursorMove);
      };
    }
  }, [socket, isConnected, actualRoomId, setTasks]);

  // Track mouse move for cursor syncing
  useEffect(() => {
    if (socket && isConnected && actualRoomId && user) {
      const handleMouseMove = (e: MouseEvent) => {
        // Send normalized coordinates
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        socket.emit('cursor-move', {
          roomId: actualRoomId,
          x,
          y,
          socketId: socket.id,
          user: { name: user.name || user.email, avatar: user.avatar }
        });
      };
      
      // Throttle mouse moves (very naive implementation for demo)
      let timeout: any;
      const throttledMove = (e: MouseEvent) => {
        if (timeout) return;
        timeout = setTimeout(() => {
          handleMouseMove(e);
          timeout = null;
        }, 50);
      };

      window.addEventListener('mousemove', throttledMove);
      return () => window.removeEventListener('mousemove', throttledMove);
    }
  }, [socket, isConnected, actualRoomId, user]);

  
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
    const map: Record<string, Task[]> = {};
    columns.forEach(col => {
      map[col.id] = [];
    });
    const lowerQuery = searchQuery.toLowerCase();
    
    for (const t of tasks) {
      if (
        lowerQuery === '' || 
        t.title.toLowerCase().includes(lowerQuery) || 
        t.description.toLowerCase().includes(lowerQuery)
      ) {
        if (!map[t.status]) {
          map[t.status] = []; // Fallback for tasks with deleted columns
        }
        map[t.status].push(t);
      }
    }
    return map;
  }, [tasks, searchQuery, columns]);

  function handleDragStart(event: DragStartEvent) {
    if (userRole === 'viewer') return;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
    setDragDeltaX(0);
  }

  function handleDragMove(event: DragMoveEvent) {
    setDragDeltaX(event.delta.x);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (userRole === 'viewer') return;
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

    const label = columns.find((c) => c.id === target)?.title || target;
    toast.success(`Moved to ${label}`, { icon: <MapPin size={18} color="#10B981" /> });
    addActivity(`Moved "${task.title}" to ${label}`);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
  }

  function openAddModal() {
    if (userRole === 'viewer') {
      toast.error("Viewers cannot add tasks");
      return;
    }
    setModalMode('add');
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task: Task) {
    if (userRole === 'viewer') {
      toast.error("Viewers cannot edit tasks");
      return;
    }
    setModalMode('edit');
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleModalSubmit(title: string, description: string, color: NoteColor, dueDate?: string | null) {
    if (modalMode === 'add') {
      await addTask(title, description, color, dueDate);
      toast.success('Task pinned to the board');
      addActivity(`Created task "${title}"`);
    } else if (editingTask) {
      await updateTask(editingTask.id, { title, description, color, dueDate });
      toast.success('Task updated', { icon: <Edit2 size={18} color="#F59E0B" /> });
      addActivity(`Updated task "${title}"`);
    }
    setModalOpen(false);
  }

  const saveColumnsToBackend = (updatedColumns: any[]) => {
    if (actualRoomId) {
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${actualRoomId}/columns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ columns: updatedColumns })
      });
    } else {
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ personalColumns: updatedColumns })
      });
    }
  };

  const handleSaveColumn = () => {
    if (!columnTitleInput.trim()) return;
    
    if (columnModalMode === 'add') {
      const newCol = { 
        id: columnTitleInput.toLowerCase().replace(/\s+/g, '-'), 
        title: columnTitleInput, 
        order: columns.length 
      };
      const updatedColumns = [...columns, newCol];
      setColumns(updatedColumns);
      saveColumnsToBackend(updatedColumns);
      toast.success('Column added');
    } else if (editingColumn) {
      const updatedColumns = columns.map(c => 
        c.id === editingColumn.id ? { ...c, title: columnTitleInput } : c
      );
      setColumns(updatedColumns);
      saveColumnsToBackend(updatedColumns);
      toast.success('Column updated');
    }
    
    setColumnModalOpen(false);
    setColumnTitleInput('');
    setEditingColumn(null);
  };

  const handleConfirmDeleteColumn = () => {
    if (pendingDeleteColumn) {
      const updatedColumns = columns.filter(c => c.id !== pendingDeleteColumn);
      setColumns(updatedColumns);
      saveColumnsToBackend(updatedColumns);
      toast('Column removed');
      setPendingDeleteColumn(null);
    }
  };

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
          <button 
            className="btn-back" 
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="brand-title">
            <h1>SynchBoard</h1>
            <span className="board-badge">{actualRoomId ? 'Team Board' : 'Personal Board'}</span>
          </div>
        </div>
        
        {/* Room Members Section */}
        {!isPersonal && roomMembers.length > 0 && (
          <div className="flex items-center gap-2 mr-auto ml-2 md:ml-6 pl-2 md:pl-6 border-l border-gray-300 dark:border-gray-700">
            <div className="flex -space-x-2">
              {roomMembers.slice(0, 4).map((member, idx) => (
                <div key={idx} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 border-2 border-[var(--board-frame-bg)] flex items-center justify-center overflow-hidden shadow-sm" title={member.user?.name || member.user?.email || 'User'}>
                  {member.user?.avatar ? (
                    <img src={member.user.avatar} alt="" className="w-full h-full object-cover"/>
                  ) : (
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      {member.user?.name ? member.user.name.substring(0, 2).toUpperCase() : 'U'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {roomMembers.length > 4 && (
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                +{roomMembers.length - 4}
              </span>
            )}
            
            <button 
              onClick={() => {
                // Fetch the room to get the invite code if we don't have it locally
                fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${actualRoomId}`, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                  if (data.inviteCode) {
                    navigator.clipboard.writeText(`${window.location.origin}/join/${data.inviteCode}`);
                    toast.success('Invite link copied!');
                  }
                });
              }}
              className="ml-2 p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Copy Invite Link"
            >
              <Plus size={14} strokeWidth={3} />
              <span className="hidden sm:inline">Invite</span>
            </button>
          </div>
        )}

        <div className="board-tools">
          <button
            className="btn btn-ghost"
            title="Toggle Dark Mode"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={18} color="var(--ink-soft)" /> : <Moon size={18} color="var(--ink-soft)" />}
          </button>
          
          <div className="search-bar">
            <Search size={16} color="var(--ink-soft)" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <button 
            className="btn btn-ghost" 
            title="Toggle Calendar View"
            onClick={() => setIsCalendarView(!isCalendarView)}
          >
            <CalendarIcon size={18} color={isCalendarView ? "#3B82F6" : "var(--ink-soft)"} />
          </button>

          {actualRoomId && (
            <>
              <button 
                className="btn btn-ghost" 
                title="Toggle Room Chat"
                onClick={() => setIsChatOpen(!isChatOpen)}
              >
                <MessageSquare size={18} color={isChatOpen ? "#3B82F6" : "var(--ink-soft)"} />
              </button>

              <button 
                className="btn btn-ghost" 
                title="Join Voice Channel"
                onClick={() => setIsVoiceOpen(true)}
              >
                <Phone size={18} color="var(--ink-soft)" />
              </button>
            </>
          )}

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
          
          {userRole !== 'viewer' && (
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
          )}
          

        </div>
      </header>

      <main className="board-frame relative flex">
        {isCalendarView ? (
          <div className="w-full h-full p-4">
             <CalendarView tasks={tasks} />
          </div>
        ) : (
          <div className="board-frame-inner flex-1">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            >
              <div className="board-columns">
                {columns.map((col) => (
                  <div key={col.id} className={shakeColumn === col.id ? 'shake-wrap' : ''}>
                    <Column
                      config={col}
                      tasks={tasksByStatus[col.id] || []}
                      activeTask={activeTask}
                      onEdit={openEditModal}
                      onRequestDelete={setPendingDelete}
                      onEditColumn={userRole !== 'viewer' ? (id, newTitle) => {
                        setEditingColumn(columns.find(c => c.id === id));
                        setColumnTitleInput(newTitle);
                        setColumnModalMode('edit');
                        setColumnModalOpen(true);
                      } : undefined}
                      onDeleteColumn={userRole !== 'viewer' ? (id) => {
                        setPendingDeleteColumn(id);
                      } : undefined}
                    />
                  </div>
                ))}
                
                {/* Add Column Button */}
                {userRole !== 'viewer' && (
                  <div className="flex-shrink-0 w-80 pt-1">
                    <button
                      onClick={() => {
                        setColumnModalMode('add');
                        setColumnTitleInput('');
                        setColumnModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                    >
                      <Plus size={20} />
                      <span className="font-medium">Add Column</span>
                    </button>
                  </div>
                )}
              </div>
              <DragOverlay dropAnimation={dropAnimationConfig}>
                {activeTask ? <DragGhost task={activeTask} tiltDelta={dragDeltaX} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
        <div className="board-tray" aria-hidden="true" />
      </main>

      {actualRoomId && (
        <ChatPanel 
          roomId={actualRoomId} 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}

      {isVoiceOpen && actualRoomId && (
        <div className="fixed bottom-4 left-4 z-50">
          <VoiceChat roomId={actualRoomId} onLeave={() => setIsVoiceOpen(false)} />
        </div>
      )}

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        initial={editingTask}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />

      <ConfirmDialog 
        open={!!pendingDelete}
        title="Remove this note?"
        message={<>"{<strong>{pendingDelete?.title}</strong>}" will be pulled off the board for good.</>}
        onCancel={() => setPendingDelete(null)} 
        onConfirm={handleConfirmDelete} 
      />

      <ConfirmDialog 
        open={!!pendingDeleteColumn}
        title="Delete this column?"
        message="Are you sure you want to delete this column? Tasks inside will be lost unless you move them."
        onCancel={() => setPendingDeleteColumn(null)} 
        onConfirm={handleConfirmDeleteColumn} 
      />

      <AnimatePresence>
        {columnModalOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setColumnModalOpen(false)}
          >
            <motion.div
              className="confirm-card max-w-sm"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
            >
              <h3>{columnModalMode === 'add' ? 'Add Column' : 'Edit Column'}</h3>
              <div className="mt-4">
                <input
                  type="text"
                  autoFocus
                  placeholder="Column Name"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 mb-4"
                  value={columnTitleInput}
                  onChange={(e) => setColumnTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveColumn();
                  }}
                />
              </div>
              <div className="modal-actions mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setColumnModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleSaveColumn}>
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Cursors */}
      {Object.values(cursors).map((cursor, i) => (
        <div
          key={i}
          className="pointer-events-none fixed z-50 flex items-center gap-2 transition-all duration-100 ease-linear"
          style={{
            left: `${cursor.x * 100}vw`,
            top: `${cursor.y * 100}vh`,
          }}
        >
          <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-md border-2 border-white flex items-center justify-center overflow-hidden">
             {cursor.user.avatar ? <img src={cursor.user.avatar} className="w-full h-full object-cover" /> : <span className="text-[8px] text-white font-bold">{cursor.user.name[0]}</span>}
          </div>
          <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded shadow-sm">
            {cursor.user.name}
          </span>
        </div>
      ))}
    </div>
  );
}
