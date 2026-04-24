import { useEffect, useContext } from 'react';
import { Auth } from './components/Auth';
import { MainLayout } from './components/layout/MainLayout';
import { UserContext } from './context/UserContext';
import { ChatProvider } from './context/ChatContext';
import loginLightImg from './assets/images/login-light.png';
import loginDarkImg from './assets/images/login-dark.png';

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

    // Disable default context menu globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const onLoginSuccess = async () => {
    const newToken = localStorage.getItem('token');
    if (newToken) {
      await handleLoginSuccess(newToken);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen text-primary px-4 relative">
        <img src={loginLightImg} alt="Background" className="fixed inset-0 w-full h-full object-cover -z-10 block dark:hidden" />
        <img src={loginDarkImg} alt="Background" className="fixed inset-0 w-full h-full object-cover -z-10 hidden dark:block" />
        <Auth onLoginSuccess={onLoginSuccess} />
      </div>
    );
  }

  // The MainLayout now wraps the sidebar, chat list, and chat panel
  return (
    <ChatProvider token={token} currentUserId={userInfo?.id ? parseInt(userInfo.id.toString(), 10) : 0}>
      <MainLayout
        currentUserId={userInfo?.id?.toString() || ''}
        username={userInfo?.username || ''}
        token={token}
        onLogout={logout}
      />
    </ChatProvider>
  );
}

export default AppContent;
