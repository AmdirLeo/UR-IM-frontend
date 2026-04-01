import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { WSMessage } from '../../hooks/useWebSocket';

interface ChatPanelProps {
  activeChatId: number;
  currentUserId: string;
  isConnected: boolean;
  messages: WSMessage[];
  sendMessage: (receiverId: number, content: string, senderId: number) => void;
}

export const ChatPanel: React.FC<ChatPanelProps & { activeChatName?: string }> = ({
  activeChatId,
  activeChatName,
  currentUserId,
  isConnected,
  messages,
  sendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [inputHeight, setInputHeight] = useState(120);
  const [isResizingVertical, setIsResizingVertical] = useState(false);

  // Resize handler for Chat Input Area
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingVertical) return;
      // Calculate height from bottom of screen
      let newHeight = window.innerHeight - e.clientY;
      if (newHeight < 100) newHeight = 100;
      if (newHeight > window.innerHeight / 2) newHeight = window.innerHeight / 2;
      setInputHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingVertical(false);
    };

    if (isResizingVertical) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingVertical]);

  const handleSend = () => {
    if (!inputText.trim() || !isConnected) return;
    const parsedCurrentId = parseInt(currentUserId, 10);
    // Use activeChatId as the receiver for this UI mockup
    sendMessage(activeChatId, inputText, parsedCurrentId);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 h-full bg-[#F5F5F5] dark:bg-[#111111] flex flex-col min-w-[400px]">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center">
          <h2 className="text-xl font-medium text-black dark:text-gray-100 tracking-wide">
            {activeChatName || `User ID: ${activeChatId}`}
          </h2>
        </div>

        {/* Window controls (Mock) */}
        <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
          <MoreHorizontal className="w-5 h-5 ml-2 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer" />
        </div>
      </div>

      {/* Message History Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
           <div className="flex justify-center mt-10">
             <span className="text-xs bg-gray-200 text-gray-500 px-3 py-1 rounded">No messages yet.</span>
           </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.type === 'chat' && msg.sender_id?.toString() === currentUserId;

            if (msg.type === 'system') {
              return (
                <div key={idx} className="flex justify-center my-4">
                  <span className="text-xs bg-gray-200 text-gray-500 px-3 py-1 rounded">
                    {msg.message}
                  </span>
                </div>
              );
            }

            return (
              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                {!isMe && (
                   <div className="w-9 h-9 bg-blue-500 rounded flex-shrink-0 mr-3 mt-1" />
                )}

                <div className={`max-w-[70%] ${isMe ? 'bg-[#95EC69] dark:bg-[#2B2B2B] dark:text-gray-200' : 'bg-white dark:bg-[#202020] dark:text-gray-200'} rounded p-2.5 shadow-sm border ${isMe ? 'border-[#89D961] dark:border-[#3A3A3A]' : 'border-gray-200 dark:border-[#333333]'} relative`}>
                    {/* Tiny triangle pointer */}
                    <div className={`absolute top-3 w-0 h-0 border-y-[6px] border-y-transparent ${
                      isMe
                        ? 'right-[-6px] border-l-[6px] border-l-[#95EC69] dark:border-l-[#2B2B2B]'
                        : 'left-[-6px] border-r-[6px] border-r-white dark:border-r-[#202020]'
                    }`} />

                    <p className="text-[#1A1A1A] dark:text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap word-break">
                      {msg.content}
                    </p>
                </div>

                {isMe && (
                   <div className="w-9 h-9 bg-gray-300 rounded flex-shrink-0 ml-3 mt-1 flex items-center justify-center overflow-hidden">
                       <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
                   </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Vertical Drag handle */}
      <div
        className="h-1 cursor-row-resize hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-blue-500 transition-colors z-10 shrink-0"
        onMouseDown={() => setIsResizingVertical(true)}
      />

      {/* Input Area */}
      <div
        style={{ height: `${inputHeight}px` }}
        className="bg-[#F5F5F5] dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800 flex flex-col shrink-0 px-4 pt-3 pb-3 transition-colors"
      >
        {/* Text Area */}
        <textarea
          className="flex-1 bg-transparent border-none outline-none resize-none text-[#1A1A1A] dark:text-gray-200 text-[15px]"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Send Button */}
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`px-6 py-1.5 rounded text-[14px] font-medium transition-colors ${
              inputText.trim()
                ? 'bg-[#E9E9E9] dark:bg-[#2B2B2B] hover:bg-[#D2D2D2] dark:hover:bg-[#3B3B3B] text-[#07C160] dark:text-[#07C160]'
                : 'bg-[#F5F5F5] dark:bg-[#1A1A1A] text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-[#333333] cursor-not-allowed'
            }`}
          >
            发送(S)
          </button>
        </div>
      </div>
    </div>
  );
};
