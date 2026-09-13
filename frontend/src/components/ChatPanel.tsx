import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Send, X, MessageSquare, MoreVertical, Reply, Copy, Pin, PinOff,
  Trash2, Image as ImageIcon, FileText, Link as LinkIcon, Loader2,
  ArrowLeft, ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmDialog from './ConfirmDialog';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const API_BASE = import.meta.env.VITE_API_URL || '';

interface ChatUser {
  _id: string;
  name: string;
  avatar?: string;
}

interface Attachment {
  url: string;
  type: 'image' | 'file';
  name?: string;
  size?: number;
}

interface Reaction {
  user: ChatUser | string;
  emoji: string;
}

interface ReplySnippet {
  _id: string;
  content: string;
  sender: ChatUser;
  attachment?: Attachment | null;
  isDeletedForEveryone?: boolean;
}

interface Message {
  _id: string;
  sender: ChatUser;
  content: string;
  attachment?: Attachment | null;
  replyTo?: ReplySnippet | null;
  reactions: Reaction[];
  isDeletedForEveryone?: boolean;
  pinned?: boolean;
  createdAt: string;
}

interface ChatPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ContextMenuState {
  message: Message;
  x: number;
  y: number;
  placement: 'desktop' | 'mobile';
}

function reactionUserId(r: Reaction): string {
  return typeof r.user === 'string' ? r.user : r.user._id;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Very small URL matcher — good enough for a "Links" tab, not a validator.
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

const ChatPanel: React.FC<ChatPanelProps> = ({ roomId, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [clearChatConfirmOpen, setClearChatConfirmOpen] = useState(false);
  const [mediaViewerTab, setMediaViewerTab] = useState<'media' | 'links' | 'docs' | null>(null);
  const [clearBump, setClearBump] = useState(0);

  const { socket, isConnected } = useSocket();
  const { user, token } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearedAtKey = `synchboard_chat_cleared_${roomId}_${user?.id || 'anon'}`;

  // Derived (not stored) — recomputes when the room/user changes, or when
  // handleClearChat bumps the counter after writing a new value.
  const clearedAt = useMemo(() => {
    // `clearBump` isn't used in the calculation itself — referencing it here
    // is what tells this memo to recompute after handleClearChat writes a
    // fresh timestamp to localStorage (an external, mutable source that
    // useMemo can't otherwise detect changed).
    void clearBump;
    const saved = localStorage.getItem(clearedAtKey);
    return saved ? parseInt(saved, 10) : 0;
  }, [clearedAtKey, clearBump]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Fetch history
  useEffect(() => {
    if (!isOpen) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rooms/${roomId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setMessages(await res.json());
          scrollToBottom();
        }
      } catch (e) {
        console.error('Failed to load messages', e);
      }
    };
    fetchMessages();
  }, [isOpen, roomId, token, scrollToBottom]);

  // Live updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onReceive = (msg: Message) => {
      setMessages((prev) => (prev.find((m) => m._id === msg._id) ? prev : [...prev, msg]));
      scrollToBottom();
    };
    const onUpdated = (msg: Message) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    socket.on('receive-message', onReceive);
    socket.on('message-updated', onUpdated);
    return () => {
      socket.off('receive-message', onReceive);
      socket.off('message-updated', onUpdated);
    };
  }, [socket, isConnected, scrollToBottom]);

  // Close header dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close context menu on Escape / outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => new Date(m.createdAt).getTime() > clearedAt),
    [messages, clearedAt]
  );

  const pinnedMessages = useMemo(() => messages.filter((m) => m.pinned && !m.isDeletedForEveryone), [messages]);

  // ---------- Sending ----------

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image uploads are supported right now');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setPendingAttachment({ url: data.url, type: data.type, name: data.name, size: data.size });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          uploadFile(file);
        }
        return;
      }
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && !pendingAttachment) return;
    if (uploading) {
      toast.error('Wait for the image to finish uploading');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: newMessage,
          attachment: pendingAttachment,
          replyTo: replyingTo?._id || null,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => (prev.find((m) => m._id === msg._id) ? prev : [...prev, msg]));
        scrollToBottom();
        setNewMessage('');
        setPendingAttachment(null);
        setReplyingTo(null);
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to send message');
      }
    } catch (e) {
      console.error('Failed to send message', e);
      toast.error('Failed to send message');
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---------- Message actions ----------

  const openContextMenu = (message: Message, x: number, y: number, placement: 'desktop' | 'mobile') => {
    if (message.isDeletedForEveryone) return;
    setContextMenu({ message, x, y, placement });
  };

  const handleContextMenuEvent = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    openContextMenu(message, e.clientX, e.clientY, 'desktop');
  };

  const handleTouchStart = (message: Message) => {
    longPressTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
      openContextMenu(message, 0, 0, 'mobile');
    }, 480);
  };
  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReact = async (message: Message, emoji: string) => {
    setContextMenu(null);
    // Optimistic toggle
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== message._id) return m;
        const idx = m.reactions.findIndex((r) => reactionUserId(r) === user?.id);
        const reactions = [...m.reactions];
        if (idx !== -1 && reactions[idx].emoji === emoji) {
          reactions.splice(idx, 1);
        } else if (idx !== -1) {
          reactions[idx] = { ...reactions[idx], emoji };
        } else {
          reactions.push({ user: user?.id || '', emoji });
        }
        return { ...m, reactions };
      })
    );
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/messages/${message._id}/react`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      }
    } catch {
      toast.error('Failed to react');
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setContextMenu(null);
    textareaRef.current?.focus();
  };

  const handleCopy = (message: Message) => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success('Copied');
    }
    setContextMenu(null);
  };

  const handleTogglePin = async (message: Message) => {
    setContextMenu(null);
    const endpoint = message.pinned ? 'unpin' : 'pin';
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/messages/${message._id}/${endpoint}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = await res.json();
        setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to update pin');
      }
    } catch {
      toast.error('Failed to update pin');
    }
  };

  const requestDelete = (message: Message) => {
    setContextMenu(null);
    setDeleteTarget(message);
  };

  const confirmDelete = async (forEveryone: boolean) => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/messages/${target._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ forEveryone }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || 'Failed to delete message');
        return;
      }
      if (forEveryone) {
        const updated = await res.json();
        setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== target._id));
      }
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const handleClearChat = () => {
    const now = Date.now();
    localStorage.setItem(clearedAtKey, String(now));
    setClearBump((v) => v + 1);
    setClearChatConfirmOpen(false);
    setHeaderMenuOpen(false);
    toast.success('Chat cleared from this device');
  };

  // ---------- Media / links / docs (derived from loaded history) ----------

  const mediaItems = useMemo(
    () => messages.filter((m) => !m.isDeletedForEveryone && m.attachment?.type === 'image'),
    [messages]
  );
  const docItems = useMemo(
    () => messages.filter((m) => !m.isDeletedForEveryone && m.attachment?.type === 'file'),
    [messages]
  );
  const linkItems = useMemo(() => {
    const found: { message: Message; url: string }[] = [];
    messages.forEach((m) => {
      if (m.isDeletedForEveryone || !m.content) return;
      const matches = m.content.match(URL_REGEX);
      matches?.forEach((url) => found.push({ message: m, url }));
    });
    return found;
  }, [messages]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-screen w-full sm:w-96 md:w-80 bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 flex flex-col z-50"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 shrink-0">
            <h2 className="font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Room Chat
            </h2>
            <div className="flex items-center gap-1">
              <div className="relative" ref={headerMenuRef}>
                <button
                  onClick={() => setHeaderMenuOpen((v) => !v)}
                  className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Chat options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {headerMenuOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-10">
                    <button
                      onClick={() => { setMediaViewerTab('media'); setHeaderMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" /> Media, links &amp; docs
                    </button>
                    <button
                      onClick={() => { setClearChatConfirmOpen(true); setHeaderMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Clear chat
                    </button>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Pinned banner */}
          {pinnedMessages.length > 0 && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-900/40 flex items-start gap-2 text-xs shrink-0">
              <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-amber-700 dark:text-amber-400">Pinned: </span>
                <span className="text-amber-800 dark:text-amber-300 truncate">
                  {pinnedMessages[pinnedMessages.length - 1].content ||
                    (pinnedMessages[pinnedMessages.length - 1].attachment ? 'Photo' : '')}
                </span>
              </div>
              <button
                onClick={() => handleTogglePin(pinnedMessages[pinnedMessages.length - 1])}
                className="text-amber-600 dark:text-amber-400 hover:underline shrink-0"
              >
                Unpin
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-slate-800/50">
            {visibleMessages.map((msg) => {
              const isMine = msg.sender._id === user?.id;
              const reactionGroups = msg.reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {});
              const myReaction = msg.reactions.find((r) => reactionUserId(r) === user?.id)?.emoji;

              return (
                <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isMine && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-slate-600">
                      {msg.sender.avatar ? (
                        <img src={msg.sender.avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{msg.sender.name?.[0] || '?'}</span>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && <span className="text-[10px] text-gray-500 dark:text-slate-400 mb-1 ml-1">{msg.sender.name}</span>}

                    {msg.isDeletedForEveryone ? (
                      <div className="px-3 py-2 rounded-2xl text-sm italic text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600">
                        This message was deleted
                      </div>
                    ) : (
                      <div
                        onContextMenu={(e) => handleContextMenuEvent(e, msg)}
                        onTouchStart={() => handleTouchStart(msg)}
                        onTouchEnd={clearLongPress}
                        onTouchMove={clearLongPress}
                        className={`relative select-none px-3 py-2 rounded-2xl text-sm cursor-pointer ${
                          isMine
                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-slate-100 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.pinned && (
                          <Pin className={`w-3 h-3 absolute -top-1.5 -right-1.5 ${isMine ? 'text-amber-200' : 'text-amber-500'}`} />
                        )}

                        {msg.replyTo && (
                          <div className={`mb-1.5 px-2 py-1 rounded-lg text-xs border-l-2 ${
                            isMine ? 'bg-indigo-700/40 border-indigo-300' : 'bg-gray-100 dark:bg-slate-800 border-indigo-400'
                          }`}>
                            <div className={`font-medium ${isMine ? 'text-indigo-100' : 'text-indigo-500 dark:text-indigo-400'}`}>
                              {msg.replyTo.sender?.name || 'Unknown'}
                            </div>
                            <div className="truncate opacity-80">
                              {msg.replyTo.isDeletedForEveryone
                                ? 'This message was deleted'
                                : msg.replyTo.content || (msg.replyTo.attachment ? '📷 Photo' : '')}
                            </div>
                          </div>
                        )}

                        {msg.attachment?.type === 'image' && (
                          <img
                            src={msg.attachment.url}
                            alt={msg.attachment.name || 'attachment'}
                            className="rounded-lg mb-1 max-w-full max-h-64 object-cover cursor-pointer"
                            onClick={() => window.open(msg.attachment!.url, '_blank')}
                          />
                        )}
                        {msg.attachment?.type === 'file' && (
                          <a
                            href={msg.attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-2 mb-1 px-2 py-1.5 rounded-lg ${isMine ? 'bg-indigo-700/40' : 'bg-gray-100 dark:bg-slate-800'}`}
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate text-xs">{msg.attachment.name}</span>
                          </a>
                        )}

                        {msg.content && <span className="whitespace-pre-wrap break-words">{msg.content}</span>}

                        <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-indigo-200' : 'text-gray-400 dark:text-slate-500'}`}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    )}

                    {Object.keys(reactionGroups).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {Object.entries(reactionGroups).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg, emoji)}
                            className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
                              myReaction === emoji
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-600'
                                : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-gray-500 dark:text-slate-400">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply preview */}
          {replyingTo && (
            <div className="px-4 pt-2 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shrink-0">
              <div className="flex items-start justify-between gap-2 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2 border-l-2 border-indigo-500">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-indigo-500 dark:text-indigo-400">Replying to {replyingTo.sender.name}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                    {replyingTo.content || (replyingTo.attachment ? '📷 Photo' : '')}
                  </div>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Pending attachment preview */}
          {(pendingAttachment || uploading) && (
            <div className="px-4 pt-2 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shrink-0">
              <div className="relative inline-block">
                {uploading ? (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <>
                    <img src={pendingAttachment!.url} className="w-16 h-16 rounded-lg object-cover" alt="attachment preview" />
                    <button
                      onClick={() => setPendingAttachment(null)}
                      className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
            <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                title="Upload an image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onPaste={handlePaste}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 bg-transparent dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none max-h-28"
              />
              <button
                type="submit"
                disabled={(!newMessage.trim() && !pendingAttachment) || uploading}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Context menu (right-click / long-press) */}
          <AnimatePresence>
            {contextMenu && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={
                    contextMenu.placement === 'mobile'
                      ? 'fixed left-1/2 bottom-24 -translate-x-1/2 z-[70] w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden'
                      : 'fixed z-[70] w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden'
                  }
                  style={contextMenu.placement === 'desktop' ? { top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 230) } : undefined}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-around px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(contextMenu.message, emoji)}
                        className="text-xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => handleReply(contextMenu.message)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <Reply className="w-4 h-4" /> Reply
                  </button>
                  {contextMenu.message.content && (
                    <button onClick={() => handleCopy(contextMenu.message)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700">
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                  )}
                  <button onClick={() => handleTogglePin(contextMenu.message)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700">
                    {contextMenu.message.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    {contextMenu.message.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={() => requestDelete(contextMenu.message)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Delete choice dialog */}
          <AnimatePresence>
            {deleteTarget && (
              <motion.div
                className="modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteTarget(null)}
                style={{ zIndex: 80 }}
              >
                <motion.div
                  className="confirm-card max-w-xs"
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.9, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                >
                  <h3>Delete message?</h3>
                  <div className="modal-actions flex-col mt-4 gap-2">
                    {deleteTarget.sender._id === user?.id && (
                      <button type="button" className="btn btn-danger w-full" onClick={() => confirmDelete(true)}>
                        Delete for everyone
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost w-full" onClick={() => confirmDelete(false)}>
                      Delete for me
                    </button>
                    <button type="button" className="btn btn-ghost w-full" onClick={() => setDeleteTarget(null)}>
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear chat confirm */}
          <ConfirmDialog
            open={clearChatConfirmOpen}
            title="Clear this chat?"
            message="This only clears the chat from your device. Other members will still see all messages."
            confirmText="Clear chat"
            onCancel={() => setClearChatConfirmOpen(false)}
            onConfirm={handleClearChat}
          />

          {/* Media / links / docs viewer */}
          <AnimatePresence>
            {mediaViewerTab && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[65] bg-white dark:bg-slate-800 flex flex-col"
              >
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3 shrink-0">
                  <button onClick={() => setMediaViewerTab(null)} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
                    {window.innerWidth < 640 ? <ArrowLeft className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                  </button>
                  <h3 className="font-semibold text-gray-800 dark:text-slate-100">Media, links &amp; docs</h3>
                </div>

                <div className="flex border-b border-gray-200 dark:border-slate-700 shrink-0">
                  {(['media', 'links', 'docs'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMediaViewerTab(tab)}
                      className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                        mediaViewerTab === tab
                          ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                          : 'text-gray-500 dark:text-slate-400'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {mediaViewerTab === 'media' && (
                    mediaItems.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-slate-500 text-center mt-8">No media shared yet.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {mediaItems.map((m) => (
                          <img
                            key={m._id}
                            src={m.attachment!.url}
                            className="w-full h-24 object-cover rounded-lg cursor-pointer"
                            alt=""
                            onClick={() => window.open(m.attachment!.url, '_blank')}
                          />
                        ))}
                      </div>
                    )
                  )}
                  {mediaViewerTab === 'links' && (
                    linkItems.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-slate-500 text-center mt-8">No links shared yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {linkItems.map(({ message, url }, i) => (
                          <a
                            key={`${message._id}-${i}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <LinkIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-slate-200 truncate">{url}</span>
                          </a>
                        ))}
                      </div>
                    )
                  )}
                  {mediaViewerTab === 'docs' && (
                    docItems.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-slate-500 text-center mt-8">No documents shared yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {docItems.map((m) => (
                          <a
                            key={m._id}
                            href={m.attachment!.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700 dark:text-slate-200 truncate">{m.attachment!.name}</p>
                              <p className="text-xs text-gray-400 dark:text-slate-500">{formatBytes(m.attachment!.size)}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;