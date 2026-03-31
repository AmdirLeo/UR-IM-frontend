import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pin, Minus, Square, X, Smile, Folder, Scissors, MessageSquare, Phone, Video } from 'lucide-react';
import { WSMessage } from '../../hooks/useWebSocket';

interface ChatPanelProps {
  activeChatId: number;
  currentUserId: string;
  isConnected: boolean;
  messages: WSMessage[];
  sendMessage: (receiverId: number, content: string, senderId: number) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  activeChatId,
  currentUserId,
  isConnected,
  messages,
  sendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="flex-1 h-full bg-[#F5F5F5] flex flex-col min-w-[400px]">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
        <div className="flex items-center">
          <h2 className="text-xl font-medium text-black tracking-wide">
            {activeChatId === 2 ? '霸王餐助手x2º @团推' : `User ID: ${activeChatId}`}
          </h2>
        </div>

        {/* Window controls (Mock) */}
        <div className="flex items-center space-x-4 text-gray-500">
          <Pin className="w-4 h-4 hover:text-gray-800 cursor-pointer" />
          <Minus className="w-4 h-4 hover:text-gray-800 cursor-pointer" />
          <Square className="w-4 h-4 hover:text-gray-800 cursor-pointer" />
          <X className="w-4 h-4 hover:text-gray-800 cursor-pointer" />
          <MoreHorizontal className="w-5 h-5 ml-2 hover:text-gray-800 cursor-pointer" />
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

                <div className={`max-w-[70%] ${isMe ? 'bg-[#95EC69]' : 'bg-white'} rounded p-2.5 shadow-sm border ${isMe ? 'border-[#89D961]' : 'border-gray-200'} relative`}>
                    {/* Tiny triangle pointer */}
                    <div className={`absolute top-3 w-0 h-0 border-y-[6px] border-y-transparent ${
                      isMe
                        ? 'right-[-6px] border-l-[6px] border-l-[#95EC69]'
                        : 'left-[-6px] border-r-[6px] border-r-white'
                    }`} />

                    <p className="text-[#1A1A1A] text-[15px] leading-relaxed whitespace-pre-wrap word-break">
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

      {/* Input Area */}
      <div className="h-[180px] bg-[#F5F5F5] border-t border-gray-200 flex flex-col shrink-0 px-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-4 text-gray-500">
            <Smile className="w-5 h-5 hover:text-gray-800 cursor-pointer transition-colors" />
            <Folder className="w-5 h-5 hover:text-gray-800 cursor-pointer transition-colors" />
            <Scissors className="w-5 h-5 hover:text-gray-800 cursor-pointer transition-colors" />
            <MessageSquare className="w-5 h-5 hover:text-gray-800 cursor-pointer transition-colors" />
          </div>
          <div className="flex items-center space-x-4 text-gray-500">
             <Phone className="w-5 h-5 hover:text-gray-800 cursor-pointer transition-colors" />
             <Video className="w-5 h-5 hover:text-gray-800 cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Text Area */}
        <textarea
          className="flex-1 bg-transparent border-none outline-none resize-none text-[#1A1A1A] text-[15px]"
          placeholder=""
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Send Button */}
        <div className="flex justify-end py-3">
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`px-6 py-1.5 rounded text-[14px] font-medium transition-colors ${
              inputText.trim()
                ? 'bg-[#E9E9E9] hover:bg-[#D2D2D2] text-[#07C160]'
                : 'bg-[#F5F5F5] text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            发送(S)
          </button>
        </div>
      </div>
    </div>
  );
};
