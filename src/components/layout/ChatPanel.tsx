import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, User } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { ChevronsDown, ClipboardPaste, MessageSquareQuote, Trash2, X } from 'lucide-react';
import { useContextMenu } from '../common/ContextMenu/useContextMenu';
import { ContextMenu, ContextMenuItem } from '../common/ContextMenu/ContextMenu';
import { LocalMessage } from '../../hooks/useChat';
import { UserInfoModal } from './UserInfoModal';
import { formatMessageBubbleTime, shouldShowTimeBubble } from '../../utils/timeFormat';

interface ChatPanelProps {
  activeChatId: number;
  currentUserId: string;
  isConnected: boolean;
  sendMessage: (conversationId: number, content: string, type?: "text" | "image" | "card" | "notify", quoteMsgId?: number) => void;
}

import { formatAvatarUrl } from '../../utils/url';

export const ChatPanel: React.FC<ChatPanelProps & { activeChatName?: string; activeChatAvatar?: string | null; currentUserAvatar?: string | null; }> = ({
  activeChatId,
  activeChatName,
  activeChatAvatar,
  currentUserId,
  currentUserAvatar,
  isConnected,
  sendMessage
}) => {
  const { messagesMap, loadMessageHistory, markAsRead, conversations, deleteChatMessage, quotedMessagesMap } = useChatContext();
  const [inputText, setInputText] = useState('');
  const [quotingMessage, setQuotingMessage] = useState<LocalMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { xPos: inputXPos, yPos: inputYPos, showMenu: showInputMenu, setShowMenu: setShowInputMenu, handleContextMenu: handleInputContextMenu } = useContextMenu();
  const { xPos: msgXPos, yPos: msgYPos, showMenu: showMsgMenu, setShowMenu: setShowMsgMenu, handleContextMenu: handleMsgContextMenu } = useContextMenu();

  const [contextMenuMsgId, setContextMenuMsgId] = useState<number | null>(null);

  // Avatar interaction state
  const [userInfoModalId, setUserInfoModalId] = useState<number | null>(null);

  // Get active messages from the context map
  const activeMessagesRaw = messagesMap[activeChatId];
  const activeMessages = React.useMemo(() => activeMessagesRaw || [], [activeMessagesRaw]);

  const handleMsgRightClick = (e: React.MouseEvent, msg: LocalMessage) => {
    if (msg.msg_id) {
      setContextMenuMsgId(msg.msg_id);
      handleMsgContextMenu(e);
    }
  };

  const activeContextMenuMsg = React.useMemo(() => {
    return activeMessages.find(m => m.msg_id === contextMenuMsgId);
  }, [activeMessages, contextMenuMsgId]);

  const msgMenuItems: ContextMenuItem[] = React.useMemo(() => {
    if (!activeContextMenuMsg) return [];

    const isMe = activeContextMenuMsg.sender_id?.toString() === currentUserId;
    const items: ContextMenuItem[] = [
      {
        label: '引用',
        icon: <MessageSquareQuote className="w-4 h-4" />,
        onClick: () => setQuotingMessage(activeContextMenuMsg)
      }
    ];

    if (isMe) {
      items.push({
        label: '删除',
        icon: <Trash2 className="w-4 h-4" />,
        danger: true,
        onClick: () => {
          if (contextMenuMsgId) {
            deleteChatMessage(activeChatId, contextMenuMsgId);
          }
        }
      });
    }

    return items;
  }, [activeContextMenuMsg, currentUserId, contextMenuMsgId, deleteChatMessage, activeChatId]);


  const handleAvatarClick = (userId: number) => {
    if (userId !== -1) {
      setUserInfoModalId(userId);
    }
  };

  const handlePasteContextMenuClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Insert text at cursor position
        if (textareaRef.current) {
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          const newText = inputText.substring(0, start) + text + inputText.substring(end);
          setInputText(newText);

          // Reset cursor position after insertion
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
              textareaRef.current.focus();
            }
          }, 0);
        } else {
          setInputText(prev => prev + text);
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const inputMenuItems: ContextMenuItem[] = [
    {
      label: 'Paste',
      icon: <ClipboardPaste className="w-4 h-4" />,
      onClick: handlePasteContextMenuClick
    }
  ];

  const [inputHeight, setInputHeight] = useState(120);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Unread badge state
  const [floatingUnreadCount, setFloatingUnreadCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const lastActiveChatIdRef = useRef<number | null>(null);
  const lastProcessedMsgIdRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find current conversation metadata
  const currentConversation = conversations.find(c => c.conversation_id === activeChatId);

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
    // activeChatId is now strictly conversation_id
    sendMessage(activeChatId, inputText, "text", quotingMessage?.msg_id);
    setInputText('');
    setQuotingMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const restoredChatIdRef = useRef<number | null>(null);

  // Handle restoring scroll position without flicker
  // We use a layout effect so it happens synchronously after DOM mutations
  React.useLayoutEffect(() => {
    if (!activeChatId || activeMessages.length === 0) return;

    // Only restore scroll if we haven't already restored it for this chat
    if (restoredChatIdRef.current === activeChatId) return;

    const restoreScroll = () => {
      const savedScroll = localStorage.getItem(`chat_scroll_${activeChatId}`);
      if (savedScroll === 'bottom' || !savedScroll) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      } else if (savedScroll && messagesContainerRef.current) {
        // Only set it if it's different to avoid loops
        const targetScroll = parseInt(savedScroll, 10);
        if (messagesContainerRef.current.scrollTop !== targetScroll) {
            messagesContainerRef.current.scrollTop = targetScroll;
        }
      }
      restoredChatIdRef.current = activeChatId;
    };

    // If history is not loading, it means messages are ready to be scrolled
    if (!isLoadingHistory) {
      restoreScroll();
    }
  }, [activeChatId, activeMessages.length, isLoadingHistory]);

  // Initial Load History (Triggered by Conversation Change)
  useEffect(() => {
    if (!activeChatId) return;

    // Only fetch if we don't have messages yet
    if (!messagesMap[activeChatId] || messagesMap[activeChatId].length === 0) {
      setIsLoadingHistory(true);
      loadMessageHistory(activeChatId, undefined, 30).then((data) => {
        setHasMoreHistory(data.length === 30);
        setIsLoadingHistory(false);
      }).catch((e) => {
        console.error("Failed to load history:", e);
        setIsLoadingHistory(false);
      });
    }
  }, [activeChatId, loadMessageHistory, messagesMap]); // Only run when chat ID changes

  // Scroll down smoothly on new messages if at bottom
  useEffect(() => {
    // Only smooth scroll if we are staying in the SAME chat and a NEW message arrives
    // We check lastActiveChatIdRef to avoid scrolling on chat switch
    if (activeChatId === lastActiveChatIdRef.current && isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages, activeChatId]);

  // Handle incoming messages and read acks
  useEffect(() => {
    if (activeChatId !== lastActiveChatIdRef.current) {
      // Switched to a new chat
      lastActiveChatIdRef.current = activeChatId;
      setFloatingUnreadCount(0);

      // If there's an unread count upon opening the chat, clear it immediately
      if (currentConversation && currentConversation.unread_count > 0 && activeMessages.length > 0) {
        const lastMsg = activeMessages[activeMessages.length - 1];
        if (lastMsg.msg_id) {
          markAsRead(activeChatId, lastMsg.msg_id);
        }
      }
    } else {
      // Same chat, handle new messages
      if (activeMessages.length > 0) {
        const lastMsg = activeMessages[activeMessages.length - 1];

        if (lastMsg.msg_id && lastProcessedMsgIdRef.current !== lastMsg.msg_id) {
          lastProcessedMsgIdRef.current = lastMsg.msg_id;

          // Ensure the message isn't sent by us to avoid read-acking our own outgoing messages
          if (lastMsg.sender_id?.toString() !== currentUserId) {
             if (isAtBottomRef.current) {
               // We are at the bottom, mark as read immediately
               markAsRead(activeChatId, lastMsg.msg_id);
             } else {
               // We are not at the bottom, and we received a new message that we didn't read
               setFloatingUnreadCount(prev => prev + 1);
             }
          }
        }
      }
    }
  }, [activeChatId, activeMessages, currentConversation, currentUserId, markAsRead]);

  // Set up an IntersectionObserver on the 25th message to pre-fetch infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoadingHistory || !hasMoreHistory || activeMessages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingHistory && hasMoreHistory) {
          const fetchMore = async () => {
            setIsLoadingHistory(true);
            const oldestMsg = activeMessages[0];
            const cursorId = oldestMsg?.msg_id;
            const prevScrollHeight = messagesContainerRef.current?.scrollHeight || 0;

            try {
              // Note: loadMessageHistory modifies state directly
              const olderData = await loadMessageHistory(activeChatId, cursorId, 30);
              setHasMoreHistory(olderData.length === 30);

              if (olderData.length > 0) {
                setTimeout(() => {
                  if (messagesContainerRef.current) {
                    const newScrollHeight = messagesContainerRef.current.scrollHeight;
                    messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
                  }
                }, 0);
              }
            } catch (error) {
              console.error("Failed to load more history:", error);
            } finally {
              setIsLoadingHistory(false);
            }
          };
          fetchMore();
        }
      },
      { root: messagesContainerRef.current, threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [activeChatId, activeMessages, isLoadingHistory, hasMoreHistory, loadMessageHistory]);

  return (
    <div className="flex-1 h-full bg-primary flex flex-col min-w-[400px] relative">
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
      <div
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        ref={messagesContainerRef}
        onScroll={() => {
          if (!messagesContainerRef.current) return;
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;

          const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
          isAtBottomRef.current = isAtBottom;

          // Save scroll position for this chat on scroll, but debounce or throttle it slightly
          if (activeChatId) {
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
              if (!messagesContainerRef.current) return;
              if (isAtBottomRef.current) { // Use ref to get the latest value
                localStorage.setItem(`chat_scroll_${activeChatId}`, 'bottom');
              } else {
                localStorage.setItem(`chat_scroll_${activeChatId}`, messagesContainerRef.current.scrollTop.toString());
              }
            }, 100);
          }

          if (isAtBottom && floatingUnreadCount > 0) {
            setFloatingUnreadCount(0);
            if (activeMessages.length > 0) {
              const lastMsg = activeMessages[activeMessages.length - 1];
              if (lastMsg.msg_id) {
                markAsRead(activeChatId, lastMsg.msg_id);
              }
            }
          }
        }}
      >
        {isLoadingHistory && (
          <div className="flex justify-center text-xs text-secondary py-2">
            Loading...
          </div>
        )}
        {activeMessages.length === 0 ? (
          <div className="flex justify-center mt-10">
            <span className="text-xs bg-secondary text-secondary px-3 py-1 rounded">No messages yet.</span>
          </div>
        ) : (
          activeMessages.map((msg, idx) => {
            const prevMsg = activeMessages[idx - 1];

            // Ensure we use the server_time (create_time) or fallback to local generation time
            // The prompt says "msg.create_time || msg.timestamp" but useChat defines `create_time`.
            // Let's use `create_time` or fallback to `msg_id` if it's derived from timestamp, or local generation time.
            // Ensure we use the server_time (create_time) or fallback to local generation time
            const currTime = msg.create_time || new Date().toISOString();
            const prevTime = prevMsg ? (prevMsg.create_time || new Date().toISOString()) : undefined;

            const showTime = shouldShowTimeBubble(prevTime, currTime);

            // The 25th element from the end of the loaded chunk acts as the infinite scroll trigger.
            // But since older messages are at index 0, we can just observe index ~19 (or 0 if array < 25)
            // Wait, we prepend older messages. If array length > 25, observe index 19. Otherwise index 0.
            const thresholdIndex = activeMessages.length > 25 ? 19 : 0;
            const isThresholdNode = idx === thresholdIndex;

            // LocalMessage has sender_id directly at top level
            const isMe = msg.sender_id?.toString() === currentUserId;

            let parsedContent = msg.msg_content;
            if (parsedContent && typeof parsedContent === 'string' && parsedContent.startsWith('{')) {
              try {
                const parsedObj = JSON.parse(parsedContent);
                parsedContent = parsedObj.content || parsedContent;
              } catch (e) {
                // Ignore parse errors, fallback to raw string
              }
            }

            return (
              <React.Fragment key={msg.msg_id || msg.local_id || idx}>
                {showTime && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                      {formatMessageBubbleTime(currTime)}
                    </span>
                  </div>
                )}

                <div ref={isThresholdNode ? observerTarget : null} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 ${msg.isFailed ? 'opacity-50' : ''}`}>
                {!isMe && (
                  <div className="flex flex-col items-center mr-3">
                    <span className="text-[10px] text-secondary mb-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px]">{activeChatName || msg.sender_id}</span>
                    <div
                      className="w-9 h-9 bg-gray-300 rounded flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleAvatarClick(msg.sender_id)}
                    >
                      {msg.sender_id === -1 ? (
                         <img src="https://api.dicebear.com/7.x/bottts/svg?seed=System" alt="system" className="w-full h-full object-cover" />
                      ) : activeChatAvatar ? (
                         <img src={formatAvatarUrl(activeChatAvatar)!} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-500 font-bold opacity-50">{activeChatName?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </div>
                )}

                <div
                  onContextMenu={(e) => handleMsgRightClick(e, msg)}
                  className={`max-w-[70%] ${isMe ? 'bg-bubble-self text-primary' : 'bg-bubble-other text-primary'} rounded p-2.5 shadow-sm border ${isMe ? 'border-primary' : 'border-primary'} relative ${!isMe ? 'mt-4' : ''}`}
                >
                  {/* Tiny triangle pointer */}
                  <div className={`absolute top-3 w-0 h-0 border-y-[6px] border-y-transparent ${isMe
                    ? 'right-[-6px] border-l-[6px] border-l-[#95EC69] dark:border-l-[#2B2B2B]'
                    : 'left-[-6px] border-r-[6px] border-r-white dark:border-r-[#202020]'
                    }`} />

                  {msg.quote_msg_id && (
                    <div
                      className="bg-primary/10 border-l-2 border-primary/30 pl-2 py-1 mb-2 text-xs text-secondary opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const targetEl = document.getElementById(`msg-${msg.quote_msg_id}`);
                        if (targetEl) {
                          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Add a brief highlight effect
                          targetEl.style.transition = 'background-color 0.5s';
                          targetEl.style.backgroundColor = 'var(--bg-secondary)';
                          setTimeout(() => {
                            targetEl.style.backgroundColor = '';
                          }, 1500);
                        }
                      }}
                    >
                      回复: {(() => {
                        const quotedMsg = quotedMessagesMap.get(msg.quote_msg_id!);
                        if (!quotedMsg) return 'not in local storage';

                        let qContent = quotedMsg.msg_content || '';
                        if (qContent.startsWith('{')) {
                          try {
                            const parsed = JSON.parse(qContent);
                            qContent = parsed.content || qContent;
                          } catch (e) {
                            // Ignored intentionally
                          }
                        }
                        return `${quotedMsg.sender_id === Number(currentUserId) ? '我' : quotedMsg.sender_id}: ${qContent}`;
                      })()}
                    </div>
                  )}

                  <p className="text-primary text-base leading-relaxed whitespace-pre-wrap word-break">
                    {parsedContent}
                  </p>

                  {(msg.quote_num ?? 0) > 0 && (
                    <div className="mt-1 text-[10px] text-secondary opacity-80 flex items-center">
                      <MessageSquareQuote className="w-3 h-3 mr-1" />
                      被引用 {msg.quote_num} 次
                    </div>
                  )}

                  {msg.isSending && <span className="absolute bottom-[-15px] right-0 text-[10px] text-tertiary">Sending...</span>}
                  {msg.isFailed && <span className="absolute bottom-[-15px] right-0 text-[10px] text-danger">Failed</span>}
                </div>

                {isMe && (
                  <div className="w-9 h-9 bg-gray-300 rounded flex-shrink-0 ml-3 mt-1 flex items-center justify-center overflow-hidden">
                    {currentUserAvatar ? (
                      <img src={formatAvatarUrl(currentUserAvatar)!} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-[var(--sidebar-text)] w-6 h-6" />
                    )}
                  </div>
                )}
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Unread Badge */}
      {floatingUnreadCount > 0 && (
        <div className="absolute right-6" style={{ bottom: `${inputHeight + 20}px` }}>
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              // It will automatically read and hide on the next scroll event
            }}
            className="flex items-center space-x-1 px-4 py-2 bg-white dark:bg-gray-800 text-[#07C160] rounded-full shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 font-medium text-sm z-20 cursor-pointer"
          >
            <ChevronsDown className="w-4 h-4 text-[#07C160]" />
            <span>{floatingUnreadCount}条新消息</span>
          </button>
        </div>
      )}

      {/* Vertical Drag handle */}
      <div
        className="h-1 cursor-row-resize hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-blue-500 transition-colors z-10 shrink-0"
        onMouseDown={() => setIsResizingVertical(true)}
      />

      <ContextMenu
        x={msgXPos}
        y={msgYPos}
        show={showMsgMenu}
        onClose={() => setShowMsgMenu(false)}
        items={msgMenuItems}
      />


      <UserInfoModal
        userId={userInfoModalId!}
        isOpen={userInfoModalId !== null}
        onClose={() => setUserInfoModalId(null)}
      />

      {/* Input Area */}
      <div
        style={{ height: `${inputHeight}px` }}
        className="bg-primary border-t border-primary flex flex-col shrink-0 px-4 pt-3 pb-3 transition-colors relative"
      >
        {/* Quote Preview */}
        {quotingMessage && (
          <div className="absolute top-[-40px] left-0 right-0 h-[40px] bg-secondary border-t border-primary flex items-center px-4 justify-between shadow-sm">
            <span className="text-xs text-secondary truncate flex-1">
              回复 {quotingMessage.sender_id === -1 ? 'System' : (quotingMessage.sender_id?.toString() === currentUserId ? '自己' : activeChatName || quotingMessage.sender_id)}: {quotingMessage.msg_content}
            </span>
            <button onClick={() => setQuotingMessage(null)} className="ml-2 p-1 hover:bg-hover rounded-full">
              <X className="w-4 h-4 text-tertiary" />
            </button>
          </div>
        )}
        {/* Text Area */}
        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent border-none outline-none resize-none text-primary text-base"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onContextMenu={(e) => {
             e.preventDefault();
             handleInputContextMenu(e);
          }}
        />

        <ContextMenu
          x={inputXPos}
          y={inputYPos}
          show={showInputMenu}
          onClose={() => setShowInputMenu(false)}
          items={inputMenuItems}
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
