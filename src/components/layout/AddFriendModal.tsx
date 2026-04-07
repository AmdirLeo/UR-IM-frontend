import React, { useState } from 'react';
import { Search, X, UserPlus, Loader2 } from 'lucide-react';
import { searchUsers, sendFriendRequest } from '../../api/friend';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserSearchResult {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [requestStatus, setRequestStatus] = useState<{ [key: number]: 'sending' | 'sent' | 'error' }>({});

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await searchUsers(searchTerm);
      if (response.code === 200) {
        setResults(response.data || []);
      } else {
        setError(response.msg || 'Search failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: { msg: string }[]; msg?: string } } };
      setError(error.response?.data?.detail?.[0]?.msg || error.response?.data?.msg || 'Failed to search users.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (targetUserId: number) => {
    setRequestStatus(prev => ({ ...prev, [targetUserId]: 'sending' }));

    try {
      const response = await sendFriendRequest(targetUserId, requestMessage);
      if (response.code === 200) {
        setRequestStatus(prev => ({ ...prev, [targetUserId]: 'sent' }));
        setSelectedUserId(null); // Close the message input
        setRequestMessage('');
      } else {
        setRequestStatus(prev => ({ ...prev, [targetUserId]: 'error' }));
        setError(response.msg || 'Failed to send request');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: { msg: string }[]; msg?: string } } };
      setRequestStatus(prev => ({ ...prev, [targetUserId]: 'error' }));
      setError(error.response?.data?.detail?.[0]?.msg || error.response?.data?.msg || 'Failed to send friend request.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-primary w-[450px] max-w-full rounded-xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary shrink-0">
          <h2 className="text-lg font-medium text-secondary">Add Friend</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-secondary dark:hover:text-secondary transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-5 shrink-0 bg-secondary border-b border-primary">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-secondary" />
            </div>
            <input
              type="text"
              className="w-full bg-primary border border-primary text-secondary rounded-md py-2 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="absolute inset-y-0 right-0 px-3 flex items-center bg-green-500 hover:bg-green-600 text-white rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              Search
            </button>
          </form>
          {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-secondary">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span>Searching...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((user) => (
              <div key={user.user_id} className="flex flex-col p-3 hover:bg-gray-50 dark:hover:bg-secondary rounded-lg transition-colors border-b border-primary last:border-0">
                <div className="flex items-center justify-between">

                  {/* User Info */}
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded bg-blue-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-secondary truncate">
                        {user.username}
                      </span>
                      <span className="text-xs text-secondary truncate">
                        ID: {user.user_id}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {requestStatus[user.user_id] === 'sent' ? (
                      <span className="text-xs font-medium text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded">
                        Request Sent
                      </span>
                    ) : selectedUserId === user.user_id ? (
                      <button
                        onClick={() => setSelectedUserId(null)}
                        className="text-xs text-secondary hover:text-secondary dark:hover:text-secondary px-2 py-1"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedUserId(user.user_id)}
                        className="flex items-center space-x-1 bg-gray-100 hover:bg-secondary dark:hover:bg-secondary text-secondary px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Input Dropdown */}
                {selectedUserId === user.user_id && requestStatus[user.user_id] !== 'sent' && (
                  <div className="mt-3 bg-secondary p-3 rounded border border-primary">
                    <textarea
                      className="w-full bg-primary border border-primary rounded text-sm p-2 text-secondary focus:outline-none focus:ring-1 focus:ring-green-500 resize-none h-16"
                      placeholder="Hi, I'm..."
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      maxLength={200}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleSendRequest(user.user_id)}
                        disabled={requestStatus[user.user_id] === 'sending'}
                        className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {requestStatus[user.user_id] === 'sending' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Send Request'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : searchTerm && !loading && !error ? (
             <div className="flex flex-col items-center justify-center h-full text-secondary p-6 text-center">
              <div className="bg-secondary p-4 rounded-full mb-3">
                <Search className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-sm">No users found for "{searchTerm}"</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-secondary p-6 text-center">
               <UserPlus className="w-12 h-12 mb-3 opacity-20" />
               <p className="text-sm">Search by username to find friends to add</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
