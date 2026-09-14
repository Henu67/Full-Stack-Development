import React, { useEffect, useState } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Friend {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface RoomInvitePanelProps {
  roomId: string;
  token: string;
  existingMemberIds: string[];
  onClose: () => void;
}

const RoomInvitePanel: React.FC<RoomInvitePanelProps> = ({ roomId, token, existingMemberIds, onClose }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setFriends(data.friends || []);
      } catch (err) {
        console.error('Failed to load friends', err);
        toast.error('Could not load friends list');
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [token]);

  const handleInvite = async (friend: Friend) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: friend._id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to invite');
      }

      setInvitedIds((prev) => [...prev, friend._id]);
      toast.success(`Invited ${friend.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not invite this friend';
      toast.error(message);
    }
  };

  const filteredFriends = friends
    .filter((f) => !existingMemberIds.includes(f._id))
    .filter(
      (f) =>
        f.name?.toLowerCase().includes(query.toLowerCase()) ||
        f.email?.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <div className="room-invite-panel" onClick={(e) => e.stopPropagation()}>
      <div className="room-invite-panel-header">
        <span>Invite friends</span>
        <button onClick={onClose} className="room-invite-panel-close" aria-label="Close">
          ×
        </button>
      </div>

      <div className="room-invite-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search friends..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="room-invite-list">
        {loading && <div className="room-invite-empty">Loading friends...</div>}

        {!loading && filteredFriends.length === 0 && friends.length === 0 && (
          <div className="room-invite-empty">
            You haven't added any friends yet. Add friends first to invite them to rooms.
          </div>
        )}

        {!loading && filteredFriends.length === 0 && friends.length > 0 && (
          <div className="room-invite-empty">No matching friends, or everyone's already in this room.</div>
        )}

        {!loading &&
          filteredFriends.map((friend) => {
            const alreadyInvited = invitedIds.includes(friend._id);
            return (
              <div key={friend._id} className="room-invite-row">
                <div className="room-invite-friend-info">
                  {friend.avatar ? (
                    <img src={friend.avatar} alt="" className="room-invite-avatar" />
                  ) : (
                    <div className="room-invite-avatar-fallback">
                      {friend.name ? friend.name.substring(0, 2).toUpperCase() : '?'}
                    </div>
                  )}
                  <div>
                    <div className="room-invite-friend-name">{friend.name}</div>
                    <div className="room-invite-friend-email">{friend.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleInvite(friend)}
                  disabled={alreadyInvited}
                  className="room-invite-add-btn"
                  title={alreadyInvited ? 'Invited' : 'Invite to room'}
                >
                  {alreadyInvited ? <Check size={16} /> : <Plus size={16} />}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default RoomInvitePanel;
