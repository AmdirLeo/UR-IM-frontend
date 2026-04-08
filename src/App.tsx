import { useEffect, useContext } from 'react';
import { Auth } from './components/Auth';
import { MainLayout } from './components/layout/MainLayout';
import { UserContext } from './context/UserContext';

function AppContent() {
  const userContext = useContext(UserContext);
  if (!userContext) {
    throw new Error('AppContent must be used within a UserProvider');
  }

  const { isAuthenticated, userInfo, token, handleLoginSuccess, logout } = userContext;

  useEffect(() => {
    // Apply dark mode on load if saved
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const onLoginSuccess = async () => {
    const newToken = localStorage.getItem('token');
    if (newToken) {
      await handleLoginSuccess(newToken);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary text-primary px-4">
        <Auth onLoginSuccess={onLoginSuccess} />
      </div>
    );
  }

  // The MainLayout now wraps the sidebar, chat list, and chat panel
  return (
    <MainLayout
      currentUserId={userInfo?.id?.toString() || ''}
      username={userInfo?.username || ''}
      token={token}
      onLogout={logout}
    />
  );
}

export default AppContent;
