import React, { useState, useEffect, useContext } from 'react';
import { Search, X, Loader2, Calendar } from 'lucide-react';
import { chatApi, SearchMessageItem } from '../../api/chat';
import { formatMessageBubbleTime } from '../../utils/timeFormat';
import { useContactContext } from '../../context/ContactContext';
import { UserContext } from '../../context/UserContext';
import { formatAvatarUrl } from '../../utils/url';

interface MessageSearchModalProps {
  conversationId: number;
  isGroupChat?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const MessageSearchModal: React.FC<MessageSearchModalProps> = ({ conversationId, isGroupChat, isOpen, onClose }) => {
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [senderId, setSenderId] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchMessageItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { friends } = useContactContext() as any;
  const { userInfo } = useContext(UserContext) as any;
  
  const getUserInfo = (userId: number) => {
    if (userInfo?.id && userInfo.id === userId) {
      return {
        displayName: userInfo.username,
        displayAvatar: userInfo.avatar_url ? formatAvatarUrl(userInfo.avatar_url) : undefined
      };
    }
    const friend = friends?.find((f: any) => f.user_id === userId);
    if (friend) {
      return {
        displayName: friend.username,
        displayAvatar: friend.avatar_url ? formatAvatarUrl(friend.avatar_url) : undefined
      };
    }
    return {
      displayName: `User ${userId}`,
      displayAvatar: undefined
    };
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setKeyword('');
      setStartDate('');
      setEndDate('');
      setSenderId('');
      setResults([]);
      setHasSearched(false);
      setError('');
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!conversationId) return;
    
    setError('');

    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        setError('结束日期不能早于开始日期！');
        return; // 🛑 拦截请求，直接退出
      }
    }

    setLoading(true);
    setHasSearched(true);

    // 1. 处理起始时间（当天的 00:00:00 本地时间）
  let finalStartTime = undefined;
  if (startDate) {
    // 拼接后格式：2026-04-25T00:00:00
    finalStartTime = new Date(`${startDate}T00:00:00`).toISOString();
  }
  
  // 2. 处理结束时间（当天的 23:59:59.999 本地时间）
  let finalEndTime = undefined;
  if (endDate) {
    // 拼接后格式：2026-04-26T23:59:59.999
    finalEndTime = new Date(`${endDate}T23:59:59.999`).toISOString();
  }

    try {
      const response = await chatApi.searchMessages({
        conversation_id: conversationId,
        keyword: keyword.trim() || undefined,
        start_time: finalStartTime,
        end_time: finalEndTime,
        sender_id: senderId ? parseInt(senderId, 10) : undefined,
        limit: 50 // We can adjust the limit or add pagination later
      });

      // Assume the response returns the data inside a wrapper, or directly the array
      // Based on API type definitions, it should return SearchMessagesResponse directly
      // but if the backend wraps it in `data`, we extract it
      const resData = (response as any).data || response;
      if (Array.isArray(resData)) {
        setResults(resData);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-panel w-full max-w-2xl h-[80vh] flex flex-col rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-primary shrink-0">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-medium text-primary">Search Chat History</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-hover rounded-full transition-colors">
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        {/* Filter Form */}
        <div className="p-4 border-b border-primary bg-primary shrink-0">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Keyword..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full bg-secondary text-primary px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-accent placeholder-tertiary"
                />
              </div>

              {isGroupChat && (
                <div className="w-24">
                  <input
                    type="number"
                    placeholder="Sender ID"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="w-full bg-secondary text-primary px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-accent placeholder-tertiary"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-secondary rounded-md px-3 py-1.5 flex-1">
                <Calendar className="w-4 h-4 text-tertiary mr-2" />
                <span className="text-sm text-tertiary mr-2 w-10">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-primary text-sm focus:outline-none flex-1 [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center bg-secondary rounded-md px-3 py-1.5 flex-1">
                <Calendar className="w-4 h-4 text-tertiary mr-2" />
                <span className="text-sm text-tertiary mr-2 w-10">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-primary text-sm focus:outline-none flex-1 [color-scheme:dark]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-accent hover:bg-accent/90 text-white px-5 py-2 rounded-md flex items-center justify-center transition-colors font-medium disabled:opacity-50 min-w-[100px]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </button>
            </div>

            {/* 👇 5. 在这里渲染错误提示信息 */}
            {error && (
              <div className="text-red-500 text-sm mt-2 pl-1 font-medium">
                * {error}
              </div>
            )}
          </form>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-primary space-y-3 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-secondary">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            results.map((item) => {
              // 1. 获取原始消息内容
              let rawContent = item.msg || '';
              let displayContent = rawContent;

              // 2. 【核心逻辑】尝试解析 JSON 字符串
              if (typeof rawContent === 'string' && rawContent.startsWith('{')) {
                try {
                  const parsed = JSON.parse(rawContent);
                  // 提取出真正的文字内容，如果没有 content 字段则退回到原始字符串
                  displayContent = parsed.content || rawContent;
                } catch (e) {
                  // 如果解析失败（说明可能不是 JSON），保持原样
                  displayContent = rawContent;
                }
              }

              const { displayName, displayAvatar } = getUserInfo(item.user_id);
              return (
                <div key={item.msg_id} className="p-3 bg-secondary rounded-lg border border-primary hover:border-accent/50 transition-colors cursor-pointer group flex space-x-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-primary flex items-center justify-center">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base text-tertiary font-bold">{displayName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-accent truncate max-w-[120px]">{displayName}</span>
                      </div>
                      <span className="text-xs text-tertiary group-hover:text-secondary transition-colors shrink-0">
                        {formatMessageBubbleTime(item.time)}
                      </span>
                    </div>
                    <p className="text-sm text-primary break-words whitespace-pre-wrap">{displayContent}</p>
                  </div>
                </div>
              );
            })
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center h-full text-tertiary">
              <Search className="w-12 h-12 mb-3 opacity-20" />
              <p>No messages found</p>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-tertiary">
               <Search className="w-12 h-12 mb-3 opacity-20" />
               <p>Enter criteria to search history</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
