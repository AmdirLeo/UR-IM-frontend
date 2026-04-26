import React, { useState, useEffect } from 'react';
import { X, Loader2, Users } from 'lucide-react';
import { useContactContext } from '../../context/ContactContext';
import { createGroup } from '../../api/group';
import { formatAvatarUrl } from '../../utils/url';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (conversationId: number) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { friends } = useContactContext();
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setGroupName('');
      setSelectedFriends([]);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFriendToggle = (friendId: number) => {
    setSelectedFriends((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      } else {
        if (prev.length >= 50) {
          setError('最多只能选择50个好友');
          return prev;
        }
        setError('');
        return [...prev, friendId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      setError('请输入群聊名称');
      return;
    }
    if (selectedFriends.length === 0) {
      setError('请至少选择一个好友');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await createGroup({
        name: groupName.trim(),
        user_ids: selectedFriends,
      });

      if (response.code === 200 && response.data?.conversation_id) {
        onSuccess(response.data.conversation_id);
        onClose();
      } else {
        setError(response.msg || '创建群聊失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || err.message || '创建群聊时发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-panel w-[450px] max-w-full rounded-xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary shrink-0">
          <h2 className="text-lg font-medium text-secondary flex items-center">
            <Users className="w-5 h-5 mr-2" />
            发起群聊
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-secondary hover:text-primary transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary mb-1">群聊名称</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="请输入群聊名称"
              className="w-full bg-primary border border-primary text-primary rounded-md px-3 py-2 focus:outline-none focus:border-green-500 transition-colors"
              maxLength={100}
            />
          </div>

          <div className="mb-2 flex justify-between items-end">
            <label className="block text-sm font-medium text-secondary">选择好友</label>
            <span className="text-xs text-tertiary">已选 {selectedFriends.length}/50 人</span>
          </div>

          <div className="border border-primary rounded-md max-h-[250px] overflow-y-auto bg-primary">
            {friends.length === 0 ? (
              <div className="p-4 text-center text-sm text-tertiary">
                暂无好友可邀请
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.user_id}
                  className="flex items-center px-3 py-2 hover:bg-hover cursor-pointer border-b border-primary last:border-b-0"
                  onClick={() => handleFriendToggle(friend.user_id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFriends.includes(friend.user_id)}
                    onChange={() => {}} // Handled by div onClick
                    className="w-4 h-4 text-green-500 rounded border-gray-300 focus:ring-green-500 mr-3 pointer-events-none"
                  />
                  <div className="w-8 h-8 rounded bg-gray-300 mr-3 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {friend.avatar_url ? (
                      <img src={formatAvatarUrl(friend.avatar_url)!} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 font-bold opacity-50">{friend.username?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <span className="text-sm text-primary truncate flex-1">{friend.username}</span>
                </div>
              ))
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-3">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-primary shrink-0 flex justify-end space-x-3 bg-secondary">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-secondary bg-primary border border-primary hover:bg-hover rounded-md transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || friends.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors flex items-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              '确定创建'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
