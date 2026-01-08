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
import { Avatar } from '../components/Avatar';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { getUnreadCount } from '../api/notificationApi';
import { setBadgeCount } from '../services/pushNotifications';

export default function MessageThreadScreen({ route, navigation }: any) {
  const { chatId, otherUser, group } = route?.params || {};
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

  // Mark messages as read when viewing and update notification badge
  useEffect(() => {
    if (!token || !messages.length) return;

    // Mark unread messages from other user as read
    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== user?.id && !msg.readAt,
    );

    if (unreadMessages.length > 0) {
      // Mark all unread messages as read
      Promise.all(
        unreadMessages.map(async (msg) => {
          try {
            await markMessageAsRead(token, chatId, msg.id);
          } catch (err) {
            console.error('Failed to mark message as read:', err);
          }
        })
      ).then(async () => {
        // Update notification badge count after marking messages as read
        try {
          const unreadCount = await getUnreadCount(token);
          await setBadgeCount(unreadCount);
        } catch (err) {
          console.error('Failed to update badge count:', err);
        }
      });
    }
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
            <Avatar
              avatarUrl={item.sender?.profile?.avatarUrl}
              displayName={senderName}
              size={36}
              borderWidth={2}
              borderColor="#FFFFFF"
            />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
            isDeleted && styles.deletedMessageBubble,
          ]}
        >
          {!isOwn && group && (
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
                  <MaterialIcons name="done-all" size={14} color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="done" size={14} color="#FFFFFF" style={{ opacity: 0.7 }} />
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Get display name - group chat or direct chat
  const displayName = group
    ? group.name
    : (otherUser?.profile?.displayName || (otherUser?.email ? otherUser.email.split('@')[0].charAt(0).toUpperCase() + otherUser.email.split('@')[0].slice(1) : 'Unknown User'));

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleNavigateToProfile = () => {
    if (otherUser?.id && navigation?.navigate) {
      navigation.navigate('userProfile', { userId: otherUser.id });
    }
  };

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header
          title={displayName}
          onBack={handleBack}
          showProfile={false}
          showNotifications={false}
          showSettings={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title={displayName}
        onBack={handleBack}
        showProfile={false}
        showNotifications={false}
        showSettings={false}
      />
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
              <MaterialIcons name="edit" size={16} color="#6366F1" />
              <Text style={styles.editIndicatorText}>Editing message</Text>
              <TouchableOpacity onPress={handleEditCancel} style={styles.cancelEditButton}>
                <MaterialIcons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={editingMessageId ? 'Edit message...' : 'Type a message...'}
              placeholderTextColor="#9CA3AF"
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
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : editingMessageId ? (
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
              ) : (
                <MaterialIcons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    marginVertical: 6,
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
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '400',
  },
  ownMessageTime: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
  otherMessageTime: {
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'column',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 44,
  },
  sendButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
    minHeight: 44,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  editIndicatorText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
    flex: 1,
  },
  cancelEditButton: {
    padding: 4,
  },
});

