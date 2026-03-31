import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { logoutUser } from './api';
import { LogOut, User } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // In a real app we'd decode the token or fetch user profile
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = (id: string, name?: string) => {
    setUserId(id);
    if (name) setUsername(name);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUserId('');
      setUsername('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-900 px-4">
        <Auth onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back!</h1>
              <p className="text-gray-500">
                Logged in as User ID: <span className="font-medium text-gray-800">{userId || 'Unknown'}</span>
                {username && <span> ({username})</span>}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Your Profile</h3>
            <p className="text-gray-600 text-sm">More information will be added here later.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-2">Recent Activity</h3>
            <p className="text-gray-600 text-sm">No recent activity to show.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
