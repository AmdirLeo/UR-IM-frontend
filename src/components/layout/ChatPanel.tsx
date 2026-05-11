import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, User, Search } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { ChevronsDown, ClipboardPaste, MessageSquareQuote, Trash2, X, RefreshCw } from 'lucide-react';
import { MessageSearchModal } from './MessageSearchModal';
import { useContextMenu } from '../common/ContextMenu/useContextMenu';
import { ContextMenu, ContextMenuItem } from '../common/ContextMenu/ContextMenu';
import { LocalMessage } from '../../hooks/useChat';
import { UserInfoModal } from './UserInfoModal';
import { GroupInfoPanel } from './GroupInfoPanel';
import { GroupAnnouncementsListModal } from './GroupAnnouncementsListModal';
import { getGroupInfo, getGroupMembers, GroupInfoData, GroupMember } from '../../api/group';
import { formatMessageBubbleTime, shouldShowTimeBubble } from '../../utils/timeFormat';
import { RemoveFriendModal } from './RemoveFriendModal';
import { useContactContext } from '../../context/ContactContext';
import { removeFriend } from '../../api/friend';

interface ChatPanelProps {
  activeChatId: number;
  currentUserId: string;
  isConnected: boolean;
  sendMessage: (conversationId: number, content: string, type?: "text" | "image" | "card" | "notify", quoteMsgId?: number, existingLocalId?: string) => void;
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

