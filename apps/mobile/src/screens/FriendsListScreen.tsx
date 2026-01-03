import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import {
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getBlockedUsers,
  unblockUser,
  blockUser,
  Friend,
  FriendRequests,
} from '../api/friendApi';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonFriendList } from '../components/SkeletonLoader';

interface FriendsListScreenProps {
  onBack: () => void;
  onSearchFriends: () => void;
  onNavigateToUserProfile?: (userId: string) => void;
}

export function FriendsListScreen({ onBack, onSearchFriends, onNavigateToUserProfile }: FriendsListScreenProps) {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] });
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'blocked'>('friends');

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [friendsData, requestsData, blockedData] = await Promise.all([
        getFriends(token),
        getPendingRequests(token),
        getBlockedUsers(token),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
      setBlockedUsers(blockedData);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleAcceptRequest(friendshipId: string) {
    if (!token) return;

    try {
      await acceptFriendRequest(token, friendshipId);
      await loadData();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept request');
    }
  }

  async function handleRejectRequest(friendshipId: string) {
    if (!token) return;

    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectFriendRequest(token, friendshipId);
              await loadData();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to reject request');
            }
          },
        },
      ],
    );
  }

  async function handleRemoveFriend(friendshipId: string, friendName: string) {
    if (!token) return;

    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(token, friendshipId);
              await loadData();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove friend');
            }
          },
        },
      ],
    );
  }

  async function handleBlockUser(friendId: string, userName: string) {
    if (!token) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName}? You won't be able to see their content or send them messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(token, friendId);
              Alert.alert('Success', `${userName} has been blocked`, [
                { text: 'OK', onPress: () => loadData() },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to block user');
            }
          },
        },
      ],
    );
  }

  async function handleUnblockUser(friendId: string, userName: string) {
    if (!token) return;

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              await unblockUser(token, friendId);
              await loadData();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to unblock user');
            }
          },
        },
      ],
    );
  }

  function getUserDisplayName(friend: Friend): string {
    return friend?.friend?.profile?.displayName || friend?.friend?.email || 'Unknown';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity style={styles.searchButton} onPress={onSearchFriends} activeOpacity={0.7}>
            <MaterialIcons name="person-add" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity style={styles.searchButton} onPress={onSearchFriends} activeOpacity={0.7}>
            <MaterialIcons name="person-add" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <ErrorState message={error} onRetry={loadData} />
      </SafeAreaView>
    );
  }

  const hasIncomingRequests = requests.incoming.length > 0;
  const hasOutgoingRequests = requests.outgoing.length > 0;
  const hasRequests = hasIncomingRequests || hasOutgoingRequests;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity style={styles.searchButton} onPress={onSearchFriends} activeOpacity={0.7}>
          <MaterialIcons name="person-add" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.7}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              Requests
            </Text>
            {hasIncomingRequests && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{requests.incoming.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'blocked' && styles.tabActive]}
          onPress={() => setActiveTab('blocked')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'blocked' && styles.tabTextActive]}>
            Blocked ({blockedUsers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {activeTab === 'friends' ? (
          <>
            {friends.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No friends yet"
                message="Search for friends to add them to your network"
                actionLabel="Add Friends"
                onAction={onSearchFriends}
              />
            ) : (
              friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendCard}
                  onPress={() => {
                    if (onNavigateToUserProfile) {
                      onNavigateToUserProfile(friend.friendId);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.friendInfo}>
                    <View style={styles.avatar}>
                      <MaterialIcons name="person" size={24} color="#6B7280" />
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{getUserDisplayName(friend)}</Text>
                      <Text style={styles.friendEmail}>{friend.friend.email}</Text>
                    </View>
                  </View>
                  <View style={styles.friendActions}>
                    <TouchableOpacity
                      style={styles.blockButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleBlockUser(friend.friendId, getUserDisplayName(friend));
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="block" size={18} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveFriend(friend.id, getUserDisplayName(friend));
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="person-remove" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        ) : activeTab === 'requests' ? (
          <>
            {!hasRequests ? (
              <EmptyState
                icon="inbox"
                title="No pending requests"
                message="You don't have any pending friend requests"
              />
            ) : (
              <>
                {hasIncomingRequests && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Incoming Requests</Text>
                    {requests.incoming.map((request) => (
                      <TouchableOpacity
                        key={request.id}
                        style={styles.requestCard}
                        onPress={() => {
                          if (onNavigateToUserProfile) {
                            onNavigateToUserProfile(request.friendId);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.friendInfo}>
                          <View style={styles.avatar}>
                            <MaterialIcons name="person" size={24} color="#6B7280" />
                          </View>
                          <View style={styles.friendDetails}>
                            <Text style={styles.friendName}>{getUserDisplayName(request)}</Text>
                            <Text style={styles.friendEmail}>{request.friend.email}</Text>
                            <Text style={styles.requestTime}>
                              {formatDate(request.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.requestActions}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAcceptRequest(request.id);
                            }}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="check" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleRejectRequest(request.id);
                            }}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="close" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {hasOutgoingRequests && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Outgoing Requests</Text>
                    {requests.outgoing.map((request) => (
                      <TouchableOpacity
                        key={request.id}
                        style={styles.requestCard}
                        onPress={() => {
                          if (onNavigateToUserProfile) {
                            onNavigateToUserProfile(request.friendId);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.friendInfo}>
                          <View style={styles.avatar}>
                            <MaterialIcons name="person" size={24} color="#6B7280" />
                          </View>
                          <View style={styles.friendDetails}>
                            <Text style={styles.friendName}>{getUserDisplayName(request)}</Text>
                            <Text style={styles.friendEmail}>{request.friend.email}</Text>
                            <Text style={styles.requestTime}>
                              Sent {formatDate(request.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>Pending</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {blockedUsers.length === 0 ? (
              <EmptyState
                icon="block"
                title="No blocked users"
                message="You haven't blocked any users"
              />
            ) : (
              blockedUsers.map((blocked) => (
                <TouchableOpacity
                  key={blocked.id}
                  style={styles.friendCard}
                  onPress={() => {
                    if (onNavigateToUserProfile) {
                      onNavigateToUserProfile(blocked.friendId);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.friendInfo}>
                    <View style={styles.avatar}>
                      <MaterialIcons name="person" size={24} color="#6B7280" />
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{getUserDisplayName(blocked)}</Text>
                      <Text style={styles.friendEmail}>{blocked.friend.email}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleUnblockUser(blocked.friendId, getUserDisplayName(blocked));
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="lock-open" size={20} color="#2563EB" />
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  searchButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  addButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  friendEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  blockButton: {
    padding: 8,
  },
  removeButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  pendingText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  unblockButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
});

