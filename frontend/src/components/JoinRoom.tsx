import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Link2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// Landing page for shared invite links (/join/:code). Auto-joins the room
// using the code in the URL, then drops the user straight into it — this
// previously just re-rendered the whole dashboard and never used the code
// at all, so invite links didn't actually work.
const JoinRoom: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [status, setStatus] = useState<'joining' | 'error'>('joining');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!code || !token) return;

    const join = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ inviteCode: code }),
        });
        const data = await response.json();

        if (response.ok) {
          toast.success(data.message || 'Joined room!');
          navigate(`/room/${data.room?._id}`, { replace: true });
        } else if (data.roomId) {
          // Already a member of this room — just take them straight in.
          navigate(`/room/${data.roomId}`, { replace: true });
        } else {
          setStatus('error');
          setErrorMessage(data.message || 'This invite link is invalid or has expired.');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Failed to join room — network error.');
      }
    };

    join();
  }, [code, token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-sm w-full text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm">
        {status === 'joining' ? (
          <>
            <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Joining room…</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Hang tight, we're getting you in.</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Couldn't join room</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{errorMessage}</p>
            <button
              onClick={() => navigate('/rooms')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Link2 className="w-4 h-4" /> Go to Rooms
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinRoom;