  // Search state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Group Info Panel state
  const [isGroupInfoPanelOpen, setIsGroupInfoPanelOpen] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfoData | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isAnnouncementBannerVisible, setIsAnnouncementBannerVisible] = useState(true);
  const [isAnnouncementsListOpen, setIsAnnouncementsListOpen] = useState(false);

  // Header Dropdown state
  const { xPos: headerXPos, yPos: headerYPos, showMenu: showHeaderMenu, setShowMenu: setShowHeaderMenu, handleContextMenu: handleHeaderContextMenu } = useContextMenu();
  const [isRemoveFriendModalOpen, setIsRemoveFriendModalOpen] = useState(false);

  const { friends, removeFriendState } = useContactContext();

  useEffect(() => {
    if (activeChatId) {
      // Reset banner state when switching chats
      setIsAnnouncementBannerVisible(true);

      const conv = conversations.find(c => c.conversation_id === activeChatId);

      if (conv?.type === 'group' && conv.status !== 'abnormal') {
        getGroupInfo({ conversation_id: activeChatId }).then(res => {
          if (res.code === 200 && res.data) {
            setGroupInfo(res.data);
            if (res.data.latest_announcement) {
              const closed = localStorage.getItem(`closed_announcement_${res.data.latest_announcement.announcement_id}`);
              if (closed === 'true') {
                setIsAnnouncementBannerVisible(false);
              }
            }
          }
        }).catch(() => console.log('非群成员，跳过获取群信息')); // 捕获错误，保持控制台干净

        getGroupMembers({ conversation_id: activeChatId }).then(res => {
          if (res.code === 200 && res.data) {
            setGroupMembers(res.data.list || []);
          }
        }).catch(console.error);
      } else {
        setGroupInfo(null);
        setGroupMembers([]);
      }
    }
  }, [activeChatId]); // Removed conversations from deps to avoid re-fetching on every new message

  // Find current conversation metadata
  const currentConversation = conversations.find(c => c.conversation_id === activeChatId);
  const isGroupChat = currentConversation?.type === 'group';

  // Check if current private chat target is still a friend
  const targetUserId = currentConversation?.target_id || currentConversation?.target_user_id || currentConversation?.last_msg_sender_id;
  const isFriend = React.useMemo(() => {
    if (isGroupChat) return true;
    if (!targetUserId) return false;
    return friends.some(f => f.user_id === targetUserId);
  }, [friends, isGroupChat, targetUserId]);

  const headerMenuItems: ContextMenuItem[] = React.useMemo(() => {
    const items: ContextMenuItem[] = [];
    if (!isGroupChat && isFriend) {
      items.push({
        label: '删除好友',
        icon: <Trash2 className="w-4 h-4 text-red-500" />,
        danger: true,
        onClick: () => setIsRemoveFriendModalOpen(true)
      });
    }
    return items;
  }, [isGroupChat, isFriend]);

  const handleRemoveFriendConfirm = async (deleteHistory: boolean) => {
    if (targetUserId) {
      await removeFriend(targetUserId, deleteHistory);
      removeFriendState(targetUserId);

      // If we are deleting history, optionally we might want to trigger `removeMessagesWithUser`
      // For now we'll emit a custom event to notify Sidebar/ChatList or let WebSocket sync handle it.
      window.dispatchEvent(new CustomEvent('friendRemoved', { detail: { friendId: targetUserId } }));

      // If deleteHistory is true, we should also clear the chat messages locally for immediate feedback
      if (deleteHistory) {
         // Optionally you can clear local messages here
      }
    }
  };

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

    const items: ContextMenuItem[] = [
      {
        label: '引用',
        icon: <MessageSquareQuote className="w-4 h-4" />,
        onClick: () => setQuotingMessage(activeContextMenuMsg)
      }
    ];

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

    return items;
  }, [activeContextMenuMsg, contextMenuMsgId, deleteChatMessage, activeChatId]);


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
          const availableSpace = 500 - (inputText.length - (end - start));
          let textToInsert = text;
          if (textToInsert.length > availableSpace) {
            alert('最多只能输入500个字符，超出部分已被截断。');
            textToInsert = textToInsert.substring(0, availableSpace);
          }
          const newText = inputText.substring(0, start) + textToInsert + inputText.substring(end);
          setInputText(newText);

          // Reset cursor position after insertion
          setTimeout(() => {
            if (textareaRef.current) {
              const newPos = Math.min(start + textToInsert.length, 500);
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
              textareaRef.current.focus();
            }
          }, 0);
        } else {
          const availableSpace = 500 - inputText.length;
          let textToInsert = text;
          if (textToInsert.length > availableSpace) {
            alert('最多只能输入500个字符，超出部分已被截断。');
            textToInsert = textToInsert.substring(0, availableSpace);
          }
          const newText = inputText + textToInsert;
          setInputText(newText);
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

    const conv = conversations.find(c => c.conversation_id === activeChatId);
    if (conv?.status === 'abnormal') return;

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

  useEffect(() => {
    const handleRefreshGroupInfo = () => {
      if (!activeChatId) return;
      getGroupInfo({ conversation_id: activeChatId }).then(res => {
        if (res.code === 200 && res.data) {
          setGroupInfo(res.data);
          setIsAnnouncementBannerVisible(true); // 强制显示新公告
        }
      });
    };
    
    window.addEventListener('refresh_group_info', handleRefreshGroupInfo);
    return () => window.removeEventListener('refresh_group_info', handleRefreshGroupInfo);
  }, [activeChatId]);

  // 监听实时公告消息，动态更新顶部 Banner
  useEffect(() => {
    if (!isGroupChat || activeMessages.length === 0) return;
    const latestMsg = activeMessages[activeMessages.length - 1];

    if (latestMsg.msg_type === 'notify') {
      let parsedAnnouncement: any = null;
      try {
        const tempParsed = JSON.parse(latestMsg.msg_content);
        if (tempParsed.extra && tempParsed.extra.action === 'group_announcement') {
          parsedAnnouncement = tempParsed.extra;
        } else if (tempParsed.action === 'group_announcement') {
          parsedAnnouncement = tempParsed;
        }
      } catch (e) {
        if ((latestMsg as any).extra_data?.action === 'group_announcement') {
          parsedAnnouncement = (latestMsg as any).extra_data;
        }
      }

      if (parsedAnnouncement) {
        setGroupInfo(prev => {
          if (!prev) return prev;
          // 如果是新的公告（对比 ID），更新数据并重新展示 Banner
          if (prev.latest_announcement?.announcement_id !== parsedAnnouncement.announcement_id) {
            setIsAnnouncementBannerVisible(true);
            return { ...prev, latest_announcement: parsedAnnouncement };
          }
          return prev;
        });
      }
    }
  }, [activeMessages, isGroupChat]);

  // ======= 新增：引用消息跳转与历史溯源逻辑 =======
  const jumpToQuotedMessage = async (targetMsgId: number) => {
    // 内部高亮动画方法
    const highlightMessage = (el: HTMLElement) => {
      el.style.transition = 'background-color 0.5s';
      el.style.backgroundColor = 'var(--bg-secondary)';
      setTimeout(() => {
        el.style.backgroundColor = '';
      }, 1500);
    };

    // 1. 尝试在当前 DOM 查找
    let targetEl = document.getElementById(`msg-${targetMsgId}`);

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightMessage(targetEl);
    } else {
      // 2. 找不到，说明在更早的历史记录里，需要递归向上拉取
      setIsLoadingHistory(true);
      try {
        let found = false;
        // 拿到当前屏幕上最老的一条消息作为初始游标
        let currentCursor = activeMessages[0]?.msg_id;
        let currentHasMore = hasMoreHistory;

        // 循环拉取直到找到该 ID 或没有更多历史
        while (!found && currentHasMore) {
          // 这里使用 30，与你下方的 observer 加载数量保持一致
          const olderData = await loadMessageHistory(activeChatId, currentCursor, 30);
          if (!olderData || olderData.length === 0) {
            setHasMoreHistory(false);
            break;
          }

          // loadMessageHistory 返回的数组最后一条是最老的消息
          currentCursor = olderData[olderData.length - 1].msg_id;
          currentHasMore = olderData.length === 30;
          setHasMoreHistory(currentHasMore);

          found = olderData.some((m: LocalMessage) => m.msg_id === targetMsgId);

          // ⚠️ 关键点：给 React 状态更新和 DOM 重新渲染留出足够的时间
          await new Promise(resolve => setTimeout(resolve, 150));

          targetEl = document.getElementById(`msg-${targetMsgId}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'auto', block: 'center' });
            highlightMessage(targetEl);
            found = true;
          }
        }
      } catch (error) {
        console.error("Jump to message failed:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    }
  };
  
  let quotingPreviewText = quotingMessage?.msg_content || '';
  if (quotingPreviewText.startsWith('{')) {
    try {
      const parsed = JSON.parse(quotingPreviewText);
      quotingPreviewText = parsed.content || quotingPreviewText;
    } catch (e) {
      /* ignore */
    }
  }

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
          <Search
            className="w-5 h-5 ml-2 hover:text-primary cursor-pointer transition-colors"
            onClick={() => setIsSearchModalOpen(true)}
          />
          <MoreHorizontal
            className="w-5 h-5 ml-2 hover:text-primary cursor-pointer"
            onClick={(e) => {
               if (isGroupChat) {
                 setIsGroupInfoPanelOpen(true);
               } else if (headerMenuItems.length > 0) {
                 handleHeaderContextMenu(e as unknown as React.MouseEvent);
               }
            }}
          />
        </div>
      </div>

      <ContextMenu
        x={headerXPos}
        y={headerYPos}
        show={showHeaderMenu}
        onClose={() => setShowHeaderMenu(false)}
        items={headerMenuItems}
      />

      <RemoveFriendModal
        isOpen={isRemoveFriendModalOpen}
        onClose={() => setIsRemoveFriendModalOpen(false)}
        onConfirm={handleRemoveFriendConfirm}
        friendName={activeChatName}
      />

      <MessageSearchModal
        conversationId={activeChatId}
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        isGroupChat={isGroupChat}
      />

      <GroupInfoPanel
        conversationId={activeChatId}
        isOpen={isGroupInfoPanelOpen}
        onClose={() => setIsGroupInfoPanelOpen(false)}
        onSearchClick={() => setIsSearchModalOpen(true)}
      />

      {isGroupChat && groupInfo?.latest_announcement && isAnnouncementBannerVisible && (
        <div className="bg-brand/10 border-b border-brand/20 px-4 py-2 flex items-start justify-between shrink-0">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setIsAnnouncementsListOpen(true)}
          >
            <div className="flex items-center text-brand text-xs font-medium mb-1">
              <span className="mr-2">群公告</span>
            </div>
            <p className="text-sm text-primary line-clamp-2">{groupInfo.latest_announcement.content}</p>
          </div>
          <button
            onClick={() => {
              setIsAnnouncementBannerVisible(false);
              localStorage.setItem(`closed_announcement_${groupInfo.latest_announcement!.announcement_id}`, 'true');
            }}
            className="ml-4 p-1 hover:bg-brand/10 rounded text-secondary hover:text-primary transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <GroupAnnouncementsListModal
        isOpen={isAnnouncementsListOpen}
        onClose={() => setIsAnnouncementsListOpen(false)}
        conversationId={activeChatId}
        canPublish={groupInfo?.my_role === 'owner' || groupInfo?.my_role === 'admin'}
        onPublishNewClick={() => {
           // For ChatPanel we just close it, let them use GroupInfoPanel to publish or we can add GroupAnnouncementModal here too if needed.
           // Since requirements said "click to view details", this list is enough. If they click "Publish New", we can ignore or we need to add the modal.
           // It's cleaner to just not support "publish new" from the banner directly to save complexity,
           // but since we reuse the list modal, we'll pass a dummy or implement it. Let's just implement it later if needed.
           setIsAnnouncementsListOpen(false);
           alert("请从右上角「查看群聊信息」进入发布新公告");
        }}
      />

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

            // Handle group announcement rendering
            let parsedAnnouncement: any = null;
            if (msg.msg_type === 'notify') {
              try {
                // Try parsing msg_content to see if it has the extra_data structure encoded inside it
                // Or if we already have it in some extra field in msg
                const tempParsed = JSON.parse(msg.msg_content);
                if (tempParsed.extra && tempParsed.extra.action === 'group_announcement') {
                    parsedAnnouncement = tempParsed.extra;
                } else if ((msg as Record<string, any>).extra_data?.action === 'group_announcement') {
                    parsedAnnouncement = (msg as Record<string, any>).extra_data;
                } else if (tempParsed.action === 'group_announcement') {
                    parsedAnnouncement = tempParsed;
                }
              } catch (e) {
                // If it's already an object somehow or not parseable, try checking directly
                if ((msg as Record<string, any>).extra_data?.action === 'group_announcement') {
                    parsedAnnouncement = (msg as Record<string, any>).extra_data;
                }
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

                {parsedAnnouncement ? (
                   <div 
                     id={`msg-${msg.msg_id || msg.local_id}`} 
                     ref={isThresholdNode ? observerTarget : null} 
                     className="flex justify-center mb-4"
                   >
                     <div className="bg-secondary/50 border border-brand/20 px-4 py-2 flex flex-col rounded-lg max-w-[80%] text-center">
                        <span className="text-brand text-xs font-semibold mb-1">📢 群公告</span>
                        <span className="text-xs text-primary">{parsedAnnouncement.content}</span>
                     </div>
                   </div>
                ) : (
                  <div 
                    id={`msg-${msg.msg_id || msg.local_id}`} 
                    ref={isThresholdNode ? observerTarget : null} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 ${msg.isFailed ? 'opacity-50' : ''}`}
                  >
                  {!isMe && (
                    <div className="flex flex-col items-center mr-3">
                      {/* 1. 渲染名字 */}
                      <div className="flex items-center space-x-1 mb-1 max-w-[100px]">
                        <span className="text-[10px] text-secondary whitespace-nowrap overflow-hidden text-ellipsis">
                          {msg.sender_id === -1 ? "系统通知" :
                          msg.sender_id === -2 ? "群助手" :
                          (isGroupChat ?
                            (friends.find(f => f.user_id === msg.sender_id)?.username || `User ${msg.sender_id}`)
                            : (activeChatName || msg.sender_id)
                          )}
                        </span>
                        {isGroupChat && groupMembers && (
                          (() => {
                            const role = groupMembers.find(m => m.user_id === msg.sender_id)?.role;
                            if (role === 'owner') return <span className="text-[8px] bg-yellow-500 text-white px-1 rounded">Owner</span>;
                            if (role === 'admin') return <span className="text-[8px] bg-blue-500 text-white px-1 rounded">Admin</span>;
                            return null;
                          })()
                        )}
                      </div>

                      {/* 2. 渲染头像 */}
                      <div
                        className="w-9 h-9 bg-gray-300 rounded flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handleAvatarClick(msg.sender_id)}
                      >
                        {msg.sender_id === -1 ? (
                          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=System" alt="system" className="w-full h-full object-cover" />
                        ) : msg.sender_id === -2 ? (
                          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=GroupBot" alt="bot" className="w-full h-full object-cover" />
                        ) : isGroupChat ? (
                          // --- 【群聊逻辑】：去好友列表找这个发送者的真实头像 ---
                          (() => {
                            const senderFriend = friends.find(f => f.user_id === msg.sender_id);
                            if (senderFriend && senderFriend.avatar_url) {
                              return <img src={formatAvatarUrl(senderFriend.avatar_url)!} alt="avatar" className="w-full h-full object-cover" />
                            }
                            // 如果群友没头像或不是好友，用名字首字母兜底
                            const fallbackName = senderFriend ? senderFriend.username : `U`;
                            return <span className="text-gray-500 font-bold text-lg opacity-50">{fallbackName.charAt(0).toUpperCase()}</span>
                          })()
                        ) : activeChatAvatar ? (
                          // --- 【单聊逻辑】：使用传进来的对方头像 ---
                          <img src={formatAvatarUrl(activeChatAvatar)!} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-500 font-bold text-lg opacity-50">{activeChatName?.charAt(0) || '?'}</span>
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
                        onClick={() => jumpToQuotedMessage(msg.quote_msg_id!)}
                      >
                        回复: {(() => {
                          const quotedMsg = quotedMessagesMap[msg.quote_msg_id!];
                          if (!quotedMsg) return '正在加载原消息...'; // 状态改变后会自动变成真实内容

                          let qContent = quotedMsg.msg_content || '';
                          if (qContent.startsWith('{')) {
                            try {
                              const parsed = JSON.parse(qContent);
                              qContent = parsed.content || qContent;
                            } catch (e) {
                              /* Ignored intentionally */
                            }
                          }
                          return `${quotedMsg.sender_id === Number(currentUserId) ? '我' : (activeChatName || quotedMsg.sender_id)}: ${qContent}`;
                        })()}
                      </div>
                    )}

                    <p className="text-primary text-base leading-relaxed whitespace-pre-wrap break-words">
                      {parsedContent}
                    </p>

                    {(msg.quote_num ?? 0) > 0 && (
                      <div className="mt-1 text-[10px] text-secondary opacity-80 flex items-center">
                        <MessageSquareQuote className="w-3 h-3 mr-1" />
                        被引用 {msg.quote_num} 次
                      </div>
                    )}

                    {msg.isSending && <span className="absolute bottom-[-15px] right-0 text-[10px] text-tertiary">Sending...</span>}
                    {msg.isFailed && (
                      <button
                        onClick={() => sendMessage(activeChatId, msg.msg_content, msg.msg_type as "text" | "image" | "card" | "notify" | undefined, msg.quote_msg_id, msg.local_id)}
                        className="absolute top-1/2 -translate-y-1/2 left-[-28px] p-1 rounded-full bg-white dark:bg-gray-800 shadow hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                        title="发送失败，点击重发"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-danger group-hover:rotate-180 transition-transform duration-300" />
                      </button>
                    )}
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
                )}
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
        {currentConversation?.status === 'abnormal' || (!isGroupChat && !isFriend) ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-secondary">
              {isGroupChat ? '您已退出该群聊，无法发送消息。' : '您与对方已不是好友，无法发送消息。'}
            </span>
          </div>
        ) : (
          <>
            {/* Quote Preview */}
            {quotingMessage && (
              <div className="absolute top-[-40px] left-0 right-0 h-[40px] bg-secondary border-t border-primary flex items-center px-4 justify-between shadow-sm">
                <span className="text-xs text-secondary truncate flex-1">
                  回复 {quotingMessage.sender_id === -1 ? 'System' : (quotingMessage.sender_id?.toString() === currentUserId ? '自己' : activeChatName || quotingMessage.sender_id)}: {quotingPreviewText}
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
              maxLength={500}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                const start = textareaRef.current?.selectionStart || 0;
                const end = textareaRef.current?.selectionEnd || 0;
                const newLength = inputText.length - (end - start) + text.length;
                if (newLength > 500) {
                  alert('最多只能输入500个字符，超出部分已被截断。');
                }
              }}
              onKeyDown={handleKeyDown}
              onContextMenu={(e) => {
                 e.preventDefault();
                 handleInputContextMenu(e as unknown as React.MouseEvent);
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
            <div className="flex justify-between items-center mt-2">
              <div className={`text-xs ${inputText.length >= 500 ? 'text-danger' : 'text-secondary'}`}>
                {inputText.length}/500
              </div>
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || inputText.length > 500}
                className={`px-6 py-1.5 rounded text-[14px] font-medium transition-colors ${inputText.trim()
                  ? 'bg-secondary hover:bg-hover text-success'
                  : 'bg-secondary text-secondary border border-primary cursor-not-allowed'
                  }`}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
