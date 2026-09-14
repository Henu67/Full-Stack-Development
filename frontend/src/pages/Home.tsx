import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Board from '../components/Board';
import { Layout, UserCircle, Bell, Search, LogOut, UserPlus } from 'lucide-react';

interface Notification {
  _id: string;
  message: string;
  read?: boolean;
  room?: { _id: string };
}

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingRequests, setPendingRequests] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const fetchFriendRequestCount = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/friends`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPendingRequests((data.friendRequests || []).length);
        }
      } catch (error) {
        console.error('Failed to fetch friend requests', error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/notifications`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    fetchFriendRequestCount();
    fetchNotifications();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/friends${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-inter transition-colors duration-200">
      <header className="bg-gray-900 dark:bg-gray-950 text-white px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Layout className="w-6 h-6 text-indigo-400" />
          <span className="font-bold tracking-tight hidden sm:inline">SynchBoard</span>
        </div>

        {/* Friend search bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find friends..."
              className="w-full pl-9 pr-3 py-2 bg-gray-800 dark:bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </form>

        <nav className="flex items-center gap-1 sm:gap-2 ml-auto">
          <button
            onClick={() => navigate('/rooms')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Layout className="w-4 h-4" />
            <span className="hidden md:inline">Rooms</span>
          </button>
          <button
            onClick={() => navigate('/friends')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden md:inline">Friends</span>
          </button>

          {/* Notifications — room invites + pending friend requests */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {(pendingRequests > 0 || notifications.some((n) => !n.read)) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</span>
                  <button
                    onClick={() => navigate('/friends')}
                    className="text-xs text-indigo-500 hover:underline"
                  >
                    Friend requests {pendingRequests > 0 ? `(${pendingRequests})` : ''}
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => {
                        if (n.room?._id) navigate(`/room/${n.room._id}`);
                        setNotifOpen(false);
                      }}
                      className={`px-4 py-3 text-sm border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${!n.read ? 'font-medium' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      {n.message}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="p-1 rounded-full hover:ring-2 hover:ring-indigo-400 transition-all"
            title="Profile"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <UserCircle className="w-8 h-8 text-gray-300" />
            )}
          </button>

          <button
            onClick={logout}
            className="hidden sm:flex p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </nav>
      </header>

      {/* Personal board */}
      <Board/>
    </div>
  );
};

export default Home;
