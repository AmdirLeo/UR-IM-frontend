import React, { useState } from 'react';
import { X, Check, XCircle, Loader2 } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { handleFriendRequest } from '../../api/friend';
import { formatAvatarUrl } from '../../utils/url';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { friendRequests, removeFriendRequest } = useChatContext();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleAction = async (msgId: number, requestId: number, action: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    setError('');
    try {
      const response = await handleFriendRequest(requestId, action);
      if (response.code === 200) {
        removeFriendRequest(msgId);
        onSuccess();
        if (friendRequests.length <= 1) {
          // Close modal if this was the last request
          onClose();
        }
      } else {
        setError(response.msg || `Failed to ${action} request`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError((err as { response?: { data?: { msg?: string } } }).response?.data?.msg || err.message || `Failed to ${action} request`);
      } else {
        setError(`Failed to ${action} request`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-primary w-[450px] max-w-full rounded-xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary shrink-0">
          <h2 className="text-lg font-medium text-secondary">Friend Requests</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-secondary transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-5 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 text-sm border-b border-primary">
            {error}
          </div>
        )}

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {friendRequests.length > 0 ? (
            friendRequests.map((req) => {
              // Parse the JSON content safely
              let parsedContent: Record<string, unknown> = {};
              try {
                parsedContent = JSON.parse(req.data.content);
              } catch (e) {
                console.error("Failed to parse friend request content", e);
              }

              const msgId = req.data.msg_id;
              // Parse the JSON object values directly
              const requestId = (parsedContent.request_id ?? parsedContent.apply_id ?? parsedContent.id ?? req.data.msg_id) as number;
              const senderId = parsedContent.sender_id ?? req.data.sender_id;
              const username = (parsedContent.username as string) || `User ID: ${senderId}`;
              const message = (parsedContent.reason as string) || (parsedContent.message as string) || 'No message';
              const avatarUrl = formatAvatarUrl(parsedContent.avatar as string | null);

              return (
                <div key={msgId} className="flex flex-col p-3 hover:bg-gray-50 dark:hover:bg-secondary rounded-lg transition-colors border-b border-primary last:border-0">
                  <div className="flex items-center justify-between">
                    {/* User Info */}
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-blue-500 flex items-center justify-center shrink-0">
                          <span className="text-white font-medium">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-secondary truncate">
                          {username}
                        </span>
                        <span className="text-xs text-secondary truncate mt-0.5">
                          {message}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 shrink-0">
                      <button
                        onClick={() => {
                          if (requestId === undefined || requestId === null) {
                             setError('Cannot find request ID to accept.');
                             return;
                          }
                          handleAction(msgId, requestId, 'accepted');
                        }}
                        disabled={processingId === requestId}
                        className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {processingId === requestId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => {
                          if (requestId === undefined || requestId === null) {
                             setError('Cannot find request ID to reject.');
                             return;
                          }
                          handleAction(msgId, requestId, 'rejected');
                        }}
                        disabled={processingId === requestId}
                        className="flex items-center space-x-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {processingId === requestId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-secondary p-6 text-center">
              <p className="text-sm">No pending friend requests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
