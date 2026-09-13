import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Board from './components/Board';
import Login from './components/Login';
import Register from './components/Register';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import Friends from './pages/Friends';
import Profile from './components/Profile';
import JoinRoom from './components/JoinRoom';
import './styles.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Toaster position="bottom-center" toastOptions={{ className: 'app-toast', duration: 2400 }} />
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<PrivateRoute />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/friends" element={<Friends />} />
                  <Route path="/room/:id" element={<Board />} />
                  <Route path="/profile" element={<Profile />} />
                  {/* Settings now lives inside the Profile page */}
                  <Route path="/settings" element={<Navigate to="/profile" replace />} />
                  {/* Legacy path some earlier builds linked to */}
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/join/:code" element={<JoinRoom />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
