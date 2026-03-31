import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { logoutUser } from './api';
import { LogOut, User, Send, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';

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
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-900 px-4">
        <Auth onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-between mb-8">
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

        <ChatInterface token={token} currentUserId={userId} />

      </div>
    </div>
  );
}

const ChatInterface: React.FC<{ token: string | null; currentUserId: string }> = ({ token, currentUserId }) => {
  const { isConnected, messages, sendMessage } = useWebSocket(token);
  const [receiverId, setReceiverId] = useState('');
  const [content, setContent] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = parseInt(receiverId, 10);
    const parsedCurrentId = parseInt(currentUserId, 10);
    if (isNaN(parsedId) || isNaN(parsedCurrentId) || !content.trim()) return;

    sendMessage(parsedId, content, parsedCurrentId);
    setContent('');
  };

  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col h-[500px]">
      <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
          Live Chat
        </h2>
        <div className="flex items-center text-sm font-medium">
          {isConnected ? (
            <span className="flex items-center text-green-600">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Connected
            </span>
          ) : (
            <span className="flex items-center text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" /> Disconnected
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No messages yet.</p>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.type === 'chat' && msg.sender_id?.toString() === currentUserId;
            return (
            <div key={idx} className={`flex flex-col ${msg.type === 'system' ? 'items-center' : isMe ? 'items-end' : 'items-start'}`}>
              {msg.type === 'system' ? (
                <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
                  System: {msg.message}
                </span>
              ) : (
                <div className={`p-3 rounded-lg shadow-sm max-w-[80%] ${isMe ? 'bg-blue-100 border border-blue-200' : 'bg-white border border-gray-100'}`}>
                  <span className={`text-xs font-semibold mb-1 block ${isMe ? 'text-blue-800' : 'text-blue-600'}`}>
                    {isMe ? 'You' : `User ID: ${msg.sender_id || 'Unknown'}`}
                  </span>
                  <p className="text-sm text-gray-800">{msg.content}</p>
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t flex space-x-2 bg-white rounded-b-lg">
        <input
          type="number"
          placeholder="Receiver ID"
          required
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        <input
          type="text"
          placeholder="Type a message..."
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        <button
          type="submit"
          disabled={!isConnected}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4 mr-2" />
          Send
        </button>
      </form>
    </div>
  );
};

export default App;
