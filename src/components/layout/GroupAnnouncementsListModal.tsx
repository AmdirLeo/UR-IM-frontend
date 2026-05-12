import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { getGroupAnnouncements, AnnouncementItem } from '../../api/group';

interface GroupAnnouncementsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  canPublish: boolean;
  onPublishNewClick: () => void;
}

export const GroupAnnouncementsListModal: React.FC<GroupAnnouncementsListModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  canPublish,
  onPublishNewClick
}) => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setAnnouncements([]);
      setPage(1);
      setHasMore(true);
      fetchAnnouncements(1);
    }
  }, [isOpen, conversationId]);

  const fetchAnnouncements = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await getGroupAnnouncements({
        conversation_id: conversationId,
        page: pageNum,
        page_size: 20
      });
      if (res.code === 200 && res.data) {
        if (pageNum === 1) {
          setAnnouncements(res.data.items || []);
        } else {
          setAnnouncements(prev => [...prev, ...(res.data.items || [])]);
        }
        setHasMore((res.data.items?.length || 0) === 20);
      }
    } catch (e) {
      console.error("Failed to fetch announcements:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAnnouncements(nextPage);
    }
  };

  const formatTime = (ts: number) => {
    // Assuming ts is a unix timestamp in seconds or milliseconds
    // Let's assume milliseconds if it's huge, else seconds
    const date = new Date(ts > 1e11 ? ts : ts * 1000);
    return date.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-panel w-full max-w-md h-[80vh] flex flex-col rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="h-14 flex items-center justify-between px-4 border-b border-primary shrink-0">
          <h3 className="text-base font-medium text-primary">群公告</h3>
          <div className="flex items-center space-x-2">
            {canPublish && (
              <button
                onClick={onPublishNewClick}
                className="text-sm text-brand hover:text-brand/80 flex items-center transition-colors px-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                发布新公告
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-hover rounded-full transition-colors">
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-secondary">
          {announcements.length === 0 && !loading ? (
            <div className="h-full flex items-center justify-center text-sm text-secondary">
              暂无群公告
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((item) => (
                <div key={item.announcement_id} className="bg-panel p-4 rounded-lg shadow-sm border border-primary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-primary">{item.sender_name}</span>
                      {/* Note: In a real implementation we would look up the role, but since the schema doesn't provide sender_id, we will just show the name. Usually owners/admins are the ones sending announcements anyway. We can safely skip the badge here if we don't have the user ID to check the role against members, or we just assume they are admin/owner. Let's just leave it clean. */}
                    </div>
                    <span className="text-xs text-tertiary">{formatTime(item.create_time)}</span>
                  </div>
                  <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-tertiary" />
            </div>
          )}

          {!loading && hasMore && announcements.length > 0 && (
            <div className="py-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="text-sm text-brand hover:underline"
              >
                加载更多
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
