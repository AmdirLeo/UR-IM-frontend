import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Calendar } from 'lucide-react';
import { chatApi, SearchMessageItem } from '../../api/chat';
import { formatMessageBubbleTime } from '../../utils/timeFormat';

interface MessageSearchModalProps {
  conversationId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const MessageSearchModal: React.FC<MessageSearchModalProps> = ({ conversationId, isOpen, onClose }) => {
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [senderId, setSenderId] = useState('');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchMessageItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setKeyword('');
      setStartDate('');
      setEndDate('');
      setSenderId('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!conversationId) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await chatApi.searchMessages({
        conversation_id: conversationId,
        keyword: keyword.trim() || undefined,
        start_time: startDate ? new Date(startDate).toISOString() : undefined,
        end_time: endDate ? new Date(endDate).toISOString() : undefined,
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
              <div className="w-24">
                <input
                  type="number"
                  placeholder="Sender ID"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  className="w-full bg-secondary text-primary px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-accent placeholder-tertiary"
                />
              </div>
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
          </form>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-primary space-y-3 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-secondary">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <div key={item.msg_id} className="p-3 bg-secondary rounded-lg border border-primary hover:border-accent/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-accent">User {item.user_id}</span>
                  </div>
                  <span className="text-xs text-tertiary group-hover:text-secondary transition-colors">
                    {formatMessageBubbleTime(item.time)}
                  </span>
                </div>
                <p className="text-sm text-primary break-words whitespace-pre-wrap">{item.msg}</p>
              </div>
            ))
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
