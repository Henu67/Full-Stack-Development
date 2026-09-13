import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Users, Loader2 } from 'lucide-react';

const JoinRoom: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !code) return;

    const joinRoom = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('syncboard_token')}`
          },
          body: JSON.stringify({ inviteCode: code })
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Joined room!');
          setStatus('success');
          navigate(`/room/${data.room._id}`);
        } else if (response.status === 401 || response.status === 400) {
          if (data.message === 'Invalid token.') {
             logout();
             toast.error('Session expired. Please log in again to join.');
          } else {
             setStatus('error');
             setMessage(data.message || 'Failed to join room');
          }
        } else if (data.roomId) {
          // Already a member
          toast.success('You are already in this room');
          navigate(`/room/${data.roomId}`);
        } else {
          setStatus('error');
          setMessage(data.message || 'Failed to join room');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error — could not join room');
      }
    };

    joinRoom();
  }, [isAuthenticated, code, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Joining Room...</h2>
            <p className="text-gray-500 text-sm">Please wait while we add you to the room.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Could not join</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinRoom;
