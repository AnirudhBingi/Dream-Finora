import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { getConversations, Conversation } from '../api/messagingApi';
import { useAuth } from '../auth/authContext';
import { Avatar } from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonConversationList } from '../components/SkeletonLoader';
import { Header } from '../components/Header';
import { MaterialIcons } from '@expo/vector-icons';
import { RefreshControl } from 'react-native';
import { getUnreadCount } from '../api/notificationApi';
import { setBadgeCount } from '../services/pushNotifications';

interface ConversationListScreenProps {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
  onBack?: () => void;
  onNewMessage?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export default function ConversationListScreen({ 
  navigation,
  onBack,
  onNewMessage,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ConversationListScreenProps) {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const loadConversations = async (isRefresh = false, isPolling = false) => {
    if (!token) return;

    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else if (!isPolling) {
        // Only show loading state on initial load, not during polling
        setLoading(true);
      }
      const data = await getConversations(token);
      // Handle both array response and object with conversations/groups property
      let conversationsList: Conversation[] = [];
      if (Array.isArray(data)) {
        conversationsList = data;
      } else if (data && typeof data === 'object') {
        // Check for common response wrapper patterns
        conversationsList = (data as any).conversations || (data as any).groups || [];
      }
      setConversations(conversationsList);
      
      // Update notification badge count after loading conversations
      if (token) {
        try {
          const unreadCount = await getUnreadCount(token);
          await setBadgeCount(unreadCount);
        } catch (err) {
          console.error('Failed to update badge count:', err);
        }
      }
    } catch (err: any) {
      // Only show error on initial load or refresh, not during polling
      if (!isPolling) {
        setError(getUserFriendlyErrorMessage(err));
        setConversations([]); // Set empty array on error
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConversations();

    // Poll for new conversations every 5 seconds (silently, without loading state)
    const interval = setInterval(() => loadConversations(false, true), 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const displayName = conv.otherParticipant?.profile?.displayName || conv.otherParticipant?.email || '';
    const lastMessage = conv.lastMessage?.content || '';
    return displayName.toLowerCase().includes(query) || lastMessage.toLowerCase().includes(query);
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isGroupChat = item.type === 'group' || item.group !== null;
    const otherUser = item.otherParticipant;
    const group = item.group;
    
    // Get display name - group chat or direct chat
    let displayName = 'Unknown';
    let avatarUrl: string | null | undefined = null;
    
    if (isGroupChat && group) {
      displayName = group.name;
      avatarUrl = group.avatarUrl;
    } else if (otherUser) {
      // Prioritize displayName, fallback to email (but format it nicely)
      if (otherUser.profile?.displayName) {
        displayName = otherUser.profile.displayName;
      } else if (otherUser.email) {
        // Extract name from email (part before @) and capitalize
        const emailName = otherUser.email.split('@')[0];
        displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }
      avatarUrl = otherUser.profile?.avatarUrl;
    }
    
    const lastMessage = item.lastMessage;
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          if (navigation?.navigate) {
            navigation.navigate('MessageThread', {
              chatId: item.id,
              otherUser: isGroupChat ? null : otherUser,
              group: isGroupChat ? group : null,
            });
          }
        }}
        activeOpacity={0.7}
      >
        {isGroupChat && group ? (
          <Avatar
            avatarUrl={getAvatarUrl(avatarUrl || null)}
            displayName={displayName}
            size={56}
            borderWidth={2}
            borderColor="#FFFFFF"
          />
        ) : (
          <Avatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            size={56}
            borderWidth={2}
            borderColor="#FFFFFF"
          />
        )}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, hasUnread && styles.conversationNameUnread]}>
              {displayName}
            </Text>
            {lastMessage && (
              <Text style={styles.conversationTime}>
                {formatTime(lastMessage.sentAt)}
              </Text>
            )}
          </View>
          {lastMessage ? (
            <View style={styles.lastMessageRow}>
              {isGroupChat && lastMessage.senderId !== user?.id && (
                <Text style={styles.lastMessageSender}>
                  {(() => {
                    // Try to get sender name from participants (simplified)
                    // In a real implementation, we'd need sender info in lastMessage
                    return 'Someone: ';
                  })()}
                </Text>
              )}
              <Text 
                style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} 
                numberOfLines={1}
              >
                {lastMessage.content}
              </Text>
              {hasUnread && (
                <View style={styles.unreadDot} />
              )}
            </View>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <RNSafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header
          title="Messages"
          onBack={handleBack}
          onNavigateToProfile={onNavigateToProfile}
          showNotifications={false}
          showSettings={false}
        />
        <SkeletonConversationList count={5} />
      </RNSafeAreaView>
    );
  }

  return (
    <RNSafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title="Messages"
        onBack={handleBack}
        rightActions={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => {
                if (showSearch) {
                  // Clear search when closing
                  setSearchQuery('');
                }
                setShowSearch(!showSearch);
              }}
              style={styles.headerIconButton}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name={showSearch ? "close" : "search"} 
                size={28} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (onNewMessage) {
                  onNewMessage();
                } else if (navigation?.navigate) {
                  navigation.navigate('NewConversation');
                }
              }}
              style={styles.headerIconButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        }
        onNavigateToProfile={onNavigateToProfile}
        showNotifications={false}
        showSettings={false}
      />
      {error ? (
        <ErrorState message={error} onRetry={() => loadConversations(false)} />
      ) : (
        <>
          {/* Search Bar - Only show when search icon is clicked */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search conversations..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.searchClear}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          {filteredConversations.length === 0 && conversations.length > 0 ? (
            <View style={styles.emptySearchContainer}>
              <MaterialIcons name="search-off" size={48} color="#9CA3AF" />
              <Text style={styles.emptySearchText}>No conversations found</Text>
              <Text style={styles.emptySearchSubtext}>
                Try adjusting your search
              </Text>
            </View>
          ) : filteredConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="chat-bubble-outline" size={64} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyMessage}>
                Start chatting with your friends, groups, or people from listings
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => {
                  if (onNewMessage) {
                    onNewMessage();
                  } else if (navigation?.navigate) {
                    navigation.navigate('NewConversation');
                  }
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyActionButtonText}>New Message</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              renderItem={renderConversation}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadConversations(true)}
                  tintColor="#6366F1"
                />
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </RNSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  searchClear: {
    padding: 4,
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    position: 'relative',
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'center',
  },
  errorText: {
    color: '#C62828',
    marginBottom: 8,
  },
  retryText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  conversationNameUnread: {
    fontWeight: '700',
  },
  conversationTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: '#111827',
    fontWeight: '500',
  },
  noMessages: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  unreadBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  groupAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  groupAvatarImage: {
    width: '100%',
    height: '100%',
  },
  groupAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  lastMessageSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 4,
  },
});

