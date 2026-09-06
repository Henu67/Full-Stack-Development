import React, { useState, useEffect } from 'react';

import { Search, UserPlus, Check, X, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Friend {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

interface Request {
  _id: string;
  from: Friend;
  status: string;
}

const FriendsSidebar: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/friends`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setRequests(data.friendRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch friends', error);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/friends/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}` }
        });
        if (response.ok) {
          setSearchResults(await response.json());
        }
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const sendRequest = async (targetUserId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/friends/request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}`
        },
        body: JSON.stringify({ targetUserId })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        fetchFriends(); // Refresh to update any local state
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  const handleRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/friends/respond`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}`
        },
        body: JSON.stringify({ requestId, action })
      });
      if (response.ok) {
        toast.success(`Request ${action}`);
        fetchFriends(); // Refresh lists
      }
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 h-full flex flex-col transition-colors duration-200">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Friends</h2>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Find friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {searchQuery ? (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Results</h3>
            {isSearching ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Searching...</p>
            ) : searchResults.length > 0 ? (
              searchResults.map(result => {
                const isFriend = friends.some(f => f._id === result._id);
                const hasPendingRequest = requests.some(r => r.from._id === result._id);
                return (
                  <div key={result._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex items-center justify-center">
                        {result.avatar ? <img src={result.avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{result.name || 'Unnamed'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{result.email}</p>
                      </div>
                    </div>
                    {isFriend ? (
                      <div className="p-1.5 text-green-600 dark:text-green-400" title="Already Friends">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : hasPendingRequest ? (
                      <div className="p-1.5 text-orange-500 dark:text-orange-400" title="Incoming Request Pending">
                        <User className="w-4 h-4" />
                      </div>
                    ) : (
                      <button 
                        onClick={() => sendRequest(result._id)}
                        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                        title="Send Friend Request"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No users found.</p>
            )}
          </div>
        ) : (
          <>
            {requests.length > 0 && (
              <div className="mb-6 space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Friend Requests ({requests.length})</h3>
                {requests.map(req => (
                  <div key={req._id} className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full overflow-hidden flex items-center justify-center">
                        {req.from.avatar ? <img src={req.from.avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{req.from.name || req.from.email.split('@')[0]}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRequest(req._id, 'accepted')} className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRequest(req._id, 'rejected')} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">My Friends ({friends.length})</h3>
              {friends.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">You haven't added any friends yet.</p>
              ) : (
                friends.map(friend => (
                  <div key={friend._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex items-center justify-center relative">
                      {friend.avatar ? <img src={friend.avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-gray-800 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{friend.name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-40">{friend.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsSidebar;
