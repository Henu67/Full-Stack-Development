import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Send, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  _id: string;
  sender: { _id: string; name: string; avatar?: string };
  content: string;
  createdAt: string;
}

interface ChatPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ roomId, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { socket, isConnected } = useSocket();
  const { user, token } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, roomId]);

  useEffect(() => {
    if (socket && isConnected) {
      const handleReceive = (msg: Message) => {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      };
      socket.on('receive-message', handleReceive);
      return () => {
        socket.off('receive-message', handleReceive);
      };
    }
  }, [socket, isConnected]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${roomId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(await res.json());
        scrollToBottom();
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });
      
      if (res.ok) {
        setNewMessage('');
      }
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-screen w-80 bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 flex flex-col z-50"
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
            <h2 className="font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Room Chat
            </h2>
            <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-slate-800/50">
            {messages.map((msg) => {
              const isMine = msg.sender._id === user?.id;
              return (
                <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isMine && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-slate-600">
                      {msg.sender.avatar ? (
                        <img src={msg.sender.avatar} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{msg.sender.name[0]}</span>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 mb-1 ml-1">{msg.sender.name}</span>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-slate-100 rounded-bl-none shadow-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 bg-transparent dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;
