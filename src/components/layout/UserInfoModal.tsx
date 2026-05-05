import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getUserInfo } from '../../api/friend';
import { setGroupAdmin, removeGroupMember } from '../../api/group';
import { formatAvatarUrl } from '../../utils/url';

export interface GroupContextForUserModal {
  conversationId: number;
  myRole: string;
  targetRole: string;
}

interface UserInfoModalProps {
  groupContext?: GroupContextForUserModal;
  onGroupActionSuccess?: () => void;
  userId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const UserInfoModal: React.FC<UserInfoModalProps> = ({ userId, isOpen, onClose, groupContext, onGroupActionSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen && userId) {
      if (userId < 0) {
        setUserInfo({
          user_id: userId,
          username: userId === -1 ? "系统通知" : "群助手",
          // 这里给系统账号分配专用的机器人头像
          avatar_url: userId === -1 
            ? "https://api.dicebear.com/7.x/bottts/svg?seed=System" 
            : "https://api.dicebear.com/7.x/bottts/svg?seed=GroupBot",
          // 为了不显示别人的邮箱，我们可以直接留空，下面的 UI 渲染时遇到空就会自动隐藏邮箱块
          email: "" 
        });
        setLoading(false);
        return; // 🛑 极其关键：拦截请求，直接返回！
      }
      
      const fetchInfo = async () => {
        setLoading(true);
        try {
          const res = await getUserInfo(userId);
          // Backend might return standard wrapper or direct UserInfoResponse. Assume the actual data is wrapped if we see 'data'
          if (res && res.code === 200) {
            setUserInfo((res as any).data || res);
          }
        } catch (e) {
          console.error("Failed to load user info:", e);
        } finally {
          setLoading(false);
        }
      };
      fetchInfo();
    }
  }, [isOpen, userId]);

  const handleSetAdmin = async (role: 'admin' | 'member') => {
    if (!groupContext) return;
    try {
      const res = await setGroupAdmin({
        conversation_id: groupContext.conversationId,
        user_id: userId,
        role
      });
      if (res.code === 200) {
        onGroupActionSuccess?.();
        onClose();
      } else {
        alert(res.msg || '操作失败');
      }
    } catch (e) {
      console.error(e);
      alert('操作失败');
    }
  };

  const handleKick = async () => {
    if (!groupContext) return;
    if (!window.confirm('确定要将该用户移出群聊吗？')) return;
    try {
      const res = await removeGroupMember({
        conversation_id: groupContext.conversationId,
        user_id: userId
      });
      if (res.code === 200) {
        onGroupActionSuccess?.();
        onClose();
      } else {
        alert(res.msg || '操作失败');
      }
    } catch (e) {
      console.error(e);
      alert('操作失败');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-panel w-full max-w-sm rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="h-12 flex items-center justify-between px-4 border-b border-primary">
          <h3 className="text-base font-medium text-primary">User Info</h3>
          <button onClick={onClose} className="p-1 hover:bg-hover rounded-full transition-colors">
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : userInfo ? (
            <>
              <div className="w-20 h-20 rounded-lg overflow-hidden flex items-center justify-center bg-gray-200 mb-4 shadow-sm">
                {userInfo.avatar_url ? (
                  <img src={formatAvatarUrl(userInfo.avatar_url)!} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-gray-500 font-bold opacity-50">
                    {userInfo.username?.charAt(0) || '?'}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-medium text-primary mb-1">{userInfo.username}</h2>
              <p className="text-sm text-secondary mb-4">ID: {userInfo.user_id || userId}</p>


              {groupContext && (
                <div className="w-full flex flex-col space-y-2 mt-4">
                  {groupContext.myRole === 'owner' && groupContext.targetRole !== 'owner' && (
                    <button
                      onClick={() => handleSetAdmin(groupContext.targetRole === 'admin' ? 'member' : 'admin')}
                      className="w-full py-2 bg-secondary text-primary hover:bg-hover rounded transition-colors text-sm"
                    >
                      {groupContext.targetRole === 'admin' ? '取消管理员' : '设为管理员'}
                    </button>
                  )}
                  {((groupContext.myRole === 'owner' && groupContext.targetRole !== 'owner') ||
                    (groupContext.myRole === 'admin' && groupContext.targetRole === 'member')) && (
                    <button
                      onClick={handleKick}
                      className="w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded transition-colors text-sm"
                    >
                      移出群聊
                    </button>
                  )}
                </div>
              )}

              {userInfo.email && (
                <div className="w-full bg-secondary rounded p-3 mb-2">
                  <p className="text-xs text-tertiary mb-1">Email</p>
                  <p className="text-sm text-primary">{userInfo.email}</p>
                </div>
              )}
            </>
          ) : (
             <div className="text-sm text-secondary">Failed to load user info.</div>
          )}
        </div>
      </div>
    </div>
  );
};
