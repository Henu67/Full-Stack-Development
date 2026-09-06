import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FriendsSidebar from './FriendsSidebar';
import { Users, Plus, Settings as SettingsIcon, Layout, LogOut, User, Copy, Link2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Room {
  _id: string;
  name: string;
  description: string;
  inviteCode: string;
  members: { user: { _id: string, name: string, avatar: string } }[];
}

const Dashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

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

  useEffect(() => {
    fetchRooms();
  }, []);

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
        fetchRooms();
      } else {
        toast.error(data.message || 'Failed to create room');
      }
    } catch (error) {
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
        fetchRooms();
        if (data.room?._id) navigate(`/room/${data.room._id}`);
      } else {
        toast.error(data.message || 'Failed to join');
      }
    } catch (error) {
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

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-inter transition-colors duration-200">
      {/* Sidebar */}
      <div className="w-20 lg:w-64 bg-gray-900 dark:bg-gray-950 text-white flex flex-col justify-between shrink-0 transition-colors duration-200">
        <div>
          <div className="p-4 lg:p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-gray-800">
            <Layout className="w-8 h-8 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight hidden lg:block">SynchBoard</h1>
          </div>
          
          <nav className="mt-8 px-2 lg:px-4 space-y-2">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-indigo-600 rounded-lg text-white font-medium transition-colors">
              <Layout className="w-5 h-5" />
              <span className="hidden lg:block">Dashboard</span>
            </button>
            <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors font-medium">
              <SettingsIcon className="w-5 h-5" />
              <span className="hidden lg:block">Settings</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button onClick={logout} className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 rounded-lg transition-colors font-medium">
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:block">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            <header className="mb-10 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back!</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your personal tasks or collaborate in rooms.</p>
              </div>
              <button 
                onClick={() => navigate('/room/personal')}
                className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Personal Board
              </button>
            </header>

            {/* Join Room by Code */}
            <div className="mb-8 flex gap-3">
              <form onSubmit={handleJoinRoom} className="flex gap-3 flex-1 max-w-md">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link2 className="w-4 h-4 text-gray-400" />
                  </div>
                  <input 
                    type="text"
                    placeholder="Enter invite code to join a room..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isJoining || !joinCode.trim()}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </form>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                My Rooms
              </h2>
              <button 
                onClick={() => setIsCreatingRoom(true)}
                className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {isCreatingRoom && (
              <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
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
                  <div className="flex gap-3 justify-end">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map(room => (
                <div 
                  key={room._id} 
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 cursor-pointer transition-all group"
                >
                  <div onClick={() => navigate(`/room/${room._id}`)}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">{room.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{room.description || 'No description provided.'}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {room.members.slice(0, 3).map((member, idx) => (
                          <div key={idx} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden">
                            {member.user?.avatar ? <img src={member.user.avatar} alt="" className="w-full h-full object-cover"/> : <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{member.user?.name ? member.user.name[0] : 'U'}</span>}
                          </div>
                        ))}
                      </div>
                      {room.members.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">+{room.members.length - 3} more</span>
                      )}
                    </div>
                    
                    {/* Copy Invite Link */}
                    <button
                      onClick={(e) => { e.stopPropagation(); copyInviteLink(room); }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="Copy invite link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {rooms.length === 0 && !isCreatingRoom && (
                <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
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

        <FriendsSidebar />
      </div>
    </div>
  );
};

export default Dashboard;
