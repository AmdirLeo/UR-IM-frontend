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
    <div className="flex-1 h-full bg-primary flex flex-col min-w-[400px]">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-6 border-b border-primary shrink-0">
        <div className="flex items-center">
          <h2 className="text-xl font-medium text-primary tracking-wide">
            {activeChatName || `User ID: ${activeChatId}`}
          </h2>
        </div>

        {/* Window controls (Mock) */}
        <div className="flex items-center space-x-4 text-secondary">
          <MoreHorizontal className="w-5 h-5 ml-2 hover:text-primary cursor-pointer" />
        </div>
      </div>

      {/* Message History Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex justify-center mt-10">
            <span className="text-xs bg-secondary text-secondary px-3 py-1 rounded">No messages yet.</span>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.type === 'chat' && msg.sender_id?.toString() === currentUserId;

            if (msg.type === 'system') {
              return (
                <div key={idx} className="flex justify-center my-4">
                  <span className="text-xs bg-secondary text-secondary px-3 py-1 rounded">
                    {msg.message}
                  </span>
                </div>
              );
            }

            let messageContent = '';
            if (msg.type === 'chat' || msg.type === 'private' || msg.type === 'broadcast') {
              messageContent = msg.content;
            } else if (msg.type === 'NEW_CHAT_MESSAGE') {
              messageContent = msg.data.content;
            }

            return (
              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                {!isMe && (
                  <div className="w-9 h-9 bg-blue-500 rounded flex-shrink-0 mr-3 mt-1" />
                )}

                <div className={`max-w-[70%] ${isMe ? 'bg-bubble-self text-primary' : 'bg-bubble-other text-primary'} rounded p-2.5 shadow-sm border ${isMe ? 'border-primary' : 'border-primary'} relative`}>
                  {/* Tiny triangle pointer */}
                  <div className={`absolute top-3 w-0 h-0 border-y-[6px] border-y-transparent ${isMe
                      ? 'right-[-6px] border-l-[6px] border-l-[#95EC69] dark:border-l-[#2B2B2B]'
                      : 'left-[-6px] border-r-[6px] border-r-white dark:border-r-[#202020]'
                    }`} />

                  <p className="text-primary text-base leading-relaxed whitespace-pre-wrap word-break">
                    {messageContent}
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
        className="bg-primary border-t border-primary flex flex-col shrink-0 px-4 pt-3 pb-3 transition-colors"
      >
        {/* Text Area */}
        <textarea
          className="flex-1 bg-transparent border-none outline-none resize-none text-primary text-base"
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
            className={`px-6 py-1.5 rounded text-[14px] font-medium transition-colors ${inputText.trim()
                ? 'bg-secondary hover:bg-hover text-success'
                : 'bg-secondary text-secondary border border-primary cursor-not-allowed'
              }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
