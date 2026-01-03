import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessageAsRead,
  Message,
} from '../api/messagingApi';
import { useAuth } from '../auth/authContext';
import { getAvatarUrl } from '../utils/avatar';
import { MaterialIcons } from '@expo/vector-icons';

export default function MessageThreadScreen({ route, navigation }: any) {
  const { chatId, otherUser } = route?.params || {};
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = async () => {
    if (!token) return;

    try {
      setError(null);
      const data = await getMessages(token, chatId);
      setMessages(data);
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Poll for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [token, chatId]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!token || !messages.length) return;

    // Mark unread messages from other user as read
    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== user?.id && !msg.readAt,
    );

    unreadMessages.forEach(async (msg) => {
      try {
        await markMessageAsRead(token, chatId, msg.id);
      } catch (err) {
        // Silently fail
        console.error('Failed to mark message as read:', err);
      }
    });
  }, [messages, token, chatId, user?.id]);

  const handleSend = async () => {
    if (editingMessageId) {
      // Handle edit
      await handleEditSave();
      return;
    }

    if (!messageText.trim() || !token || sending) return;

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const newMessage = await sendMessage(token, chatId, content);
      setMessages((prev) => [...prev, newMessage]);
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setMessageText(content); // Restore message text on error
    } finally {
      setSending(false);
    }
  };

  const handleEdit = (message: Message) => {
    // Check if message can be edited (within 5 minutes)
    const messageTime = new Date(message.sentAt).getTime();
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (now - messageTime > FIVE_MINUTES) {
      Alert.alert('Cannot Edit', 'Messages can only be edited within 5 minutes of sending');
      return;
    }

    setEditingMessageId(message.id);
    setEditText(message.content);
    setMessageText(message.content);
  };

  const handleEditSave = async () => {
    if (!editingMessageId || !editText.trim() || !token) return;

    try {
      const updated = await editMessage(token, chatId, editingMessageId, editText.trim());
      setMessages((prev) =>
        prev.map((msg) => (msg.id === editingMessageId ? updated : msg)),
      );
      setEditingMessageId(null);
      setEditText('');
      setMessageText('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to edit message');
    }
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditText('');
    setMessageText('');
  };

  const handleDelete = (message: Message) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await deleteMessage(token, chatId, message.id);
              await loadMessages(); // Reload to get updated message
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete message');
            }
          },
        },
      ],
    );
  };

  const handleLongPress = (message: Message) => {
    if (message.senderId !== user?.id) return; // Only own messages
    if (message.deletedAt) return; // Can't edit/delete deleted messages

    setSelectedMessageId(message.id);
    Alert.alert(
      'Message Options',
      '',
      [
        {
          text: 'Edit',
          onPress: () => handleEdit(message),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(message),
        },
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedMessageId(null) },
      ],
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      date.toDateString() ===
      new Date(now.getTime() - 86400000).toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === user?.id;
    const isDeleted = !!item.deletedAt;
    const isEdited = !!item.editedAt;
    const senderName =
      item.sender?.profile?.displayName || item.sender?.email || 'Unknown';
    const avatarUrl = item.sender?.profile?.avatarUrl
      ? getAvatarUrl(item.sender?.profile?.avatarUrl || '')
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
        disabled={!isOwn || isDeleted}
      >
        {!isOwn && (
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
            isDeleted && styles.deletedMessageBubble,
          ]}
        >
          {!isOwn && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          {isDeleted ? (
            <Text
              style={[
                styles.messageText,
                styles.deletedMessageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              Message deleted
            </Text>
          ) : (
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwn ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {formatTime(item.sentAt)}
              {isEdited && ' • Edited'}
            </Text>
            {isOwn && !isDeleted && (
              <View style={styles.readReceiptContainer}>
                {item.readAt ? (
                  <MaterialIcons name="done-all" size={14} color="#2563EB" />
                ) : (
                  <MaterialIcons name="done" size={14} color="#9CA3AF" />
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayName =
    otherUser?.profile?.displayName || otherUser?.email || 'Unknown User';

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (otherUser?.id) {
                navigation.navigate('userProfile', { userId: otherUser.id });
              }
            }}
            activeOpacity={0.7}
            style={styles.headerTitleContainer}
          >
            <Text style={styles.headerTitle}>{displayName}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (otherUser?.id) {
              navigation.navigate('userProfile', { userId: otherUser.id });
            }
          }}
          activeOpacity={0.7}
          style={styles.headerTitleContainer}
        >
          <Text style={styles.headerTitle}>{displayName}</Text>
        </TouchableOpacity>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />
        <View style={styles.inputContainer}>
          {editingMessageId && (
            <View style={styles.editIndicator}>
              <MaterialIcons name="edit" size={16} color="#2563EB" />
              <Text style={styles.editIndicatorText}>Editing message</Text>
              <TouchableOpacity onPress={handleEditCancel} style={styles.cancelEditButton}>
                <MaterialIcons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder={editingMessageId ? 'Edit message...' : 'Type a message...'}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : editingMessageId ? (
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 16,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563EB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#C62828',
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  otherMessageTime: {
    color: '#666666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  deletedMessageBubble: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  deletedMessageText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  readReceiptContainer: {
    marginLeft: 4,
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  editIndicatorText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
    flex: 1,
  },
  cancelEditButton: {
    padding: 4,
  },
});

