import React, { useState, useEffect } from 'react';
import { X, Check, XCircle, Loader2 } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { handleFriendRequest } from '../../api/friend';
import { formatAvatarUrl } from '../../utils/url';
import { getUserInfo } from '../../api/friend.ts';
import { reviewGroupInvite } from '../../api/group';

// ==========================================
// 1. Friend Request Item
// ==========================================
const FriendRequestItem = ({
  req,
  processingId,
  handleAction,
  setError
}: {
  req: any;
  processingId: number | null;
  handleAction: (msgId: number, requestId: number, action: 'accepted' | 'rejected') => void;
  setError: (err: string) => void;
}) => {
  let extra: Record<string, any> = req.data.extra || {};
  if (Object.keys(extra).length === 0 && req.data.content) {
    try {
      const parsedContent = typeof req.data.content === 'string'
        ? JSON.parse(req.data.content)
        : (req.data.content || {});
      if (parsedContent.extra) {
        extra = parsedContent.extra;
      }
    } catch (e) {}
  }

  const msgId = req.data.msg_id;
  const requestId = Number(extra.request_id ?? req.data.msg_id);
  const senderId = Number(req.data._applicant_id ?? extra.sender_id ?? req.data.sender_id);
  const rawMessage = (extra.reason as string) || '';
  const message = rawMessage.trim() ? rawMessage : '没有附加信息';

  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!senderId) {
        setLoading(false);
        return;
      }
      try {
        const res = await getUserInfo(senderId);
        if (res.code === 200) {
          setUserInfo(res);
        }
      } catch (err) {
        console.error("获取好友信息失败", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [senderId]);

  const username = userInfo?.username || (extra.username as string) || `用户 ID: ${senderId}`;
  const rawAvatarUrl = userInfo?.avatar_url || (extra.avatar as string | null) || null;
  const avatarUrl = formatAvatarUrl(rawAvatarUrl);

  return (
    <div className="flex flex-col p-3 hover:bg-gray-50 dark:hover:bg-secondary rounded-lg transition-colors border-b border-primary last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className={`w-10 h-10 rounded object-cover shrink-0 ${loading ? 'animate-pulse bg-gray-200' : ''}`} />
          ) : (
            <div className={`w-10 h-10 rounded bg-blue-500 flex items-center justify-center shrink-0 ${loading ? 'animate-pulse opacity-50' : ''}`}>
              <span className="text-white font-medium">
                {loading ? '...' : username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-secondary truncate">
              {loading ? <span className="text-gray-400">正在加载信息...</span> : username}
            </span>
            <span className="text-xs text-secondary truncate mt-0.5">
              {message}
            </span>
          </div>
        </div>

        <div className="flex space-x-2 shrink-0">
          <button
            onClick={() => handleAction(msgId, requestId, 'accepted')}
            disabled={processingId === requestId}
            className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            {processingId === requestId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Accept</span>
          </button>
          <button
            onClick={() => handleAction(msgId, requestId, 'rejected')}
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
};


// ==========================================
// 2. Group Request Item
// ==========================================
const GroupRequestItem = ({
  req,
  processingId,
  handleAction,
}: {
  req: any;
  processingId: number | null;
  handleAction: (applyId: number, action: 'APPROVED' | 'IGNORED') => void;
}) => {
  let extra: Record<string, any> = req.data.extra || {};
  if (Object.keys(extra).length === 0 && req.data.content) {
    try {
      const parsedContent = typeof req.data.content === 'string'
        ? JSON.parse(req.data.content)
        : (req.data.content || {});
      if (parsedContent.extra) {
        extra = parsedContent.extra;
      }
    } catch (e) {}
  }

  const applyId = Number(extra.apply_id);
  const applicantName = extra.applicant_name || `用户 ${extra.applicant_id}`;
  const inviterName = extra.inviter_name || `用户 ${extra.inviter_id}`;
  const groupName = extra.conversation_name || `群组 ${extra.conversation_id}`;
  const applicantAvatar = formatAvatarUrl(extra.applicant_avatar);

  return (
    <div className="flex flex-col p-3 hover:bg-gray-50 dark:hover:bg-secondary rounded-lg transition-colors border-b border-primary last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          {applicantAvatar ? (
            <img src={applicantAvatar} alt="avatar" className="w-10 h-10 rounded object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded bg-blue-500 flex items-center justify-center shrink-0">
              <span className="text-white font-medium">{applicantName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-secondary truncate">
              {applicantName}
            </span>
            <span className="text-xs text-secondary truncate mt-0.5" title={`${inviterName} 邀请加入 ${groupName}`}>
              <span className="font-semibold text-primary">{inviterName}</span> 邀请加入 <span className="font-semibold text-primary">{groupName}</span>
            </span>
          </div>
        </div>

        <div className="flex space-x-2 shrink-0">
          <button
            onClick={() => handleAction(applyId, 'APPROVED')}
            disabled={processingId === applyId}
            className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            {processingId === applyId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Accept</span>
          </button>
          <button
            onClick={() => handleAction(applyId, 'IGNORED')}
            disabled={processingId === applyId}
            className="flex items-center space-x-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            {processingId === applyId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            <span>Ignore</span>
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 3. RequestsModal
// ==========================================
interface RequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestsModal: React.FC<RequestsModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { friendRequests, removeFriendRequest, groupRequests, removeGroupRequest } = useChatContext();
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  // Auto-switch tabs if one is empty
  useEffect(() => {
    if (isOpen) {
        if (friendRequests.length === 0 && groupRequests.length > 0) {
            setActiveTab('groups');
        } else if (friendRequests.length > 0 && groupRequests.length === 0) {
            setActiveTab('friends');
        }
    }
  }, [isOpen, friendRequests.length, groupRequests.length]);

  if (!isOpen) return null;

  const handleFriendAction = async (msgId: number, requestId: number, action: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    setError('');
    try {
      const response = await handleFriendRequest(requestId, action);
      if (response.code === 200) {
        removeFriendRequest(msgId);
        onSuccess();
        if (friendRequests.length <= 1 && groupRequests.length === 0) {
          onClose();
        }
      } else {
        setError(response.msg || `Failed to ${action} request`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.msg || err.message || `Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleGroupAction = async (applyId: number, action: 'APPROVED' | 'IGNORED') => {
    setProcessingId(applyId);
    setError('');
    try {
      const response = await reviewGroupInvite({ apply_id: applyId, status: action });
      if (response.code === 200) {
        removeGroupRequest(applyId);
        onSuccess();
        if (groupRequests.length <= 1 && friendRequests.length === 0) {
          onClose();
        }
      } else {
        setError(response.msg || `Failed to process group request`);
      }
    } catch (err: any) {
        setError(err?.response?.data?.msg || err.message || `Failed to process group request`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-primary w-[450px] max-w-full rounded-xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary shrink-0">
          <div className="flex space-x-4">
            <button
                className={`text-lg font-medium transition-colors ${activeTab === 'friends' ? 'text-brand border-b-2 border-brand pb-1 -mb-4' : 'text-secondary hover:text-primary'}`}
                onClick={() => setActiveTab('friends')}
            >
                Friend Requests
                {friendRequests.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{friendRequests.length}</span>
                )}
            </button>
            <button
                className={`text-lg font-medium transition-colors ${activeTab === 'groups' ? 'text-brand border-b-2 border-brand pb-1 -mb-4' : 'text-secondary hover:text-primary'}`}
                onClick={() => setActiveTab('groups')}
            >
                Group Invites
                {groupRequests.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{groupRequests.length}</span>
                )}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors focus:outline-none"
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
          {activeTab === 'friends' ? (
             friendRequests.length > 0 ? (
                friendRequests.map((req) => (
                  <FriendRequestItem
                    key={req.data.msg_id}
                    req={req}
                    processingId={processingId}
                    handleAction={handleFriendAction}
                    setError={setError}
                  />
                ))
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-secondary p-6 text-center">
                  <p className="text-sm">No pending friend requests</p>
                </div>
             )
          ) : (
             groupRequests.length > 0 ? (
                groupRequests.map((req) => (
                  <GroupRequestItem
                    key={req.data.msg_id}
                    req={req}
                    processingId={processingId}
                    handleAction={handleGroupAction}
                  />
                ))
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-secondary p-6 text-center">
                  <p className="text-sm">No pending group invites</p>
                </div>
             )
          )}
        </div>
      </div>
    </div>
  );
};
