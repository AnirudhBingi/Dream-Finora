import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessageAsRead,
  Message,
} from "../api/messagingApi";
import { useAuth } from "../auth/authContext";
import { Avatar } from "../components/Avatar";
import { MaterialIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { getUnreadCount } from "../api/notificationApi";
import { setBadgeCount } from "../services/pushNotifications";
import { useTheme } from "../theme";

export default function MessageThreadScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { chatId, otherUser, group } = route?.params || {};
  const { token, user } = useAuth();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const flatListRef = useRef<FlatList>(null);

  const {
    data: messagesData,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<Message[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      const data = await getMessages(token, chatId);
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
      return data;
    },
    immediate: true,
    deps: [token, chatId],
  });

  const messages = messagesData ?? [];
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync local messages with fetched messages
  useEffect(() => {
    if (messagesData) {
      setLocalMessages(messagesData);
    }
  }, [messagesData]);

  // Poll for new messages every 3 seconds (silently)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      refetch().catch((err) => {
        // Silently fail during polling
        console.error("Polling error:", err);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [token, chatId, refetch]);

  // Mark messages as read when viewing and update notification badge
  useEffect(() => {
    const currentMessages = localMessages.length > 0 ? localMessages : messages;
    if (!token || !currentMessages.length) return;

    // Mark unread messages from other user as read
    const unreadMessages = currentMessages.filter(
      (msg) => msg.senderId !== user?.id && !msg.readAt,
    );

    if (unreadMessages.length > 0) {
      // Mark all unread messages as read
      Promise.all(
        unreadMessages.map(async (msg) => {
          try {
            await markMessageAsRead(token, chatId, msg.id);
          } catch (err) {
            console.error("Failed to mark message as read:", err);
          }
        }),
      ).then(async () => {
        // Update notification badge count after marking messages as read
        try {
          const unreadCount = await getUnreadCount(token);
          await setBadgeCount(unreadCount);
        } catch (err: any) {
          // Only log non-timeout errors to avoid console spam
          if (
            err?.message &&
            !err.message.includes("timeout") &&
            !err.message.includes("timed out")
          ) {
            console.error("Failed to update badge count:", err);
          }
        }
      });
    }
  }, [localMessages, messages, token, chatId, user?.id]);

  const handleSend = async () => {
    if (editingMessageId) {
      // Handle edit
      await handleEditSave();
      return;
    }

    if (!messageText.trim() || !token || sending) return;

    const content = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      const newMessage = await sendMessage(token, chatId, content);
      setLocalMessages((prev) => [...prev, newMessage]);
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      // Refresh to get updated message list
      await refetch();
    } catch (err: any) {
      setLocalError(err.message || "Failed to send message");
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
      Alert.alert(
        "Cannot Edit",
        "Messages can only be edited within 5 minutes of sending",
      );
      return;
    }

    setEditingMessageId(message.id);
    setEditText(message.content);
    setMessageText(message.content);
  };

  const handleEditSave = async () => {
    if (!editingMessageId || !editText.trim() || !token) return;

    try {
      const updated = await editMessage(
        token,
        chatId,
        editingMessageId,
        editText.trim(),
      );
      setLocalMessages((prev) =>
        prev.map((msg: Message) =>
          msg.id === editingMessageId ? updated : msg,
        ),
      );
      setEditingMessageId(null);
      setEditText("");
      setMessageText("");
      // Refresh to get updated message list
      await refetch();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to edit message");
    }
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditText("");
    setMessageText("");
  };

  const handleDelete = (message: Message) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await deleteMessage(token, chatId, message.id);
              await refetch(); // Reload to get updated message
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete message");
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
    Alert.alert("Message Options", "", [
      {
        text: "Edit",
        onPress: () => handleEdit(message),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDelete(message),
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setSelectedMessageId(null),
      },
    ]);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      date.toDateString() === new Date(now.getTime() - 86400000).toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (isYesterday) {
      return (
        "Yesterday " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } else {
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === user?.id;
    const isDeleted = !!item.deletedAt;
    const isEdited = !!item.editedAt;
    const senderName =
      item.sender?.profile?.displayName || item.sender?.email || "Unknown";

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
              borderColor={theme.colors.background}
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
              {isEdited && " • Edited"}
            </Text>
            {isOwn && !isDeleted && (
              <View style={styles.readReceiptContainer}>
                {item.readAt ? (
                  <MaterialIcons
                    name="done-all"
                    size={14}
                    color={theme.colors.textInverse}
                  />
                ) : (
                  <MaterialIcons
                    name="done"
                    size={14}
                    color={theme.colors.textInverse}
                    style={{ opacity: 0.7 }}
                  />
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
    : otherUser?.profile?.displayName ||
      (otherUser?.email
        ? otherUser.email.split("@")[0].charAt(0).toUpperCase() +
          otherUser.email.split("@")[0].slice(1)
        : "Unknown User");

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleNavigateToProfile = () => {
    if (otherUser?.id && navigation?.navigate) {
      navigation.navigate("userProfile", { userId: otherUser.id });
    }
  };

  const displayMessages = localMessages.length > 0 ? localMessages : messages;

  if (loading && displayMessages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Header
          title={displayName}
          onBack={handleBack}
          showProfile={false}
          showNotifications={false}
          showSettings={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
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
              <MaterialIcons
                name="edit"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.editIndicatorText}>Editing message</Text>
              <TouchableOpacity
                onPress={handleEditCancel}
                style={styles.cancelEditButton}
              >
                <MaterialIcons
                  name="close"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={
                editingMessageId ? "Edit message..." : "Type a message..."
              }
              placeholderTextColor={theme.colors.textTertiary}
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
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverse}
                />
              ) : editingMessageId ? (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={theme.colors.textInverse}
                />
              ) : (
                <MaterialIcons
                  name="send"
                  size={20}
                  color={theme.colors.textInverse}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      margin: theme.spacing.base,
      borderRadius: theme.spacing.sm,
    },
    errorText: {
      color: theme.colors.error,
    },
    keyboardView: {
      flex: 1,
    },
    messagesList: {
      padding: theme.spacing.base,
      paddingBottom: theme.spacing.sm,
    },
    messageContainer: {
      flexDirection: "row",
      marginVertical: 6,
      alignItems: "flex-end",
    },
    ownMessageContainer: {
      justifyContent: "flex-end",
    },
    otherMessageContainer: {
      justifyContent: "flex-start",
    },
    avatarContainer: {
      marginRight: 8,
      marginBottom: 2,
    },
    messageBubble: {
      maxWidth: "75%",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    ownMessageBubble: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
      backgroundColor: theme.colors.background,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      marginBottom: 4,
      letterSpacing: -0.1,
    },
    messageText: {
      fontSize: theme.typography.fontSize.sm + 1,
      lineHeight: 20,
      letterSpacing: -0.1,
    },
    ownMessageText: {
      color: theme.colors.textInverse,
    },
    otherMessageText: {
      color: theme.colors.textPrimary,
    },
    messageTime: {
      fontSize: theme.typography.fontSize.xs - 1,
      marginTop: 4,
      fontWeight: theme.typography.fontWeight.normal,
    },
    ownMessageTime: {
      color: theme.colors.textInverse,
      opacity: 0.85,
    },
    otherMessageTime: {
      color: theme.colors.textSecondary,
    },
    inputContainer: {
      flexDirection: "column",
      padding: theme.spacing.md,
      paddingBottom:
        Platform.OS === "ios" ? theme.spacing.md : theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 24,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: 10,
      maxHeight: 100,
      fontSize: theme.typography.fontSize.sm + 1,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.backgroundSecondary,
      minHeight: 44,
    },
    sendButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 64,
      minHeight: 44,
      marginTop: theme.spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
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
      backgroundColor: theme.colors.gray300,
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
      color: theme.colors.textInverse,
      fontWeight: theme.typography.fontWeight.semibold,
      fontSize: theme.typography.fontSize.base,
    },
    deletedMessageBubble: {
      opacity: 0.6,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    deletedMessageText: {
      fontStyle: "italic",
      opacity: 0.7,
    },
    messageFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    },
    readReceiptContainer: {
      marginLeft: 4,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.sm,
    },
    editIndicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primaryBackground,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.primaryBackground,
    },
    editIndicatorText: {
      fontSize: theme.typography.fontSize.xs + 1,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
    },
    cancelEditButton: {
      padding: 4,
    },
  });
