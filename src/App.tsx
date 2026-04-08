import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { MainLayout } from './components/layout/MainLayout';
import { logoutUser } from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }

    // Apply dark mode on load if saved
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleLoginSuccess = (id: string, name?: string) => {
    setUserId(id);
    if (name) setUsername(name);

    const newToken = localStorage.getItem('token');
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      // Import logoutUser from api at top if not done already
      await logoutUser();
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUserId('');
      setUsername('');
      setToken(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary text-primary px-4">
        <Auth onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // The MainLayout now wraps the sidebar, chat list, and chat panel
  return (
    <MainLayout
      currentUserId={userId}
      username={username}
      token={token}
      onLogout={handleLogout}
    />
  );
}

export default App;
