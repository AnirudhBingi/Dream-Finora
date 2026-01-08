import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getGroups, Group } from '../api/groupApi';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonGroupList } from '../components/SkeletonLoader';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { useBottomNavPadding } from '../hooks/useBottomNavPadding';
import { getAvatarUrl } from '../utils/avatar';

interface GroupListScreenProps {
  onCreateGroup: () => void;
  onViewGroup: (groupId: string) => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GroupListScreen({
  onCreateGroup,
  onViewGroup,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GroupListScreenProps) {
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const limit = 20;
  const bottomPadding = useBottomNavPadding(true);

  useEffect(() => {
    loadGroups(true);
  }, [token]);

  async function loadGroups(reset: boolean = false) {
    if (!token) return;

    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const currentOffset = reset ? 0 : offset;
      const groupsData = await getGroups(token, limit, currentOffset);
      
      // Handle paginated response
      let groupsList: Group[];
      let paginationInfo: { hasMore: boolean; total: number } | null = null;
      
      if (Array.isArray(groupsData)) {
        groupsList = groupsData;
      } else {
        groupsList = groupsData.groups || [];
        paginationInfo = {
          hasMore: groupsData.hasMore || false,
          total: groupsData.total || 0,
        };
      }
      
      if (reset) {
        setGroups(groupsList);
        setOffset(limit);
      } else {
        setGroups(prev => [...prev, ...groupsList]);
        setOffset(prev => prev + limit);
      }
      
      if (paginationInfo) {
        setHasMore(paginationInfo.hasMore);
      }
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await loadGroups(false);
  }

  function getUserDisplayName(groupUser: Group['createdByUser']): string {
    if (!groupUser) return 'Unknown';
    if (groupUser.id === user?.id) return 'you';
    return groupUser.profile?.displayName || groupUser.email || 'Unknown';
  }

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups;
    }
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Circles"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <SkeletonGroupList count={5} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Circles"
        onBack={onBack}
        rightContent={
          <TouchableOpacity
            onPress={onCreateGroup}
            style={styles.headerButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Create new circle"
          >
            <MaterialIcons name="add" size={24} color="#6366F1" />
          </TouchableOpacity>
        }
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadGroups(true)}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            if (hasMore && !loadingMore) {
              loadMore();
            }
          }
        }}
        scrollEventThrottle={400}
      >
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadGroups(true)}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar */}
          {groups.length > 0 && (
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#6B7280" />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search circles..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    searchInputRef.current?.blur();
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Create Circle Button - Prominent */}
          {filteredGroups.length > 0 && (
            <TouchableOpacity
              style={styles.createCircleButton}
              onPress={onCreateGroup}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.createCircleButtonText}>Create Circle</Text>
            </TouchableOpacity>
          )}

          {filteredGroups.length === 0 && groups.length > 0 ? (
            <EmptyState
              icon="search"
              title="No circles found"
              message="Try adjusting your search query."
            />
          ) : filteredGroups.length === 0 ? (
            <EmptyState
              icon="group"
              title="No circles yet"
              message="Create a circle to start splitting bills with friends!"
              actionLabel="Create Circle"
              onAction={onCreateGroup}
            />
          ) : (
            filteredGroups.map((group) => {
              const memberCount = group.members?.length || 0;
              const expenseCount = group._count?.expenses || 0;
              const choreCount = group._count?.chores || 0;
              const rideCount = group._count?.rides || 0;
              const messageCount = group._count?.messages || 0;
              // Get first 4 members for avatar preview
              const previewMembers = (group.members || []).slice(0, 4);
              const remainingMembers = Math.max(0, memberCount - 4);
              
              // Generate group color based on name (consistent)
              const groupInitial = group.name.charAt(0).toUpperCase();
              const groupColors = [
                { bg: '#EEF2FF', icon: '#6366F1' }, // Indigo
                { bg: '#FDF2F8', icon: '#EC4899' }, // Pink
                { bg: '#F0FDF4', icon: '#10B981' }, // Green
                { bg: '#FEF3C7', icon: '#F59E0B' }, // Amber
                { bg: '#E0E7FF', icon: '#8B5CF6' }, // Purple
                { bg: '#DBEAFE', icon: '#3B82F6' }, // Blue
              ];
              const colorIndex = group.name.charCodeAt(0) % groupColors.length;
              const groupColor = groupColors[colorIndex];
              
              // Calculate activity level (for now based on expenses, later can include all features)
              const activityLevel = expenseCount > 10 ? 'high' : expenseCount > 0 ? 'medium' : 'low';

              return (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupCard}
                  onPress={() => onViewGroup(group.id)}
                  activeOpacity={0.7}
                >
                  {/* Group Icon/Header Section */}
                  <View style={styles.groupCardHeader}>
                    <View style={{ position: 'relative' }}>
                      <Avatar
                        avatarUrl={getAvatarUrl(group.avatarUrl || null)}
                        displayName={group.name}
                        size={56}
                        />
                      {/* Group Icon Badge */}
                      {group.icon && (
                        <View style={styles.groupIconBadge}>
                          <MaterialIcons
                            name={group.icon as any}
                            size={16}
                            color="#6366F1"
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.groupHeaderContent}>
                      <View style={styles.groupTitleRow}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        {activityLevel === 'high' && (
                          <View style={styles.activityBadge}>
                            <View style={styles.activityDot} />
                            <Text style={styles.activityBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      {group.description && group.description.trim() && group.description.trim() !== 'Check' && (
                        <Text style={styles.groupDescription} numberOfLines={1}>
                          {group.description}
                        </Text>
                      )}
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                  </View>

                  {/* Activity Stats Grid - All 4 Features */}
                  <View style={styles.activityStatsGrid}>
                    <View style={styles.activityStatItem}>
                      <View style={[styles.activityStatIcon, { backgroundColor: '#EEF2FF' }]}>
                        <MaterialIcons name="receipt" size={18} color="#6366F1" />
                      </View>
                      <View style={styles.activityStatContent}>
                        <Text style={styles.activityStatValue}>{expenseCount}</Text>
                        <Text style={styles.activityStatLabel}>Billchops</Text>
                      </View>
                    </View>
                    <View style={styles.activityStatItem}>
                      <View style={[styles.activityStatIcon, { backgroundColor: '#F0FDF4' }]}>
                        <MaterialIcons name="check-circle" size={18} color="#10B981" />
                      </View>
                      <View style={styles.activityStatContent}>
                        <Text style={styles.activityStatValue}>{choreCount}</Text>
                        <Text style={styles.activityStatLabel}>Chores</Text>
                      </View>
                    </View>
                    <View style={styles.activityStatItem}>
                      <View style={[styles.activityStatIcon, { backgroundColor: '#DBEAFE' }]}>
                        <MaterialIcons name="directions-car" size={18} color="#3B82F6" />
                      </View>
                      <View style={styles.activityStatContent}>
                        <Text style={styles.activityStatValue}>{rideCount}</Text>
                        <Text style={styles.activityStatLabel}>Rides</Text>
                      </View>
                    </View>
                    <View style={styles.activityStatItem}>
                      <View style={[styles.activityStatIcon, { backgroundColor: '#FDF2F8' }]}>
                        <MaterialIcons name="chat" size={18} color="#EC4899" />
                      </View>
                      <View style={styles.activityStatContent}>
                        <Text style={styles.activityStatValue}>{messageCount}</Text>
                        <Text style={styles.activityStatLabel}>Messages</Text>
                      </View>
                    </View>
                  </View>

                  {/* Member Avatars Preview */}
                  {previewMembers.length > 0 && (
                    <View style={styles.membersPreview}>
                      <View style={styles.avatarsContainer}>
                        {previewMembers.map((member, index) => {
                          const displayName = member.user?.profile?.displayName || member.user?.email || 'Unknown';
                          return (
                            <View
                              key={member.id}
                              style={[
                                styles.avatarWrapper,
                                index > 0 && { marginLeft: -8 }, // Overlap avatars
                              ]}
                            >
                              <Avatar
                                avatarUrl={member.user?.profile?.avatarUrl}
                                displayName={displayName}
                                size={36}
                                borderWidth={2}
                                borderColor="#FFFFFF"
                              />
                            </View>
                          );
                        })}
                        {remainingMembers > 0 && (
                          <View style={[styles.avatarWrapper, styles.avatarMore, { marginLeft: -8 }]}>
                            <View style={styles.avatarMoreContainer}>
                              <Text style={styles.avatarMoreText}>+{remainingMembers}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <Text style={styles.membersPreviewText}>
                        {memberCount} member{memberCount !== 1 ? 's' : ''} • Created by {getUserDisplayName(group.createdByUser)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
          {hasMore && filteredGroups.length > 0 && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMore}
              disabled={loadingMore}
              activeOpacity={0.7}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 24, // lg: 24px
  },
  content: {
    paddingHorizontal: 16, // base: 16px (matching Billchop patterns)
    paddingTop: 16,
  },
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // lg: 24px
  },
  loadingText: {
    marginTop: 16, // md: 16px
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
  },
  errorContainer: {
    padding: 16, // md: 16px
    backgroundColor: '#FEF2F2', // Red-50
    borderRadius: 8, // Button: 8px
    marginBottom: 16, // md: 16px
  },
  errorText: {
    fontSize: 14, // Body: 14px
    color: '#EF4444', // Red-500
    marginBottom: 8, // sm: 8px
  },
  retryButton: {
    backgroundColor: '#EF4444', // Red-500
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32, // xl: 32px
  },
  emptyText: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#374151', // Gray-700
    marginBottom: 8, // sm: 8px
  },
  emptySubtext: {
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
    textAlign: 'center',
    marginBottom: 24, // lg: 24px
  },
  emptyButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  createCircleButton: {
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
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  createCircleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  groupImage: {
    width: '100%',
    height: '100%',
  },
  groupIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  groupIconText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  groupHeaderContent: {
    flex: 1,
    gap: 4,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    flex: 1,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  activityStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: '45%',
  },
  activityStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  activityStatContent: {
    flex: 1,
  },
  activityStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  activityStatValueEmpty: {
    color: '#9CA3AF',
    opacity: 0.6,
  },
  activityStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  membersPreview: {
    gap: 12,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarMore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarMoreContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  membersPreviewText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  loadMoreButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
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
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

