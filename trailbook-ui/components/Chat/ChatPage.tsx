"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getMessagesWithUser,
  sendMessage,
  getConnectedPeople,
  type Message,
} from "@/lib/connectionsApi";
import { chatSocket, type ChatSocketEvents } from "@/lib/chatSocket";
import { resolveProfilePictureUrl, getMyProfile } from "@/lib/userApi";
import { getPublicUserProfile } from "@/lib/publicProfileApi";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";
import Image from "next/image";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const userId = params.userId as string;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatUserName, setChatUserName] = useState<string | null>(null);
  const [chatUserProfilePicture, setChatUserProfilePicture] = useState<string | null>(null);
  const [chatUserBio, setChatUserBio] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState<boolean | null>(null); // null = unknown, true = online, false = offline
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Load user profile information
  useEffect(() => {
    if (!userId) return;

    const loadUserInfo = async () => {
      try {
        // Try to get from connected users first (faster, more reliable)
        const connected = await getConnectedPeople();
        const connectedUser = connected.find(
          (conn) => conn.userId || conn.user?.userId || conn._id || conn.id === userId
        );

        if (connectedUser) {
          const userData = connectedUser.user || connectedUser;
          setChatUserName(userData.fullName || userData.name || "User");
          if (userData.profilePicture) {
            setChatUserProfilePicture(resolveProfilePictureUrl(userData.profilePicture));
          }
          if (userData.bio) {
            setChatUserBio(userData.bio);
          }
          return;
        }

        // Fallback to public profile API
        const profile = await getPublicUserProfile(userId);
        if (profile) {
          setChatUserName(profile.profile?.fullName || "User");
          if (profile.profile?.profilePicture) {
            setChatUserProfilePicture(resolveProfilePictureUrl(profile.profile.profilePicture));
          }
          if (profile.profile?.bio) {
            setChatUserBio(profile.profile.bio);
          }
        }
      } catch (err) {
        console.warn("Failed to load user info", err);
        // Set a fallback name
        setChatUserName(`User ${userId.slice(-6)}`);
      }
    };

    loadUserInfo();
  }, [userId]);

  // Get current user ID
  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        setCurrentUserId(profile.user._id);
      })
      .catch((err) => {
        console.warn("Failed to get current user profile", err);
      });
  }, []);

  // WebSocket and messages setup
  useEffect(() => {
    if (!userId) {
      router.push("/connections");
      return;
    }

    // Connect to socket
    const socket = chatSocket.connect();
    if (socket) {
      setSocketConnected(socket.connected);
      console.log("[Chat] Socket connection status:", socket.connected);
      
      // Set up direct socket listeners for connection status
      socket.on("connect", () => {
        setSocketConnected(true);
        console.log("[Chat] WebSocket connected");
        // Assume other user is online when we connect (will be updated by events)
        setOtherUserOnline(true);
        // Notify other user that we're online when we connect
        if (userId) {
          chatSocket.notifyUserOnline(userId);
        }
      });

      socket.on("disconnect", () => {
        setSocketConnected(false);
        setOtherUserOnline(false); // Assume offline when disconnected
        console.log("[Chat] WebSocket disconnected");
        // Notify other user that we're offline
        if (userId) {
          chatSocket.notifyUserOffline(userId);
        }
      });
    }

    const handleConnected: ChatSocketEvents["connected"] = () => {
      setSocketConnected(true);
      console.log("[Chat] WebSocket connected (via event)");
    };

    const handleDisconnect: ChatSocketEvents["disconnect"] = () => {
      setSocketConnected(false);
      console.log("[Chat] WebSocket disconnected (via event)");
    };
    
    chatSocket.on("connected", handleConnected);
    chatSocket.on("disconnect", handleDisconnect);

    // Load initial messages (latest) - will be called via useEffect below

    // Set up socket listeners
    const handleNewMessage: ChatSocketEvents["new_message"] = (data) => {
      const message = data.message;
      console.log("[Chat] New message event received:", message, "currentUserId:", currentUserId, "userId:", userId);
      
      // Check if message is between current user and the chat user
      // If currentUserId is not yet loaded, check if message involves userId
      const isRelevantMessage = currentUserId
        ? ((message.senderId === userId && message.receiverId === currentUserId) ||
           (message.senderId === currentUserId && message.receiverId === userId))
        : (message.senderId === userId || message.receiverId === userId);
      
      if (isRelevantMessage) {
        console.log("[Chat] Adding message to chat:", message);
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m._id === message._id)) {
            console.log("[Chat] Message already exists, skipping");
            return prev;
          }
          const updated = [...prev, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          console.log("[Chat] Messages updated, total:", updated.length);
          return updated;
        });
        scrollToBottom();
        // Mark as read if message is from the other user
        if (currentUserId && message.senderId === userId && message.receiverId === currentUserId) {
          chatSocket.markAsRead(userId);
        }
      } else {
        console.log("[Chat] Message not relevant to this conversation");
      }
    };

    const handleMessageSent: ChatSocketEvents["message_sent"] = (data) => {
      const message = data.message;
      // Check if message is for this conversation
      const isRelevantMessage = 
        (message.senderId === currentUserId && message.receiverId === userId) ||
        (message.senderId === userId && message.receiverId === currentUserId);
      
      if (isRelevantMessage) {
        console.log("[Chat] Message sent confirmation:", message);
        setMessages((prev) => {
          // Remove temp message if exists
          const filtered = prev.filter((m) => !m._id.startsWith("temp-"));
          // Avoid duplicates
          if (filtered.some((m) => m._id === message._id)) {
            return filtered;
          }
          return [...filtered, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
        setSending(false);
        scrollToBottom();
      }
    };

    const handleTyping: ChatSocketEvents["user_typing"] = (data) => {
      console.log("[Chat] Typing indicator:", data);
      // userId in the event is the user who is typing
      // We want to show typing when the other user (userId) is typing
      if (data.userId === userId) {
        setTyping(data.isTyping);
        // Auto-hide typing after 3 seconds
        if (data.isTyping) {
          setTimeout(() => {
            setTyping(false);
          }, 3000);
        }
      }
    };

    const handleUserOffline: ChatSocketEvents["user_offline"] = (data) => {
      console.log("[Chat] User went offline:", data);
      if (data.userId === userId) {
        setOtherUserOnline(false);
      }
    };

    const handleUserOnline: ChatSocketEvents["user_online"] = (data) => {
      console.log("[Chat] User came online:", data);
      if (data.userId === userId) {
        setOtherUserOnline(true);
      }
    };

    chatSocket.on("new_message", handleNewMessage);
    chatSocket.on("message_sent", handleMessageSent);
    chatSocket.on("user_typing", handleTyping);
    chatSocket.on("user_offline", handleUserOffline);
    chatSocket.on("user_online", handleUserOnline);

    return () => {
      console.log("[Chat] Cleaning up socket listeners and disconnecting");
      
      // Notify other user that we're going offline before disconnecting
      if (userId && socket?.connected) {
        chatSocket.notifyUserOffline(userId);
      }
      
      chatSocket.off("new_message", handleNewMessage);
      chatSocket.off("message_sent", handleMessageSent);
      chatSocket.off("user_typing", handleTyping);
      chatSocket.off("user_offline", handleUserOffline);
      chatSocket.off("user_online", handleUserOnline);
      chatSocket.off("connected", handleConnected);
      chatSocket.off("disconnect", handleDisconnect);
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        // Disconnect the socket when leaving the chat
        socket.disconnect();
        console.log("[Chat] Socket disconnected on cleanup");
      }
    };
  }, [userId, router, currentUserId]);

  const loadMessages = useCallback(async (cursor?: string | null, append: boolean = false) => {
    if (!userId) return;

    try {
      if (append) {
        setLoadingOlder(true);
      } else {
        setLoading(true);
      }

      const response = await getMessagesWithUser(userId, cursor, 50, "before");
      
      if (append) {
        // Prepend older messages
        setMessages((prev) => [...(response.messages || []), ...prev]);
      } else {
        // Replace with new messages
        setMessages(response.messages || []);
      }

      setNextCursor(response.nextCursor || null);
      setHasMore(response.hasMore || false);
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoading(false);
      setLoadingOlder(false);
    }
  }, [userId]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore || !nextCursor) return;

    // Save current scroll position
    if (messagesContainerRef.current) {
      scrollPositionRef.current = messagesContainerRef.current.scrollHeight - messagesContainerRef.current.scrollTop;
    }

    await loadMessages(nextCursor, true);

    // Restore scroll position after loading
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight - scrollPositionRef.current;
      }
    }, 100);
  }, [loadingOlder, hasMore, nextCursor, loadMessages]);

  // Load initial messages when userId changes
  useEffect(() => {
    if (userId) {
      loadMessages(null, false);
    }
  }, [userId, loadMessages]);

  // Disconnect when page becomes hidden or user navigates away
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("[Chat] Page hidden, notifying offline");
        if (userId) {
          chatSocket.notifyUserOffline(userId);
        }
        chatSocket.disconnect();
        setSocketConnected(false);
      } else {
        // Reconnect when page becomes visible again
        console.log("[Chat] Page visible, reconnecting socket");
        const socket = chatSocket.connect();
        if (socket) {
          setSocketConnected(socket.connected);
          // Notify other user that we're back online
          if (userId) {
            setTimeout(() => {
              chatSocket.notifyUserOnline(userId);
            }, 500); // Small delay to ensure socket is fully connected
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      console.log("[Chat] Page unloading, notifying offline");
      if (userId) {
        chatSocket.notifyUserOffline(userId);
      }
      chatSocket.disconnect();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll to top for loading older messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Load more when scrolled near the top (within 200px)
      if (container.scrollTop < 200 && hasMore && !loadingOlder && nextCursor) {
        loadOlderMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingOlder, nextCursor, loadOlderMessages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      _id: tempId,
      senderId: currentUserId || "",
      receiverId: userId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Optimistically add message
    setMessages((prev) => [...prev, tempMessage]);
    setInput("");
    setSending(true);
    scrollToBottom();

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    chatSocket.sendTyping(userId, false);

    try {
      // Send via socket for real-time
      chatSocket.sendMessage(userId, content);

      // Also send via API as fallback
      try {
        const sentMessage = await sendMessage(userId, content);
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? sentMessage : m))
        );
      } catch (err) {
        console.warn("API send failed, but socket may have succeeded", err);
        // Remove temp message if API fails
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    } catch (err) {
      console.error("Failed to send message", err);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }

    // Send typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    chatSocket.sendTyping(userId, true);

    typingTimeoutRef.current = setTimeout(() => {
      chatSocket.sendTyping(userId, false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const isSameDay = (date1: string, date2: string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--theme-background)" }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-current border-t-transparent mb-4" />
          <p style={{ color: "var(--theme-text-secondary)" }}>Loading messages...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "var(--theme-background)" }}>
      {/* Premium Header */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl shadow-sm"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-backdrop)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full transition-all duration-200 hover:scale-110"
              style={{
                backgroundColor: "var(--theme-surface-hover)",
                color: "var(--theme-text-primary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            
            {userId && (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ClickableUserAvatar
                  userId={userId}
                  profilePicture={chatUserProfilePicture || undefined}
                  name={chatUserName || undefined}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1
                      className="text-base font-semibold truncate"
                      style={{ color: "var(--theme-text-primary)" }}
                    >
                      {chatUserName || "User"}
                    </h1>
                    {otherUserOnline === true && (
                      <div 
                        className="h-2 w-2 rounded-full bg-green-500"
                        title="Online"
                      />
                    )}
                  </div>
                  {chatUserBio && (
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--theme-text-tertiary)" }}
                    >
                      {chatUserBio}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {typing && (
              <div className="flex items-center gap-1.5 text-sm animate-pulse" style={{ color: "var(--theme-text-tertiary)" }}>
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: "0ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: "150ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs">typing...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Premium Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        style={{
          background: isDefault
            ? "linear-gradient(to bottom, rgba(249, 115, 22, 0.02), transparent)"
            : "var(--theme-background)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {/* Loading older messages indicator */}
          {loadingOlder && (
            <div className="flex justify-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent"
                style={{ color: "var(--theme-text-tertiary)" }}
              />
            </div>
          )}
          <div ref={messagesTopRef} />
          <div className="space-y-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full mb-4 flex items-center justify-center"
                  style={{
                    backgroundColor: isDefault ? "rgba(249, 115, 22, 0.1)" : "var(--theme-accent-light)",
                  }}
                >
                  <span className="text-3xl">💬</span>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                  No messages yet
                </h3>
                <p className="text-sm max-w-xs" style={{ color: "var(--theme-text-secondary)" }}>
                  Start the conversation with {chatUserName || "this user"}
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwn = currentUserId ? message.senderId === currentUserId : false;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showAvatar = !isOwn && (!prevMessage || prevMessage.senderId !== message.senderId);
                const showDateSeparator =
                  !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);
                const senderProfilePicture = message.sender?.profilePicture
                  ? resolveProfilePictureUrl(message.sender.profilePicture)
                  : null;

                return (
                  <div key={message._id}>
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-6">
                        <div
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "var(--theme-surface-elevated)",
                            color: "var(--theme-text-tertiary)",
                          }}
                        >
                          {new Date(message.createdAt).toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    )}
                    <div
                      className={`flex gap-2 items-end group ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isOwn && (
                        <div className="shrink-0 w-8">
                          {showAvatar ? (
                            message.sender?._id ? (
                              <ClickableUserAvatar
                                userId={message.sender._id}
                                profilePicture={message.sender.profilePicture}
                                name={message.sender.fullName || message.sender.name}
                                size="sm"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full overflow-hidden border-2"
                                style={{ borderColor: "var(--theme-border)" }}
                              >
                                {senderProfilePicture ? (
                                  <Image
                                    src={senderProfilePicture}
                                    alt={message.sender?.name || "User"}
                                    width={32}
                                    height={32}
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full grid place-items-center text-xs font-bold"
                                    style={{
                                      backgroundColor: isDefault ? "rgba(249, 115, 22, 0.1)" : "var(--theme-accent-light)",
                                      color: isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)",
                                    }}
                                  >
                                    {(message.sender?.name || "U").slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <div className="w-8" />
                          )}
                        </div>
                      )}
                      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[75%] sm:max-w-[65%]`}>
                        <div
                          className={`rounded-3xl px-4 py-2.5 shadow-sm transition-all duration-200 ${
                            isOwn ? "rounded-br-sm" : "rounded-bl-sm"
                          } group-hover:shadow-md`}
                          style={{
                            backgroundColor: isOwn
                              ? (isDefault
                                  ? "linear-gradient(135deg, rgba(249, 115, 22, 0.95), rgba(236, 72, 153, 0.95))"
                                  : "var(--theme-accent)")
                              : "var(--theme-surface-elevated)",
                            background: isOwn
                              ? (isDefault
                                  ? "linear-gradient(135deg, #f97316, #ec4899)"
                                  : "var(--theme-gradient-primary)")
                              : undefined,
                            color: isOwn ? "white" : "var(--theme-text-primary)",
                            border: isOwn
                              ? "none"
                              : `1px solid var(--theme-border)`,
                          }}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p
                            className="text-[10px]"
                            style={{ color: "var(--theme-text-tertiary)" }}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                          {isOwn && (
                            <span
                              className="text-[10px]"
                              style={{ color: message.isRead ? "var(--theme-accent)" : "var(--theme-text-tertiary)" }}
                            >
                              {message.isRead ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOwn && <div className="shrink-0 w-8" />}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Premium Input Area */}
      <div
        className="sticky bottom-0 border-t backdrop-blur-xl"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-backdrop)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <div
                className="rounded-3xl border transition-all duration-200"
                style={{
                  borderColor: input.trim() ? (isDefault ? "rgba(249, 115, 22, 0.3)" : "var(--theme-accent-light)") : "var(--theme-border)",
                  backgroundColor: "var(--theme-surface)",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full rounded-3xl px-4 py-3 pr-12 text-sm resize-none focus:outline-none transition-all"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--theme-text-primary)",
                    minHeight: "48px",
                    maxHeight: "120px",
                  }}
                />
                {input.trim() && (
                  <button
                    onClick={handleSend}
                    className="absolute right-2 bottom-2 p-2 rounded-full transition-all duration-200 hover:scale-110"
                    style={{
                      background: isDefault
                        ? "linear-gradient(135deg, #f97316, #ec4899)"
                        : "var(--theme-gradient-primary)",
                      color: "white",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {!input.trim() && (
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: isDefault
                    ? "linear-gradient(135deg, #f97316, #ec4899)"
                    : "var(--theme-gradient-primary)",
                  color: "white",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = "scale(1.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
