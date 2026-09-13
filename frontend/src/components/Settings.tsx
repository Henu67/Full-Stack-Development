import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, User as UserIcon, Save, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, bio }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Appearance */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                {theme === 'dark' ? (
                  <Moon className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
                ) : (
                  <Sun className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Currently on' : 'Currently off'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={toggleTheme}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Account */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> Account
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border border-gray-200 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Display Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="A short bio..."
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>

        {/* Session */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </section>
      </main>
    </div>
  );
};

export default Settings;