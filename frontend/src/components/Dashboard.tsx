import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FriendsSidebar from './FriendsSidebar';
import ConfirmDialog from './ConfirmDialog';
import { Users, Plus, UserCircle, Layout, LogOut, User, Copy, Link2, UserPlus, Menu, X, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Room {
  _id: string;
  name: string;
  description: string;
  inviteCode: string;
  owner: string;
  members: { user: { _id: string, name: string, avatar: string } }[];
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  // Room edit/delete
  const [openMenuRoomId, setOpenMenuRoomId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomDesc, setEditRoomDesc] = useState('');
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuRoomId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [roomsVersion, setRoomsVersion] = useState(0);
  const refreshRooms = () => setRoomsVersion(v => v + 1);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}` }
        });
        if (response.ok) {
          setRooms(await response.json());
        } else if (response.status === 401 || response.status === 400) {
          const data = await response.json();
          if (data.message === 'Invalid token.') {
             logout();
             toast.error('Session expired. Please log in again.');
          }
        }
      } catch (error) {
        console.error('Failed to fetch rooms', error);
      }
    };
    fetchRooms();
  }, [roomsVersion, logout]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}`
        },
        body: JSON.stringify({ name: newRoomName, description: newRoomDesc })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Room created!');
        setIsCreatingRoom(false);
        setNewRoomName('');
        setNewRoomDesc('');
        refreshRooms();
      } else {
        toast.error(data.message || 'Failed to create room');
      }
    } catch {
      toast.error('Failed to create room — network error');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);

    // Smart extract code from a full URL if pasted
    let extractedCode = joinCode.trim();
    if (extractedCode.includes('/join/')) {
      const parts = extractedCode.split('/join/');
      extractedCode = parts[parts.length - 1];
    } else if (extractedCode.includes('http')) {
      const parts = extractedCode.split('/');
      extractedCode = parts[parts.length - 1];
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}`
        },
        body: JSON.stringify({ inviteCode: extractedCode })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Joined room!');
        setJoinCode('');
        refreshRooms();
        if (data.room?._id) navigate(`/room/${data.room._id}`);
      } else {
        toast.error(data.message || 'Failed to join');
      }
    } catch {
      toast.error('Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const copyInviteLink = (room: Room) => {
    const link = `${window.location.origin}/join/${room.inviteCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied!');
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setEditRoomName(room.name);
    setEditRoomDesc(room.description || '');
    setOpenMenuRoomId(null);
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editRoomName.trim()) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${editingRoom._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}`
        },
        body: JSON.stringify({ name: editRoomName, description: editRoomDesc })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Room updated!');
        setEditingRoom(null);
        refreshRooms();
      } else {
        toast.error(data.message || 'Failed to update room');
      }
    } catch {
      toast.error('Failed to update room — network error');
    }
  };

  const handleDeleteRoom = async () => {
    if (!deletingRoom) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${deletingRoom._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}` }
      });
      if (response.ok) {
        toast.success('Room deleted');
        setDeletingRoom(null);
        refreshRooms();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete room');
      }
    } catch {
      toast.error('Failed to delete room — network error');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-inter transition-colors duration-200 overflow-hidden">
      {/* Mobile top bar (< tablet) */}
      <div className="sm:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-3 bg-gray-900 dark:bg-gray-950 text-white shrink-0">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-800"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Layout className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm tracking-tight">SynchBoard</span>
        </div>
        <button
          onClick={() => setFriendsOpen(true)}
          className="p-2 -mr-2 rounded-lg hover:bg-gray-800"
          aria-label="Open friends"
        >
          <Users className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile nav drawer + backdrop (< tablet) */}
      {mobileNavOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="h-full w-64 max-w-[80vw] bg-gray-900 dark:bg-gray-950 text-white flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="p-4 flex items-center justify-between gap-3 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <Layout className="w-7 h-7 text-indigo-400" />
                  <h1 className="text-lg font-bold tracking-tight">SynchBoard</h1>
                </div>
                <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-800" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-6 px-3 space-y-2">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-indigo-600 rounded-lg text-white font-medium transition-colors">
                  <Layout className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => { setMobileNavOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors font-medium"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <UserCircle className="w-5 h-5" />
                  )}
                  <span>Profile</span>
                </button>
              </nav>
            </div>
            <div className="p-4 border-t border-gray-800">
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 rounded-lg transition-colors font-medium">
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar (tablet & desktop) */}
      <div className="hidden sm:flex w-20 md:w-64 bg-gray-900 dark:bg-gray-950 text-white flex-col justify-between shrink-0 transition-colors duration-200">
        <div>
          <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 border-b border-gray-800">
            <Layout className="w-8 h-8 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight hidden md:block">SynchBoard</h1>
          </div>
          
          <nav className="mt-8 px-2 md:px-4 space-y-2">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-indigo-600 rounded-lg text-white font-medium transition-colors">
              <Layout className="w-5 h-5" />
              <span className="hidden md:block">Dashboard</span>
            </button>
            <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors font-medium">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
              ) : (
                <UserCircle className="w-5 h-5" />
              )}
              <span className="hidden md:block">Profile</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button onClick={logout} className="w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 rounded-lg transition-colors font-medium">
            <LogOut className="w-5 h-5" />
            <span className="hidden md:block">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden pt-14 sm:pt-0">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back!</h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Manage your personal tasks or collaborate in rooms.</p>
              </div>
              <button 
                onClick={() => navigate('/room/personal')}
                className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Personal Board
              </button>
            </header>

            {/* Join Room by Code */}
            <div className="mb-6 sm:mb-8 flex gap-3">
              <form onSubmit={handleJoinRoom} className="flex flex-col xs:flex-row gap-3 flex-1 sm:max-w-md">
                <div className="relative flex-1 min-w-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link2 className="w-4 h-4 text-gray-400" />
                  </div>
                  <input 
                    type="text"
                    placeholder="Enter invite code..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isJoining || !joinCode.trim()}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </form>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500 shrink-0" />
                My Rooms
              </h2>
              <button 
                onClick={() => setIsCreatingRoom(true)}
                className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {isCreatingRoom && (
              <div className="mb-8 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Create a New Room</h3>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div>
                    <input 
                      type="text" 
                      placeholder="Room Name" 
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Description (Optional)" 
                      value={newRoomDesc}
                      onChange={(e) => setNewRoomDesc(e.target.value)}
                      className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col-reverse xs:flex-row gap-3 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingRoom(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {rooms.map(room => (
                <div 
                  key={room._id} 
                  className="relative bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 cursor-pointer transition-all group min-w-0"
                >
                  {room.owner === user?.id && (
                    <div className="absolute top-3 right-3 z-10" ref={openMenuRoomId === room._id ? menuRef : undefined}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuRoomId(openMenuRoomId === room._id ? null : room._id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Room options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuRoomId === room._id && (
                        <div
                          className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openEditRoom(room)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit Room
                          </button>
                          <button
                            onClick={() => { setDeletingRoom(room); setOpenMenuRoomId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Room
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div onClick={() => navigate(`/room/${room._id}`)}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2 truncate pr-8">{room.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{room.description || 'No description provided.'}</p>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-2 shrink-0">
                        {room.members.slice(0, 3).map((member, idx) => (
                          <div key={idx} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden">
                            {member.user?.avatar ? <img src={member.user.avatar} alt="" className="w-full h-full object-cover"/> : <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{member.user?.name ? member.user.name[0] : 'U'}</span>}
                          </div>
                        ))}
                      </div>
                      {room.members.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">+{room.members.length - 3} more</span>
                      )}
                    </div>
                    
                    {/* Copy Invite Link */}
                    <button
                      onClick={(e) => { e.stopPropagation(); copyInviteLink(room); }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors shrink-0"
                      title="Copy invite link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {rooms.length === 0 && !isCreatingRoom && (
                <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center px-4">
                  <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-gray-900 dark:text-gray-200 font-medium mb-1">No rooms yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Create a room to start collaborating with friends.</p>
                  <button 
                    onClick={() => setIsCreatingRoom(true)}
                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-indigo-600 dark:text-indigo-400 font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Create your first Room
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        <FriendsSidebar isOpen={friendsOpen} onClose={() => setFriendsOpen(false)} />
      </div>

      {editingRoom && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setEditingRoom(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Edit Room</h3>
            <form onSubmit={handleUpdateRoom} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Room Name"
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={editRoomDesc}
                  onChange={(e) => setEditRoomDesc(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col-reverse xs:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingRoom}
        title="Delete this room?"
        message={<>"<strong>{deletingRoom?.name}</strong>" and all of its tasks and messages will be permanently deleted for every member.</>}
        onCancel={() => setDeletingRoom(null)}
        onConfirm={handleDeleteRoom}
      />
    </div>
  );
};

export default Dashboard;