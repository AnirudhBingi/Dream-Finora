import { getApiBaseUrl } from './getApiBaseUrl';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  sentAt: string;
  readAt: string | null;
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
  const response = await fetch(`${getApiBaseUrl()}/messaging/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch conversations' }));
    throw new Error(error.message || `Failed to fetch conversations: ${response.status}`);
  }

  return response.json();
}

export async function getMessages(token: string, chatId: string): Promise<Message[]> {
  const response = await fetch(`${getApiBaseUrl()}/messaging/conversations/${chatId}/messages`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch messages' }));
    throw new Error(error.message || `Failed to fetch messages: ${response.status}`);
  }

  return response.json();
}

export async function sendMessage(
  token: string,
  chatId: string,
  content: string,
): Promise<Message> {
  const response = await fetch(`${getApiBaseUrl()}/messaging/conversations/${chatId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send message' }));
    throw new Error(error.message || `Failed to send message: ${response.status}`);
  }

  return response.json();
}

export async function startConversation(
  token: string,
  otherUserId: string,
  initialMessage?: string,
): Promise<Conversation> {
  const url = new URL(`${getApiBaseUrl()}/messaging/conversations/start`);
  url.searchParams.append('userId', otherUserId);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: initialMessage ? JSON.stringify({ content: initialMessage }) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to start conversation' }));
    throw new Error(error.message || `Failed to start conversation: ${response.status}`);
  }

  return response.json();
}

