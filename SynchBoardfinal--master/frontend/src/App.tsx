import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Board from './components/Board';
import Login from './components/Login';
import Register from './components/Register';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import JoinRoom from './components/JoinRoom';
import './styles.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="bottom-center" toastOptions={{ className: 'app-toast', duration: 2400 }} />
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<PrivateRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/room/:id" element={<Board />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/join/:code" element={<JoinRoom />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
