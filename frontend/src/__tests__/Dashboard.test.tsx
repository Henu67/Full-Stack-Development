import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { AuthContext } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

describe('Dashboard Component', () => {
  it('renders dashboard with mocked user', () => {
    const mockAuthContext = {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    };

    render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthContext.Provider value={mockAuthContext}>
            <Dashboard />
          </AuthContext.Provider>
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome back!/i)).toBeInTheDocument();
    expect(screen.getByText(/My Rooms/i)).toBeInTheDocument();
  });
});
