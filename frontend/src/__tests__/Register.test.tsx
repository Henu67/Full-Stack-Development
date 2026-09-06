import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../components/Register';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

describe('Register Component', () => {
  it('renders sign up heading', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Register />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('contains name, email, and password inputs', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Register />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });
});
