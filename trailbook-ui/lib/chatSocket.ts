import { io, Socket } from "socket.io-client";

export type ChatSocketEvents = {
  connected: (data: { message: string; userId: string }) => void;
  new_message: (data: { message: Message }) => void;
  message_sent: (data: { message: Message }) => void;
  user_typing: (data: { userId: string; isTyping: boolean }) => void;
  messages_read: (data: { senderId: string }) => void;
  user_offline: (data: { userId: string }) => void;
  user_online: (data: { userId: string }) => void;
  error: (error: { message: string }) => void;
  disconnect: () => void;
};

export type Message = {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

const DEFAULT_CHAT_SERVER_URL = "http://localhost:3008/chat";

function getChatServerUrl(): string {
  return process.env.NEXT_PUBLIC_CHAT_SERVER_URL?.replace(/\/$/, "") || DEFAULT_CHAT_SERVER_URL;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("token");
  } catch {
    return null;
  }
}

class ChatSocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(): Socket | null {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = getToken();
    if (!token) {
      console.warn("[ChatSocket] No token available for chat socket connection");
      return null;
    }

    const url = getChatServerUrl();
    
    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io(url, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    // Set up event listeners
    this.socket.on("connect", () => {
      console.log("[ChatSocket] Connected to chat server");
      this.emit("connected", { message: "Connected", userId: "" });
    });

    this.socket.on("connected", (data) => {
      console.log("[ChatSocket] Connection confirmed:", data);
      this.emit("connected", data);
    });

    this.socket.on("new_message", (data) => {
      console.log("[ChatSocket] New message received:", data);
      this.emit("new_message", data);
    });

    this.socket.on("message_sent", (data) => {
      console.log("[ChatSocket] Message sent confirmation:", data);
      this.emit("message_sent", data);
    });

    this.socket.on("user_typing", (data) => {
      this.emit("user_typing", data);
    });

    this.socket.on("messages_read", (data) => {
      console.log("[ChatSocket] Messages marked as read:", data);
      this.emit("messages_read", data);
    });

    this.socket.on("user_offline", (data) => {
      console.log("[ChatSocket] User went offline:", data);
      this.emit("user_offline", data);
    });

    this.socket.on("user_online", (data) => {
      console.log("[ChatSocket] User came online:", data);
      this.emit("user_online", data);
    });

    this.socket.on("error", (error) => {
      console.error("[ChatSocket] Error:", error);
      this.emit("error", error);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[ChatSocket] Disconnected from chat server:", reason);
      this.emit("disconnect", undefined);
    });

    this.socket.on("connect_error", (error) => {
      console.error("[ChatSocket] Connection error:", error);
      this.emit("error", { message: error.message || "Connection failed" });
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      console.log("[ChatSocket] Disconnecting socket");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  on<K extends keyof ChatSocketEvents>(event: K, callback: ChatSocketEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof ChatSocketEvents>(event: K, callback: ChatSocketEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ChatSocket] Error in ${event} callback:`, error);
        }
      });
    }
  }

  sendMessage(receiverId: string, content: string): void {
    if (!this.socket?.connected) {
      console.warn("[ChatSocket] Cannot send message: socket not connected");
      // Try to reconnect
      this.connect();
      return;
    }
    console.log("[ChatSocket] Sending message to:", receiverId, "content:", content);
    this.socket.emit("send_message", { receiverId, content });
  }

  sendTyping(receiverId: string, isTyping: boolean): void {
    if (!this.socket?.connected) {
      console.warn("[ChatSocket] Cannot send typing indicator: socket not connected");
      return;
    }
    console.log("[ChatSocket] Sending typing indicator:", { receiverId, isTyping });
    this.socket.emit("typing", { receiverId, isTyping });
  }

  markAsRead(senderId: string): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit("mark_read", { senderId });
  }

  notifyUserOffline(userId: string): void {
    if (!this.socket?.connected) {
      return;
    }
    console.log("[ChatSocket] Notifying user offline:", userId);
    this.socket.emit("user_offline", { userId });
  }

  notifyUserOnline(userId: string): void {
    if (!this.socket?.connected) {
      return;
    }
    console.log("[ChatSocket] Notifying user online:", userId);
    this.socket.emit("user_online", { userId });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const chatSocket = new ChatSocketManager();
