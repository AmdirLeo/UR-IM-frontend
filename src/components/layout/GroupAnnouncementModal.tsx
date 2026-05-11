import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { postGroupAnnouncement } from '../../api/group';

interface GroupAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  onSuccess: () => void;
}

export const GroupAnnouncementModal: React.FC<GroupAnnouncementModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  onSuccess
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert("公告内容不能为空");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await postGroupAnnouncement({ conversation_id: conversationId, msg: content.trim() });
      if (res.code === 200) {
        onSuccess();
        setContent('');
        onClose();
        window.dispatchEvent(new CustomEvent('refresh_group_info'));
      } else {
        alert(res.msg || "发布失败");
      }
    } catch (e) {
      console.error("Failed to post announcement:", e);
      alert("发布失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-panel w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="h-12 flex items-center justify-between px-4 border-b border-primary">
          <h3 className="text-base font-medium text-primary">发布群公告</h3>
          <button onClick={onClose} className="p-1 hover:bg-hover rounded-full transition-colors">
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            className="w-full h-32 bg-secondary text-primary border border-primary rounded p-3 text-sm focus:outline-none focus:border-brand resize-none"
            placeholder="请输入公告内容..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-secondary hover:bg-hover rounded transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-2 text-sm bg-brand text-white rounded hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
