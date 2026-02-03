import { apiFetch } from "@/lib/api";

const DEFAULT_COMMUNICATIONS_API_BASE_URL = "http://localhost:3008/api";

function getCommunicationsApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_COMMUNICATIONS_API_BASE_URL?.replace(/\/$/, "") ||
    DEFAULT_COMMUNICATIONS_API_BASE_URL
  );
}

export type ConnectionRequest = {
  _id?: string;
  id?: string;
  requestId?: string; // New API format
  senderId?: string;
  receiverId?: string;
  userId?: string; // New API format - the user who sent/received the request
  status?: "pending" | "accepted" | "rejected";
  createdAt?: string;
  requestedAt?: string; // New API format
  updatedAt?: string;
  isReceived?: boolean; // New API format - true if this is a received request
  sender?: {
    _id?: string;
    id?: string;
    userId?: string;
    name?: string;
    fullName?: string;
    profilePicture?: string;
    email?: string;
  };
  receiver?: {
    _id?: string;
    id?: string;
    userId?: string;
    name?: string;
    fullName?: string;
    profilePicture?: string;
    email?: string;
  };
  // New API format - user object directly in the request
  user?: {
    userId: string;
    fullName?: string;
    bio?: string;
    profilePicture?: string;
    name?: string;
    email?: string;
  };
};

export type ConnectedUser = {
  _id?: string;
  id?: string;
  requestId?: string; // New API format
  userId?: string; // New API format
  name?: string;
  fullName?: string;
  profilePicture?: string;
  email?: string;
  connectionId?: string;
  connectedAt?: string;
  // New API format - user object directly in the connection
  user?: {
    userId: string;
    fullName?: string;
    bio?: string;
    profilePicture?: string;
    name?: string;
    email?: string;
  };
};

export type Message = {
  _id: string;
  id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  sender?: {
    _id: string;
    name?: string;
    fullName?: string;
    profilePicture?: string;
  };
  receiver?: {
    _id: string;
    name?: string;
    fullName?: string;
    profilePicture?: string;
  };
};

export type Conversation = {
  userId: string;
  user?: {
    _id: string;
    name?: string;
    fullName?: string;
    profilePicture?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
};

export type MessagesResponse = {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
  direction: "before" | "after";
};

/**
 * Send a connection request to a user
 */
export async function sendConnectionRequest(userId: string): Promise<ConnectionRequest> {
  const res = await apiFetch<unknown>(
    `/connection-requests/send/${encodeURIComponent(userId)}`,
    {
      method: "POST",
      baseUrl: getCommunicationsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      return (res as { data: ConnectionRequest }).data;
    }
    return res as ConnectionRequest;
  }

  throw new Error("Failed to send connection request");
}

/**
 * Accept a connection request
 */
export async function acceptConnectionRequest(requestId: string): Promise<ConnectionRequest> {
  const res = await apiFetch<unknown>(
    `/connection-requests/accept/${encodeURIComponent(requestId)}`,
    {
      method: "PUT",
      baseUrl: getCommunicationsApiBaseUrl(),
    }
  );

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      return (res as { data: ConnectionRequest }).data;
    }
    return res as ConnectionRequest;
  }

  throw new Error("Failed to accept connection request");
}

/**
 * Reject a connection request
 */
export async function rejectConnectionRequest(requestId: string): Promise<void> {
  await apiFetch<unknown>(
    `/connection-requests/reject/${encodeURIComponent(requestId)}`,
    {
      method: "PUT",
      baseUrl: getCommunicationsApiBaseUrl(),
    }
  );
}

/**
 * Get all connected people
 */
export async function getConnectedPeople(): Promise<ConnectedUser[]> {
  const res = await apiFetch<unknown>("/connection-requests/connected", {
    method: "GET",
    baseUrl: getCommunicationsApiBaseUrl(),
  });

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      const data = (res as { data: unknown }).data;
      if (typeof data === "object" && data !== null) {
        // New API format: data.connections
        if ("connections" in data && Array.isArray((data as { connections: unknown }).connections)) {
          return (data as { connections: ConnectedUser[] }).connections;
        }
        // Alternative: data.users
        if ("users" in data && Array.isArray((data as { users: unknown }).users)) {
          return (data as { users: ConnectedUser[] }).users;
        }
        // If data itself is an array
        if (Array.isArray(data)) {
          return data as ConnectedUser[];
        }
      }
    }
    if (Array.isArray(res)) {
      return res as ConnectedUser[];
    }
    if ("users" in res && Array.isArray((res as { users: unknown }).users)) {
      return (res as { users: ConnectedUser[] }).users;
    }
  }

  return [];
}

/**
 * Get rejected people
 */
