import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getChores, Chore } from '../api/choreApi';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonChoreList } from '../components/SkeletonLoader';
import { useBottomNavPadding } from '../hooks/useBottomNavPadding';
import { Avatar } from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';
import { Icon } from '../components/Icon';
import { getChoreCategoryIcon } from '../utils/choreCategoryIcons';
import { HeaderOption } from '../components/Header';

interface ChoreHistoryScreenProps {
  onBack: () => void;
  onViewChore: (choreId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

// Category detection (same as ChoreListScreen)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Cleaning': ['clean', 'vacuum', 'sweep', 'mop', 'dust', 'wipe', 'bathroom', 'kitchen', 'floor', 'dishes', 'dishwasher'],
  'Cooking': ['cook', 'meal', 'dinner', 'lunch', 'breakfast', 'recipe', 'kitchen', 'prepare', 'food'],
  'Shopping': ['shop', 'grocery', 'store', 'buy', 'purchase', 'market', 'mall', 'errand'],
  'Maintenance': ['fix', 'repair', 'maintenance', 'broken', 'install', 'replace', 'tool', 'hardware'],
  'Laundry': ['laundry', 'wash', 'dry', 'clothes', 'clothing', 'fold', 'iron'],
  'Trash & Recycling': ['trash', 'garbage', 'recycle', 'waste', 'bin', 'disposal'],
  'Pet Care': ['pet', 'dog', 'cat', 'walk', 'feed', 'animal', 'vet'],
  'Yard Work': ['yard', 'garden', 'mow', 'lawn', 'plant', 'weed', 'outdoor'],
  'Errands': ['errand', 'pickup', 'drop', 'delivery', 'post office', 'bank'],
  'Organization': ['organize', 'sort', 'arrange', 'tidy', 'declutter', 'storage'],
};

function detectCategory(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  let bestMatch: { category: string; score: number } | null = null;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category, score };
    }
  }
  
  return bestMatch && bestMatch.score >= 1 ? bestMatch.category : null;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#10B981';
    case 'assigned':
      return '#6366F1';
    case 'pending':
      return '#F59E0B';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

function getUserDisplayName(user: any, currentUserId?: string): string {
  if (!user) return 'Unknown';
  if (user.id === currentUserId) return 'You';
  return user.profile?.displayName || user.email || 'Unknown';
}

