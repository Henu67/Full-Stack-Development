import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pin as PinIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Server returned an invalid response. Ensure Environment Variables (MONGODB_URI) are set in Vercel.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      login(data.user, data.token);
      toast.success('Logged in successfully!');
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-brand">
          <span className="brand-pin">
            <PinIcon size={20} strokeWidth={2.4} />
          </span>
          <h1>SynchBoard</h1>
        </div>
        
        <h2 className="auth-title">Welcome Back</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="auth-form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="auth-footer">
          Don't have an account?
          <Link to="/register" state={{ from: location.state?.from }} className="auth-link">
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
