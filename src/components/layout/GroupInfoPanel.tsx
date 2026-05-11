import React, { useEffect, useState } from 'react';
import { X, ChevronRight, Plus } from 'lucide-react';
import { getGroupInfo, getGroupMembers, quitGroup, bombGroup, GroupInfoData, GroupMember } from '../../api/group';
import { formatAvatarUrl } from '../../utils/url';
import { useChatContext } from '../../context/ChatContext';
import { GroupAnnouncementModal } from './GroupAnnouncementModal';
import { GroupAnnouncementsListModal } from './GroupAnnouncementsListModal';
import { UserInfoModal } from './UserInfoModal';

interface GroupInfoPanelProps {
  conversationId: number;
  isOpen: boolean;
  onClose: () => void;
  onSearchClick: () => void;
}

export const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({
  conversationId,
  isOpen,
  onClose,
  onSearchClick,
}) => {
  const [loading, setLoading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfoData | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);

  const { conversations, loadConversations, toggleMuteConversation, togglePinConversation } = useChatContext();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isAnnouncementsListOpen, setIsAnnouncementsListOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const currentConversation = conversations.find(c => c.conversation_id === conversationId);
  const isMuted = currentConversation?.muted || false;
  const isPinned = currentConversation?.pinned || false;

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchData();
    }
  }, [isOpen, conversationId]);

  useEffect(() => {
    const handleRemoteGroupUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.conversation_id === conversationId) {
        if (isOpen) {
          fetchData();
        }
      }
    };

    window.addEventListener('remote_group_update', handleRemoteGroupUpdate);

    return () => {
      window.removeEventListener('remote_group_update', handleRemoteGroupUpdate);
    };
  }, [isOpen, conversationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [infoRes, membersRes] = await Promise.all([
        getGroupInfo({ conversation_id: conversationId }),
        getGroupMembers({ conversation_id: conversationId })
      ]);

      if (infoRes.code === 200 && infoRes.data) {
        setGroupInfo(infoRes.data);
      }
      if (membersRes.code === 200 && membersRes.data) {
        if (membersRes.data.list && Array.isArray(membersRes.data.list)) {
          setMembers(membersRes.data.list);
        } else {
          setMembers([]);
        }
      }
    } catch (e) {
      console.error("Failed to load group details:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMute = async () => {
    try {
      await toggleMuteConversation(conversationId, !isMuted);
      await loadConversations();
    } catch (e) {
      console.error("Failed to toggle mute:", e);
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePinConversation(conversationId, !isPinned);
      await loadConversations();
    } catch (e) {
      console.error("Failed to toggle pin:", e);
    }
  };

  const handleQuitGroup = async () => {
    if (window.confirm("确定要退出群聊吗？")) {
      try {
        await quitGroup({ conversation_id: conversationId });
        await loadConversations();
        onClose();
        // Since we quit the group, we might want to redirect away from this chat
        window.dispatchEvent(new CustomEvent('remote_group_removed', { detail: { conversation_id: conversationId } }));
      } catch (e) {
        console.error("Failed to quit group:", e);
      }
    }
  };

  const handleBombGroup = async () => {
    if (window.confirm("确定要解散群聊吗？操作不可恢复。")) {
      try {
        await bombGroup({ conversation_id: conversationId });
        await loadConversations();
        onClose();
        window.dispatchEvent(new CustomEvent('remote_group_removed', { detail: { conversation_id: conversationId } }));
      } catch (e) {
        console.error("Failed to dissolve group:", e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-panel border-l border-primary shadow-xl z-20 flex flex-col animate-in slide-in-from-right-full duration-200">
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-primary shrink-0 bg-secondary">
        <h3 className="text-base font-medium text-primary tracking-wide">聊天信息 ({members.length})</h3>
        <button onClick={onClose} className="p-1 hover:bg-hover rounded-full transition-colors">
          <X className="w-5 h-5 text-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-primary">
        {loading ? (
          <div className="p-6 text-center text-secondary text-sm">加载中...</div>
        ) : (
          <div className="flex flex-col">
            {/* Members Grid */}
            <div className="p-4 grid grid-cols-5 gap-y-4 gap-x-2 bg-panel">
              {members.slice(0, 19).map(member => (
                <div
                  key={member.user_id}
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => setSelectedMemberId(member.user_id)}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center overflow-hidden mb-1 hover:opacity-80 transition-opacity relative">
                    {member.avatar_url ? (
                      <img src={formatAvatarUrl(member.avatar_url)!} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 font-bold text-sm opacity-50">{member.user_name.charAt(0).toUpperCase()}</span>
                    )}
                    {/* Role badge if needed, e.g. Owner */}
                    {member.role === 'owner' && (
                      <div className="absolute bottom-0 right-0 bg-yellow-500 text-[8px] text-white px-[2px] rounded-tl">Owner</div>
                    )}
                    {member.role === 'admin' && (
                      <div className="absolute bottom-0 right-0 bg-blue-500 text-[8px] text-white px-[2px] rounded-tl">Admin</div>
                    )}
                  </div>
                  <span className="text-xs text-secondary truncate w-12 text-center">{member.user_name}</span>
                </div>
              ))}

              {/* Add Button */}
              <div className="flex flex-col items-center cursor-pointer group">
                <div className="w-10 h-10 bg-panel border border-dashed border-primary rounded flex items-center justify-center hover:bg-hover transition-colors mb-1">
                  <Plus className="w-5 h-5 text-secondary group-hover:text-primary" />
                </div>
                <span className="text-xs text-secondary truncate w-12 text-center">添加</span>
              </div>
            </div>

            <div className="h-2 bg-primary"></div>

            {/* Info Sections */}
            <div className="bg-panel px-4 py-3 flex flex-col border-b border-primary">
              <span className="text-sm text-secondary mb-1">群聊名称</span>
              <span className="text-base text-primary">{groupInfo?.conversation_name || currentConversation?.name || '未命名群聊'}</span>
            </div>

            <div
              className="bg-panel px-4 py-3 flex flex-col border-b border-primary cursor-pointer hover:bg-hover transition-colors"
              onClick={() => setIsAnnouncementsListOpen(true)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary">群公告</span>
                <ChevronRight className="w-4 h-4 text-tertiary" />
              </div>
              <span className="text-base text-secondary truncate">{groupInfo?.latest_announcement?.content || '暂无公告'}</span>
            </div>

            <div className="bg-panel px-4 py-3 flex flex-col border-b border-primary">
              <span className="text-sm text-secondary mb-1">我在本群的身份</span>
              <span className="text-base text-primary">{groupInfo?.my_role === 'owner' ? '群主' : groupInfo?.my_role === 'admin' ? '管理员' : '成员'}</span>
            </div>

            <div className="h-2 bg-primary"></div>

            <div
              className="bg-panel px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-hover transition-colors"
              onClick={onSearchClick}
            >
              <span className="text-base text-primary">查找聊天记录</span>
              <ChevronRight className="w-5 h-5 text-tertiary" />
            </div>

            <div className="h-2 bg-primary"></div>

            {/* Toggles */}
            <div className="bg-panel px-4 py-3 flex items-center justify-between border-b border-primary">
              <span className="text-base text-primary">消息免打扰</span>
              <Toggle checked={isMuted} onChange={handleToggleMute} />
            </div>

            <div className="bg-panel px-4 py-3 flex items-center justify-between">
              <span className="text-base text-primary">置顶聊天</span>
              <Toggle checked={isPinned} onChange={handleTogglePin} />
            </div>

            <div className="h-2 bg-primary"></div>

            <div className="bg-panel mt-4 mb-6">
               {groupInfo?.my_role === 'owner' ? (
                 <button
                   onClick={handleBombGroup}
                   className="w-full bg-panel text-red-500 font-medium py-3 text-center border-y border-primary hover:bg-hover transition-colors"
                 >
                   解散群聊
                 </button>
               ) : (
                 <button
                   onClick={handleQuitGroup}
                   className="w-full bg-panel text-red-500 font-medium py-3 text-center border-y border-primary hover:bg-hover transition-colors"
                 >
                   退出群聊
                 </button>
               )}
            </div>
          </div>
        )}
      </div>

      <GroupAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        conversationId={conversationId}
        onSuccess={() => {
          // Re-fetch the info to show the new announcement
          getGroupInfo({ conversation_id: conversationId }).then(infoRes => {
            if (infoRes.code === 200 && infoRes.data) {
              setGroupInfo(infoRes.data);
            }
          });
        }}
      />

      <GroupAnnouncementsListModal
        isOpen={isAnnouncementsListOpen}
        onClose={() => setIsAnnouncementsListOpen(false)}
        conversationId={conversationId}
        canPublish={groupInfo?.my_role === 'owner' || groupInfo?.my_role === 'admin'}
        onPublishNewClick={() => {
          setIsAnnouncementsListOpen(false);
          setIsAnnouncementModalOpen(true);
        }}
      />

      {selectedMemberId !== null && (
        <UserInfoModal
          userId={selectedMemberId}
          isOpen={true}
          onClose={() => setSelectedMemberId(null)}
          groupContext={
            groupInfo ? {
              conversationId: conversationId,
              myRole: groupInfo.my_role,
              targetRole: members.find(m => m.user_id === selectedMemberId)?.role || 'member'
            } : undefined
          }
          onGroupActionSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>

  );
};

// Simple inline Toggle component
const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <div
    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    onClick={onChange}
  >
    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
  </div>
);
