import React, { useState, useEffect } from 'react';
import { X, Check, XCircle, Loader2 } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { handleFriendRequest, UserInfoResponse } from '../../api/friend';
import { formatAvatarUrl } from '../../utils/url';
import { getUserInfo } from '../../api/friend.ts';
import { NewChatMessage } from '../../hooks/useWebSocket';

// ==========================================
// 1. 新增：独立的申请列表项子组件
// ==========================================
const FriendRequestItem = ({
  req,
  processingId,
  handleAction,
  setError
}: {
  req: NewChatMessage;
  processingId: number | null;
  handleAction: (msgId: number, requestId: number, action: 'accepted' | 'rejected') => void;
  setError: (err: string) => void;
}) => {
  // 提取基础数据
  // NewChatMessage doesn't natively define `extra` in `data`, so we must typecast it or use `content` if it's stringified
  const extra = ((req.data as unknown as { extra?: Record<string, unknown> }).extra ?? {}) as Record<string, unknown>;
  const msgId = req.data.msg_id;
  const requestId = Number(extra.request_id ?? req.data.msg_id);
  const senderId = Number(extra.sender_id ?? req.data.sender_id);
  const rawMessage = (extra.reason as string) || '';
  const message = rawMessage.trim() ? rawMessage : '没有附加信息';

  // 状态管理：存储拉取到的真实用户信息
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 挂载时拉取好友信息
  useEffect(() => {
    const fetchInfo = async () => {
      if (!senderId) {
        setLoading(false);
        return;
      }
      try {
        const res = await getUserInfo(senderId);
        // 注意：如果你接口返回的是 {code: 200, data: {...}}, 这里请改成 res.data
        if (res.code === 200) {
          setUserInfo(res); // 或者 setUserInfo(res.data)
        }
      } catch (err) {
        console.error("获取好友信息失败", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [senderId]);

  // 整合展示数据 (优先用接口返回的数据，兜底用 ws 推送的数据)
  const username = userInfo?.username || (extra.username as string) || `用户 ID: ${senderId}`;
  const rawAvatarUrl = userInfo?.avatar_url || (extra.avatar as string | null) || null;
  const avatarUrl = formatAvatarUrl(rawAvatarUrl);

  return (
    <div className="flex flex-col p-3 hover:bg-gray-50 dark:hover:bg-secondary rounded-lg transition-colors border-b border-primary last:border-0">
      <div className="flex items-center justify-between">
        {/* User Info */}
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
              {/* 加载时显示骨架提示，加载完显示真名 */}
              {loading ? <span className="text-gray-400">正在加载信息...</span> : username}
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
};


// ==========================================
// 2. 主组件：FriendRequestsModal
// ==========================================
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
            friendRequests.map((req) => (
              // 👇 这里变成了直接调用我们上面写的子组件
              <FriendRequestItem
                key={req.data.msg_id}
                req={req}
                processingId={processingId}
                handleAction={handleAction}
                setError={setError}
              />
            ))
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
