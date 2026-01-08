import { getApiBaseUrl } from './getApiBaseUrl';

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

export async function createGroupChat(
  token: string,
  groupId: string,
): Promise<Conversation> {
  const response = await fetch(`${getApiBaseUrl()}/messaging/conversations/group/${groupId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create group chat' }));
    throw new Error(error.message || `Failed to create group chat: ${response.status}`);
  }

  const chat = await response.json();
  // Transform to Conversation format
  return {
    id: chat.id,
    type: 'group',
    otherParticipant: null,
    group: chat.Group ? {
      id: chat.Group.id,
      name: chat.Group.name,
      description: chat.Group.description,
      avatarUrl: chat.Group.avatarUrl,
    } : null,
    lastMessage: null,
    unreadCount: 0,
    updatedAt: chat.updatedAt || new Date().toISOString(),
  };
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

  // If no initial message, send empty object to avoid validation errors
  // The backend will create the conversation without sending a message
  const body = initialMessage 
    ? JSON.stringify({ content: initialMessage })
    : JSON.stringify({});

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to start conversation' }));
    throw new Error(error.message || `Failed to start conversation: ${response.status}`);
  }

  return response.json();
}

export async function editMessage(
  token: string,
  chatId: string,
  messageId: string,
  content: string,
): Promise<Message> {
  const response = await fetch(`${getApiBaseUrl()}/messaging/conversations/${chatId}/messages/${messageId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to edit message' }));
    throw new Error(error.message || `Failed to edit message: ${response.status}`);
  }

  return response.json();
}

export async function deleteMessage(
  token: string,
  chatId: string,
  messageId: string,
): Promise<Message> {
  const response = await fetch(`${getApiBaseUrl()}/messaging/conversations/${chatId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete message' }));
    throw new Error(error.message || `Failed to delete message: ${response.status}`);
  }

  return response.json();
}

export async function markMessageAsRead(
  token: string,
  chatId: string,
  messageId: string,
): Promise<Message> {
  const response = await fetch(`${getApiBaseUrl()}/messaging/conversations/${chatId}/messages/${messageId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to mark message as read' }));
    throw new Error(error.message || `Failed to mark message as read: ${response.status}`);
  }

  return response.json();
}
