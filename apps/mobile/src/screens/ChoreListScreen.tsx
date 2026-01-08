import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getChores, Chore, getChoreStats, ChoreStats } from '../api/choreApi';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { SkeletonChoreList } from '../components/SkeletonLoader';
import { useBottomNavPadding } from '../hooks/useBottomNavPadding';
import { Avatar } from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';
import { Icon } from '../components/Icon';
import { getChoreCategoryIcon, getChoreCategoryMaterialIcon } from '../utils/choreCategoryIcons';

interface ChoreListScreenProps {
  onCreateChore: () => void;
  onViewChore: (choreId: string) => void;
  onBack: () => void;
  onViewStats?: () => void;
  onViewHistory?: () => void;
  groupId?: string;
  groupName?: string;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

// Enhanced category detection (matches CreateChoreScreen)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Bathroom Cleaning': ['bathroom', 'toilet', 'shower', 'sink', 'mirror', 'bath', 'restroom'],
  'Kitchen Cleaning': ['kitchen', 'dishes', 'dishwasher', 'sink', 'counter', 'stove', 'oven', 'fridge', 'microwave'],
  'Vacuum': ['vacuum', 'vacuuming', 'carpet', 'rug', 'floor'],
  'Dusting': ['dust', 'dusting', 'shelves', 'furniture', 'surfaces'],
  'Mopping': ['mop', 'mopping', 'floor', 'tile', 'hardwood'],
  'Windows': ['window', 'windows', 'glass', 'clean windows'],
  'Deep Clean': ['deep clean', 'spring clean', 'thorough', 'detailed'],
  'Cooking': ['cook', 'cooking', 'meal', 'dinner', 'lunch', 'breakfast', 'recipe', 'prepare', 'food'],
  'Meal Prep': ['meal prep', 'prep', 'preparation', 'batch cooking'],
  'Baking': ['bake', 'baking', 'cake', 'bread', 'cookies', 'pastry'],
  'Grilling': ['grill', 'grilling', 'bbq', 'barbecue', 'outdoor cooking'],
  'Grocery Shopping': ['grocery', 'groceries', 'supermarket', 'food shopping'],
  'Shopping': ['shop', 'store', 'buy', 'purchase', 'mall', 'retail'],
  'Pickup/Delivery': ['pickup', 'delivery', 'pick up', 'drop off', 'package'],
  'Post Office': ['post office', 'mail', 'postal', 'package', 'letter'],
  'Bank': ['bank', 'banking', 'atm', 'deposit', 'withdrawal'],
  'Pharmacy': ['pharmacy', 'prescription', 'medicine', 'drugstore'],
  'Home Maintenance': ['maintenance', 'repair', 'fix', 'broken', 'install', 'replace'],
  'Plumbing': ['plumbing', 'plumber', 'pipe', 'faucet', 'leak', 'drain'],
  'Electrical': ['electrical', 'electric', 'wiring', 'outlet', 'switch', 'light'],
  'Painting': ['paint', 'painting', 'brush', 'wall', 'room'],
  'Carpentry': ['carpentry', 'wood', 'saw', 'drill', 'furniture', 'cabinet'],
  'Laundry': ['laundry', 'wash', 'washing', 'clothes', 'clothing'],
  'Folding': ['fold', 'folding', 'clothes', 'laundry'],
  'Ironing': ['iron', 'ironing', 'press', 'wrinkles'],
  'Trash & Recycling': ['trash', 'garbage', 'recycle', 'waste', 'bin', 'disposal', 'rubbish'],
  'Compost': ['compost', 'composting', 'organic waste'],
  'Pet Care': ['pet', 'animal', 'feed', 'feeding'],
  'Dog Walk': ['walk', 'dog walk', 'walking', 'dog', 'puppy'],
  'Pet Grooming': ['groom', 'grooming', 'bath', 'brush', 'pet bath'],
  'Yard Work': ['yard', 'outdoor', 'outside'],
  'Mowing': ['mow', 'mowing', 'lawn', 'grass', 'mower'],
  'Gardening': ['garden', 'gardening', 'plant', 'planting', 'flower', 'vegetable'],
  'Snow Removal': ['snow', 'shovel', 'snow removal', 'snow shoveling'],
  'Raking': ['rake', 'raking', 'leaves', 'leaf'],
  'Organization': ['organize', 'organization', 'sort', 'arrange', 'tidy', 'declutter'],
  'Packing': ['pack', 'packing', 'box', 'boxes', 'move'],
  'Unpacking': ['unpack', 'unpacking', 'unbox', 'unboxing'],
  'Childcare': ['childcare', 'babysitting', 'kids', 'children', 'child'],
  'School': ['school', 'homework', 'project', 'assignment'],
  'Car Wash': ['car wash', 'wash car', 'vehicle wash'],
  'Car Maintenance': ['car maintenance', 'vehicle maintenance', 'oil change', 'tire', 'car repair'],
  'Exercise': ['exercise', 'workout', 'gym', 'fitness', 'run', 'jog'],
  'Appointment': ['appointment', 'doctor', 'dentist', 'meeting'],
  'Other': ['other', 'misc', 'miscellaneous'],
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

type MainTab = 'groups' | 'individual';
type FilterTab = 'all' | 'assigned' | 'unassigned';

export function ChoreListScreen({
  onCreateChore,
  onViewChore,
  onBack,
  onViewStats,
  onViewHistory,
  groupId,
  groupName,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ChoreListScreenProps) {
  const { token, user } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [stats, setStats] = useState<ChoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>(groupId ? 'groups' : 'groups');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const bottomPadding = useBottomNavPadding(true);

  useEffect(() => {
    loadChores(true);
    if (onViewStats) {
      loadStats();
    }
  }, [token, groupId]);

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
      // Load all chores (both group and individual)
      const response = await getChores(token, groupId, limit, currentOffset);
      
      let choresList: Chore[] = [];
      if (Array.isArray(response)) {
        choresList = response;
      } else if (response && typeof response === 'object' && 'chores' in response) {
        choresList = (response as any).chores || [];
        const paginationInfo = (response as any).pagination;
        if (paginationInfo) {
          setHasMore(paginationInfo.hasMore || false);
        }
      }
      
      if (reset) {
        setChores(choresList);
        setOffset(limit);
      } else {
        setChores(prev => [...prev, ...choresList]);
        setOffset(prev => prev + limit);
      }
      
      if (choresList.length < limit) {
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

  async function loadStats() {
    if (!token || !onViewStats) return;

    try {
      const statsData = await getChoreStats(token);
      setStats(statsData);
    } catch (err) {
      console.error('[ChoreListScreen] Failed to load stats:', err);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadChores(true), loadStats()]);
  }

  function getUserDisplayName(userData: any, currentUserId?: string): string {
    if (!userData) return 'Unknown';
    if (userData?.id === currentUserId) {
      return 'You';
    }
    return userData?.profile?.displayName || userData?.email || 'Unknown';
  }

  function getStatusColor(status: Chore['status']): string {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'assigned':
        return '#6366F1';
      case 'completed':
        return '#10B981';
      default:
        return '#6B7280';
    }
  }

  // Separate chores into groups and individual
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

  // Get current tab's chores
  const currentTabChores = mainTab === 'groups' ? groupChores : individualChores;

  // Filter out completed chores older than 24 hours
  const activeChores = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return currentTabChores.filter(chore => {
      // Keep all non-completed chores
      if (chore.status !== 'completed') return true;
      
      // For completed chores, only keep if completed within last 24 hours
      if (chore.completedAt) {
        const completedDate = new Date(chore.completedAt);
        return completedDate >= twentyFourHoursAgo;
      }
      
      // If no completedAt date, exclude it (shouldn't happen but safety check)
      return false;
    });
  }, [currentTabChores]);

  // Filter based on active filter
  const filteredChores = useMemo(() => {
    if (activeFilter === 'all') return activeChores;
    if (activeFilter === 'assigned') {
      return activeChores.filter(chore => 
        chore.status === 'assigned' || 
        (chore.status === 'pending' && (chore.assignedTo || (chore.assignments && chore.assignments.length > 0)))
      );
    }
    if (activeFilter === 'unassigned') {
      return activeChores.filter(chore => 
        chore.status === 'pending' && !chore.assignedTo && (!chore.assignments || chore.assignments.length === 0)
      );
    }
    return activeChores;
  }, [activeChores, activeFilter]);

  // Count for filters
  const filterCounts = useMemo(() => {
    const assignedCount = activeChores.filter(c => 
      c.status === 'assigned' || 
      (c.status === 'pending' && (c.assignedTo || (c.assignments && c.assignments.length > 0)))
    ).length;
    
    const unassignedCount = activeChores.filter(c => 
      c.status === 'pending' && !c.assignedTo && (!c.assignments || c.assignments.length === 0)
    ).length;
    
    return {
      all: activeChores.length,
      assigned: assignedCount,
      unassigned: unassignedCount,
    };
  }, [activeChores]);

  if (loading && chores.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Tasks"
          subtitle={groupName || undefined}
          onBack={onBack}
          rightActions={
            onViewHistory ? (
              <TouchableOpacity
                style={styles.headerHistoryButton}
                onPress={onViewHistory}
                activeOpacity={0.7}
              >
                <MaterialIcons name="history" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : undefined
          }
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
          title="Tasks"
          subtitle={groupName || undefined}
          onBack={onBack}
          rightActions={
            onViewHistory ? (
              <TouchableOpacity
                style={styles.headerHistoryButton}
                onPress={onViewHistory}
                activeOpacity={0.7}
              >
                <MaterialIcons name="history" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : undefined
          }
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={() => loadChores(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header
        title="Tasks"
        subtitle={groupName || undefined}
        onBack={onBack}
        rightActions={
          onViewHistory ? (
            <TouchableOpacity
              style={styles.headerHistoryButton}
              onPress={onViewHistory}
              activeOpacity={0.7}
            >
              <MaterialIcons name="history" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : undefined
        }
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Stats Card (larger) */}
          {onViewStats && stats && (
            <TouchableOpacity
              style={styles.statsCard}
              onPress={onViewStats}
              activeOpacity={0.8}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialIcons name="stars" size={20} color="#F59E0B" />
                  <Text style={styles.statValue}>{stats.totalPoints}</Text>
                  <Text style={styles.statLabel}>pts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.statValue}>{stats.totalCompleted}</Text>
                  <Text style={styles.statLabel}>done</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="local-fire-department" size={20} color="#EF4444" />
                  <Text style={styles.statValue}>{stats.currentStreak}</Text>
                  <Text style={styles.statLabel}>streak</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
              </View>
            </TouchableOpacity>
          )}

          {/* Main Tabs: Groups | Individual */}
          <View style={styles.mainTabs}>
            <TouchableOpacity
              style={[styles.mainTab, mainTab === 'groups' && styles.mainTabActive]}
              onPress={() => {
                setMainTab('groups');
                setActiveFilter('all');
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="groups" 
                size={20} 
                color={mainTab === 'groups' ? '#6366F1' : '#6B7280'} 
              />
              <Text style={[styles.mainTabText, mainTab === 'groups' && styles.mainTabTextActive]}>
                Groups
              </Text>
              {groupChores.length > 0 && (
                <View style={[styles.mainTabBadge, mainTab === 'groups' && styles.mainTabBadgeActive]}>
                  <Text style={[styles.mainTabBadgeText, mainTab === 'groups' && styles.mainTabBadgeTextActive]}>
                    {groupChores.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
                  <TouchableOpacity
              style={[styles.mainTab, mainTab === 'individual' && styles.mainTabActive]}
              onPress={() => {
                setMainTab('individual');
                setActiveFilter('all');
              }}
                    activeOpacity={0.7}
                  >
              <MaterialIcons 
                name="person" 
                          size={20} 
                color={mainTab === 'individual' ? '#6366F1' : '#6B7280'} 
                        />
              <Text style={[styles.mainTabText, mainTab === 'individual' && styles.mainTabTextActive]}>
                Individual
              </Text>
              {individualChores.length > 0 && (
                <View style={[styles.mainTabBadge, mainTab === 'individual' && styles.mainTabBadgeActive]}>
                  <Text style={[styles.mainTabBadgeText, mainTab === 'individual' && styles.mainTabBadgeTextActive]}>
                    {individualChores.length}
                        </Text>
                      </View>
                    )}
            </TouchableOpacity>
                          </View>

          {/* Filter Tabs: All | Assigned | Unassigned - Always visible */}
          <View style={styles.filterTabs}>
            {(['all', 'assigned', 'unassigned'] as FilterTab[]).map((filter) => {
              const count = filterCounts[filter];
              const isActive = activeFilter === filter;
              
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {filter === 'all' ? 'All' : filter === 'assigned' ? 'Assigned' : 'Unassigned'}
                  </Text>
                  <View style={[styles.filterTabBadge, isActive && styles.filterTabBadgeActive]}>
                    <Text style={[styles.filterTabBadgeText, isActive && styles.filterTabBadgeTextActive]}>
                      {count}
                          </Text>
                        </View>
                </TouchableOpacity>
              );
            })}
                      </View>

          {/* Chores List */}
          {filteredChores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons 
                name={mainTab === 'groups' ? 'groups' : 'person'} 
                size={48} 
                color="#D1D5DB" 
              />
              <Text style={styles.emptyTitle}>
                {activeFilter === 'all' 
                  ? `No ${mainTab === 'groups' ? 'group' : 'individual'} tasks`
                  : `No ${activeFilter} tasks`}
                            </Text>
              <Text style={styles.emptyMessage}>
                {mainTab === 'groups' 
                  ? 'Create a task in a group to see it here'
                  : 'Create a personal task to get started'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateChore}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Task</Text>
              </TouchableOpacity>
                          </View>
          ) : (
            <View style={styles.choresContainer}>
              {filteredChores.map((chore) => renderChoreCard(chore))}
              
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

      {/* Floating Action Button - Positioned above bottom nav */}
      <TouchableOpacity
        style={[styles.fab, { bottom: bottomPadding + 16 }]}
        onPress={onCreateChore}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
    </SafeAreaView>
  );

  // Render Chore Card with rich information
  function renderChoreCard(chore: Chore) {
                const category = detectCategory(chore.title, chore.description || '');
    const statusColor = getStatusColor(chore.status);
    const isMultipleAssignment = chore.assignmentType === 'multiple' && chore.assignments && chore.assignments.length > 0;
    const isOpenAssignment = chore.assignmentType === 'open';
    const isPending = chore.status === 'pending';
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
    const isOverdue = dueDate && dueDate < new Date() && chore.status !== 'completed';
    
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
            <MaterialIcons
              name={getChoreCategoryMaterialIcon(category || chore.category) as any}
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
          
          {/* Meta Row: Due date, Assignment info */}
          <View style={styles.choreMetaRow}>
            {/* Due Date */}
            {dueDate && (
              <View style={[styles.dueDateBadge, isOverdue && styles.dueDateOverdue]}>
                <MaterialIcons 
                  name="schedule" 
                  size={12} 
                  color={isOverdue ? '#EF4444' : '#6B7280'} 
                />
                <Text style={[styles.dueDateText, isOverdue && styles.dueDateTextOverdue]}>
                  {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
            {isPending && isOpenAssignment ? (
              <TouchableOpacity style={styles.grabButton} activeOpacity={0.7}>
                <MaterialIcons name="pan-tool" size={14} color="#FFFFFF" />
                <Text style={styles.grabButtonText}>Grab Task</Text>
              </TouchableOpacity>
            ) : isMultipleAssignment ? (
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
                {chore.status === 'pending' ? 'Open' : 
                 chore.status === 'assigned' ? 'In Progress' : 'Done'}
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
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  
  // Header
  headerHistoryButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  
  // Compact Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  
  // Main Tabs
  mainTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  mainTabActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  mainTabTextActive: {
    color: '#6366F1',
  },
  mainTabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  mainTabBadgeActive: {
    backgroundColor: '#6366F1',
  },
  mainTabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  mainTabBadgeTextActive: {
    color: '#FFFFFF',
  },
  
  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#6366F1',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterTabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterTabBadgeTextActive: {
    color: '#FFFFFF',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Chores Container
  choresContainer: {
    gap: 12,
  },
  
  // Chore Card
  choreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
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
        elevation: 2,
      },
    }),
  },
  choreCardHighlighted: {
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
  },
  statusBar: {
    height: 3,
    width: '100%',
  },
  choreCardContent: {
    padding: 14,
  },
  choreCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  choreCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    maxWidth: 220,
  },
  groupBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  personalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  personalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  recurringBadge: {
    backgroundColor: '#F3E8FF',
    padding: 4,
    borderRadius: 6,
  },
  rotationBadge: {
    backgroundColor: '#FEF3C7',
    padding: 4,
    borderRadius: 6,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7ED',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
  },
  
  // Title Row
  choreTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  choreTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  choreDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
    marginLeft: 32,
  },
  
  // Meta Row
  choreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginLeft: 32,
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  dueDateOverdue: {
    backgroundColor: '#FEE2E2',
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  dueDateTextOverdue: {
    color: '#EF4444',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  
  // Assignment Row
  choreAssignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  grabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  grabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  multipleAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  singleAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignedToText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  youBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366F1',
  },
  unassignedText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Load More
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
  
  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
