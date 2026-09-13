import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Layout, Users } from 'lucide-react';
import FriendsSidebar from '../components/FriendsSidebar';

// Full-page version of the Friends feature. Reuses FriendsSidebar (search,
// requests, friend list, remove friend) — the same logic that also powers
// the quick drawer elsewhere — just rendered as a normal page instead of a
// slide-in panel.
const Friends: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Users className="w-5 h-5 text-indigo-500" />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Friends</h1>
        <button
          onClick={() => navigate('/rooms')}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Layout className="w-4 h-4" /> Rooms
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <FriendsSidebar variant="page" initialQuery={initialQuery} />
        </div>
      </main>
    </div>
  );
};

export default Friends;