export function ChoreHistoryScreen({
  onBack,
  onViewChore,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ChoreHistoryScreenProps) {
  const { token, user } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const bottomPadding = useBottomNavPadding(true);

  const headerOptions: HeaderOption[] = [];

  useEffect(() => {
    loadChores(true);
  }, [token]);

  async function loadChores(reset: boolean = false) {
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
      const response = await getChores(token, undefined, limit, currentOffset);
      
      if ('chores' in response) {
        const allChores = reset ? response.chores : [...chores, ...response.chores];
        
        // Filter only completed chores
        const completedChores = allChores.filter(chore => chore.status === 'completed');
        
        setChores(completedChores);
        setHasMore(response.hasMore);
        setOffset(currentOffset + response.chores.length);
      } else {
        const completedChores = reset ? response.filter(c => c.status === 'completed') : [...chores, ...response.filter(c => c.status === 'completed')];
        setChores(completedChores);
        setHasMore(false);
      }
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadChores(true);
  }

  // Separate group and individual chores
  const { groupChores, individualChores } = useMemo(() => {
    const groups: Chore[] = [];
    const individual: Chore[] = [];
    
    chores.forEach(chore => {
      if (chore.groupId) {
        groups.push(chore);
      } else {
        individual.push(chore);
      }
    });
    
    return { groupChores: groups, individualChores: individual };
  }, [chores]);

  if (loading && chores.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Task History"
          onBack={onBack}
          useOptionsMenu={true}
          options={headerOptions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <SkeletonChoreList />
      </SafeAreaView>
    );
  }

  if (error && chores.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Task History"
          onBack={onBack}
          useOptionsMenu={true}
          options={headerOptions}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={() => loadChores(true)} />
      </SafeAreaView>
    );
  }

  const allCompletedChores = [...groupChores, ...individualChores];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Task History"
        onBack={onBack}
        useOptionsMenu={true}
        options={headerOptions}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {allCompletedChores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No completed tasks</Text>
              <Text style={styles.emptyMessage}>
                Completed tasks will appear here after 24 hours
              </Text>
            </View>
          ) : (
            <View style={styles.choresContainer}>
              {allCompletedChores.map((chore) => renderChoreCard(chore))}
              
              {/* Load More */}
              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() => loadChores(false)}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore ? (
                    <ActivityIndicator color="#6366F1" />
                  ) : (
                    <>
                      <Text style={styles.loadMoreText}>Load More</Text>
                      <MaterialIcons name="expand-more" size={20} color="#6366F1" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Render Chore Card with rich information (same as ChoreListScreen)
  function renderChoreCard(chore: Chore) {
    const category = detectCategory(chore.title, chore.description || '');
    const statusColor = getStatusColor(chore.status);
    const isMultipleAssignment = chore.assignmentType === 'multiple' && chore.assignments && chore.assignments.length > 0;
    const isAssignedToMe = chore.assignedToUser?.id === user?.id || 
                          chore.assignments?.some(a => a.userId === user?.id);
    
    // Get group name if it's a group chore
    const groupNameDisplay = chore.group?.name || null;
    
    // Get creator name
    const creatorName = getUserDisplayName(chore.createdByUser, user?.id);
    
    // Check if rotation is enabled
    const hasRotation = chore.rotationEnabled;
    
    // Check if recurring
    const isRecurring = chore.isRecurring;
    
    // Due date info
    const dueDate = chore.dueDate ? new Date(chore.dueDate) : null;
    const completedDate = chore.completedAt ? new Date(chore.completedAt) : null;
    
    return (
      <TouchableOpacity
        key={chore.id}
        style={[styles.choreCard, isAssignedToMe && styles.choreCardHighlighted]}
        onPress={() => onViewChore(chore.id)}
        activeOpacity={0.7}
      >
        {/* Status Indicator Bar */}
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
        
        <View style={styles.choreCardContent}>
          {/* Header Row: Group/Individual Badge + Points */}
          <View style={styles.choreCardHeader}>
            <View style={styles.choreCardBadges}>
              {groupNameDisplay ? (
                <View style={styles.groupBadge}>
                  <Avatar
                    avatarUrl={getAvatarUrl(chore.group?.avatarUrl || null)}
                    displayName={groupNameDisplay}
                    size={32}
                  />
                  <Text style={styles.groupBadgeText} numberOfLines={1}>{groupNameDisplay}</Text>
                </View>
              ) : (
                <View style={styles.personalBadge}>
                  <MaterialIcons name="person" size={12} color="#10B981" />
                  <Text style={styles.personalBadgeText}>Personal</Text>
                </View>
              )}
              
              {isRecurring && (
                <View style={styles.recurringBadge}>
                  <MaterialIcons name="repeat" size={12} color="#8B5CF6" />
                </View>
              )}
              
              {hasRotation && (
                <View style={styles.rotationBadge}>
                  <MaterialIcons name="sync" size={12} color="#F59E0B" />
                </View>
              )}
            </View>
            
            <View style={styles.pointsBadge}>
              <MaterialIcons name="stars" size={18} color="#F59E0B" />
              <Text style={styles.pointsText}>{chore.points}</Text>
            </View>
          </View>
          
          {/* Title Row */}
          <View style={styles.choreTitleRow}>
            <Icon
              name={getChoreCategoryIcon(category || chore.category)}
              size={22}
              color="#374151"
            />
            <Text style={styles.choreTitle} numberOfLines={2}>{chore.title}</Text>
          </View>
          
          {/* Description (if exists) */}
          {chore.description && (
            <Text style={styles.choreDescription} numberOfLines={1}>
              {chore.description}
            </Text>
          )}
          
          {/* Meta Row: Completed date, Created by */}
          <View style={styles.choreMetaRow}>
            {/* Completed Date */}
            {completedDate && (
              <View style={styles.completedDateBadge}>
                <MaterialIcons name="check-circle" size={12} color="#10B981" />
                <Text style={styles.completedDateText}>
                  Completed {completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
            
            {/* Created by */}
            <View style={styles.creatorInfo}>
              <MaterialIcons name="edit" size={12} color="#9CA3AF" />
              <Text style={styles.creatorText}>by {creatorName}</Text>
            </View>
          </View>
          
          {/* Assignment Row */}
          <View style={styles.choreAssignmentRow}>
            {isMultipleAssignment ? (
              <View style={styles.multipleAssignment}>
                <View style={styles.avatarStack}>
                  {chore.assignments!.slice(0, 3).map((assignment, index) => (
                    <Avatar
                      key={assignment.id}
                      avatarUrl={getAvatarUrl(assignment.user?.profile?.avatarUrl || null)}
                      displayName={assignment.user?.profile?.displayName || 'User'}
                      size={36}
                      style={[styles.stackedAvatar, { marginLeft: index > 0 ? -12 : 0, zIndex: 3 - index }]}
                    />
                  ))}
                </View>
                <Text style={styles.assignmentCountText}>
                  {chore.assignments!.length} assigned
                </Text>
                {chore.assignments!.some(a => a.userId === user?.id) && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>incl. you</Text>
                  </View>
                )}
              </View>
            ) : chore.assignedToUser ? (
              <View style={styles.singleAssignment}>
                <Avatar
                  avatarUrl={getAvatarUrl(chore.assignedToUser.profile?.avatarUrl || null)}
                  displayName={getUserDisplayName(chore.assignedToUser, user?.id)}
                  size={36}
                />
                <Text style={styles.assignedToText}>
                  {getUserDisplayName(chore.assignedToUser, user?.id)}
                </Text>
                {chore.assignedToUser.id === user?.id && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>you</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.unassignedText}>Unassigned</Text>
            )}
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                Completed
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  choresContainer: {
    gap: 12,
  },
  choreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  choreCardHighlighted: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  statusBar: {
    height: 4,
    width: '100%',
  },
  choreCardContent: {
    padding: 16,
  },
  choreCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  choreCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    maxWidth: '60%',
  },
  groupBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  personalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  personalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  recurringBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotationBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
  },
  choreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  choreTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  choreDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  choreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  completedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  completedDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  choreAssignmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  multipleAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  assignmentCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  singleAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  assignedToText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  unassignedText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
});
