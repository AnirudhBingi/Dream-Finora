import { api } from "./client";

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  sentAt: string;
  readAt: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  sender: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface Conversation {
  id: string;
  type: string;
  otherParticipant: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  group?: {
    id: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
  } | null;
  lastMessage: {
    id: string;
    content: string;
    sentAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface SendMessageDto {
  content: string;
}

export async function getConversations(token: string): Promise<Conversation[]> {
  return api.get<Conversation[]>("/messaging/conversations", { token });
}

export async function createGroupChat(
  token: string,
  groupId: string,
): Promise<Conversation> {
  const chat = await api.post<any>(
    `/messaging/conversations/group/${groupId}`,
    undefined,
    { token },
  );
  // Transform to Conversation format
  return {
    id: chat.id,
    type: "group",
    otherParticipant: null,
    group: chat.Group
      ? {
          id: chat.Group.id,
          name: chat.Group.name,
          description: chat.Group.description,
          avatarUrl: chat.Group.avatarUrl,
        }
      : null,
    lastMessage: null,
    unreadCount: 0,
    updatedAt: chat.updatedAt || new Date().toISOString(),
  };
}

export async function getMessages(
  token: string,
  chatId: string,
): Promise<Message[]> {
  return api.get<Message[]>(`/messaging/conversations/${chatId}/messages`, {
    token,
  });
}

export async function sendMessage(
  token: string,
  chatId: string,
  content: string,
): Promise<Message> {
  return api.post<Message>(
    `/messaging/conversations/${chatId}/messages`,
    { content },
    { token },
  );
}

export async function startConversation(
  token: string,
  otherUserId: string,
  initialMessage?: string,
): Promise<Conversation> {
  const body = initialMessage ? { content: initialMessage } : {};
  return api.post<Conversation>(
    `/messaging/conversations/start?userId=${otherUserId}`,
    body,
    { token },
  );
}

export async function editMessage(
  token: string,
  chatId: string,
  messageId: string,
  content: string,
): Promise<Message> {
  return api.put<Message>(
    `/messaging/conversations/${chatId}/messages/${messageId}`,
    { content },
    { token },
  );
}

export async function deleteMessage(
  token: string,
  chatId: string,
  messageId: string,
): Promise<Message> {
  return api.delete<Message>(
    `/messaging/conversations/${chatId}/messages/${messageId}`,
    { token },
  );
}

export async function markMessageAsRead(
  token: string,
  chatId: string,
  messageId: string,
): Promise<Message> {
  return api.put<Message>(
    `/messaging/conversations/${chatId}/messages/${messageId}/read`,
    undefined,
    { token },
  );
}
