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
  Platform,
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
  Friend,
  FriendRequests,
} from '../api/friendApi';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonFriendList } from '../components/SkeletonLoader';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';

interface FriendsListScreenProps {
  onBack: () => void;
  onSearchFriends: () => void;
  onAddNewFriends?: () => void; // New handler for add friends button
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FriendsListScreen({ 
  onBack, 
  onSearchFriends,
  onAddNewFriends,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FriendsListScreenProps) {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [friendsData, requestsData] = await Promise.all([
        getFriends(token),
        getPendingRequests(token),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
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
        <Header
          title="Friends"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Friends"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={loadData} />
      </SafeAreaView>
    );
  }

  const hasIncomingRequests = requests.incoming.length > 0;
  const hasOutgoingRequests = requests.outgoing.length > 0;
  const hasRequests = hasIncomingRequests || hasOutgoingRequests;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Friends"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

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
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {activeTab === 'friends' ? (
          <>
            {/* Add New Friends Button */}
            {onAddNewFriends && (
              <TouchableOpacity
                style={styles.addNewFriendsButton}
                onPress={onAddNewFriends}
                activeOpacity={0.8}
              >
                <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
                <Text style={styles.addNewFriendsButtonText}>Add New Friends</Text>
              </TouchableOpacity>
            )}
            
            {friends.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No friends yet"
                message="Search for friends to add them to your network"
                actionLabel="Add Friends"
                onAction={onAddNewFriends || onSearchFriends}
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
                    <Avatar
                      avatarUrl={friend?.friend?.profile?.avatarUrl}
                      displayName={getUserDisplayName(friend)}
                      size={48}
                    />
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{getUserDisplayName(friend)}</Text>
                      {!friend?.friend?.profile?.displayName && friend?.friend?.email && (
                        <Text style={styles.friendEmail}>{friend.friend.email}</Text>
                      )}
                    </View>
                  </View>
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
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="inbox" size={20} color="#6366F1" />
                      <Text style={styles.sectionTitle}>Incoming Requests</Text>
                      {hasIncomingRequests && (
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{requests.incoming.length}</Text>
                        </View>
                      )}
                    </View>
                    {requests.incoming.map((request) => (
                      <TouchableOpacity
                        key={request.id}
                        style={[styles.requestCard, styles.incomingRequestCard]}
                        onPress={() => {
                          if (onNavigateToUserProfile) {
                            onNavigateToUserProfile(request.friendId);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.requestCardContent}>
                          <View style={styles.friendInfo}>
                            <Avatar
                              avatarUrl={request?.friend?.profile?.avatarUrl}
                              displayName={getUserDisplayName(request)}
                              size={48}
                              borderColor="#6366F1"
                              borderWidth={2}
                            />
                            <View style={styles.friendDetails}>
                              <Text style={styles.friendName}>{getUserDisplayName(request)}</Text>
                              {!request?.friend?.profile?.displayName && request?.friend?.email && (
                                <Text style={styles.friendEmail}>{request.friend.email}</Text>
                              )}
                              <View style={styles.requestTimeContainer}>
                                <MaterialIcons name="schedule" size={14} color="#9CA3AF" />
                                <Text style={styles.requestTime}>
                                  {formatDate(request.createdAt)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.requestActions}>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.acceptButton]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleAcceptRequest(request.id);
                              }}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons name="check" size={18} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.rejectButton]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRejectRequest(request.id);
                              }}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons name="close" size={18} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {hasOutgoingRequests && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="send" size={20} color="#6B7280" />
                      <Text style={styles.sectionTitle}>Outgoing Requests</Text>
                    </View>
                    {requests.outgoing.map((request) => (
                      <TouchableOpacity
                        key={request.id}
                        style={[styles.requestCard, styles.outgoingRequestCard]}
                        onPress={() => {
                          if (onNavigateToUserProfile) {
                            onNavigateToUserProfile(request.friendId);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.requestCardContent}>
                          <View style={styles.friendInfo}>
                            <Avatar
                              avatarUrl={request?.friend?.profile?.avatarUrl}
                              displayName={getUserDisplayName(request)}
                              size={48}
                              borderColor="#F59E0B"
                              borderWidth={2}
                            />
                            <View style={styles.friendDetails}>
                              <Text style={styles.friendName}>{getUserDisplayName(request)}</Text>
                              {!request?.friend?.profile?.displayName && request?.friend?.email && (
                                <Text style={styles.friendEmail}>{request.friend.email}</Text>
                              )}
                              <View style={styles.requestTimeContainer}>
                                <MaterialIcons name="schedule" size={14} color="#9CA3AF" />
                                <Text style={styles.requestTime}>
                                  Sent {formatDate(request.createdAt)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.pendingBadge}>
                            <MaterialIcons name="hourglass-empty" size={16} color="#F59E0B" />
                            <Text style={styles.pendingText}>Pending</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerActionButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
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
    backgroundColor: '#6366F1',
    borderRadius: 12,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  incomingRequestCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  outgoingRequestCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  requestCardContent: {
    padding: 16,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  requestTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  removeButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
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
  addNewFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addNewFriendsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