export async function getRejectedPeople(): Promise<ConnectedUser[]> {
  const res = await apiFetch<unknown>("/connection-requests/rejected", {
    method: "GET",
    baseUrl: getCommunicationsApiBaseUrl(),
  });

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      const data = (res as { data: unknown }).data;
      if (Array.isArray(data)) {
        return data as ConnectedUser[];
      }
      if (typeof data === "object" && "users" in data && Array.isArray((data as { users: unknown }).users)) {
        return (data as { users: ConnectedUser[] }).users;
      }
    }
    if (Array.isArray(res)) {
      return res as ConnectedUser[];
    }
    if ("users" in res && Array.isArray((res as { users: unknown }).users)) {
      return (res as { users: ConnectedUser[] }).users;
    }
  }

  return [];
}

/**
 * Get pending connection requests
 */
export async function getPendingRequests(): Promise<ConnectionRequest[]> {
  const res = await apiFetch<unknown>("/connection-requests/pending", {
    method: "GET",
    baseUrl: getCommunicationsApiBaseUrl(),
  });

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      const data = (res as { data: unknown }).data;
      if (typeof data === "object" && data !== null) {
        // New API format: data.pending
        if ("pending" in data && Array.isArray((data as { pending: unknown }).pending)) {
          return (data as { pending: ConnectionRequest[] }).pending;
        }
        // Alternative: data.requests
        if ("requests" in data && Array.isArray((data as { requests: unknown }).requests)) {
          return (data as { requests: ConnectionRequest[] }).requests;
        }
        // If data itself is an array
        if (Array.isArray(data)) {
          return data as ConnectionRequest[];
        }
      }
    }
    if (Array.isArray(res)) {
      return res as ConnectionRequest[];
    }
    if ("requests" in res && Array.isArray((res as { requests: unknown }).requests)) {
      return (res as { requests: ConnectionRequest[] }).requests;
    }
  }

  return [];
}

/**
 * Send a message to a user
 */
export async function sendMessage(receiverId: string, content: string): Promise<Message> {
  const res = await apiFetch<unknown>("/messages/send", {
    method: "POST",
    baseUrl: getCommunicationsApiBaseUrl(),
    body: JSON.stringify({
      receiverId,
      content,
    }),
  });

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      return (res as { data: Message }).data;
    }
    return res as Message;
  }

  throw new Error("Failed to send message");
}

/**
 * Get messages with a specific user (cursor-based pagination)
 */
export async function getMessagesWithUser(
  userId: string,
  cursor?: string | null,
  limit: number = 50,
  direction: "before" | "after" = "before"
): Promise<MessagesResponse> {
  const qs = new URLSearchParams({
    limit: limit.toString(),
    direction: direction,
  });

  if (cursor) {
    qs.append("cursor", cursor);
  }

  const res = await apiFetch<unknown>(`/messages/with/${encodeURIComponent(userId)}?${qs}`, {
    method: "GET",
    baseUrl: getCommunicationsApiBaseUrl(),
  });

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      const data = (res as { data: unknown }).data;
      if (typeof data === "object" && data !== null) {
        return data as MessagesResponse;
      }
    }
    return res as MessagesResponse;
  }

  return {
    messages: [],
    nextCursor: null,
    hasMore: false,
    direction: "before",
  };
}

/**
 * Get all conversations
 */
export async function getConversations(): Promise<Conversation[]> {
  const res = await apiFetch<unknown>("/messages/conversations", {
    method: "GET",
    baseUrl: getCommunicationsApiBaseUrl(),
  });

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      const data = (res as { data: unknown }).data;
      if (Array.isArray(data)) {
        return data as Conversation[];
      }
      if (typeof data === "object" && "conversations" in data && Array.isArray((data as { conversations: unknown }).conversations)) {
        return (data as { conversations: Conversation[] }).conversations;
      }
    }
    if (Array.isArray(res)) {
      return res as Conversation[];
    }
    if ("conversations" in res && Array.isArray((res as { conversations: unknown }).conversations)) {
      return (res as { conversations: Conversation[] }).conversations;
    }
  }

  return [];
}

/**
 * Get unread message count
 */
export async function getUnreadCount(): Promise<number> {
  const res = await apiFetch<unknown>("/messages/unread-count", {
    method: "GET",
    baseUrl: getCommunicationsApiBaseUrl(),
  });

  if (typeof res === "object" && res !== null) {
    if ("data" in res) {
      const data = (res as { data: unknown }).data;
      if (typeof data === "object" && data !== null) {
        if ("count" in data && typeof (data as { count: unknown }).count === "number") {
          return (data as { count: number }).count;
        }
      }
      if (typeof data === "number") {
        return data;
      }
    }
    if ("count" in res && typeof (res as { count: unknown }).count === "number") {
      return (res as { count: number }).count;
    }
  }

  return 0;
}
