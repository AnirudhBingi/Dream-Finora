import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getChoreById, completeChore, grabChore, assignChore, deleteChore, Chore, completeChoreAssignment, removeChoreAssignment, ChoreAssignment, getRotationOrder, ChoreRotationMember, assignToNextUser, getRotationSchedule, RotationScheduleItem } from '../api/choreApi';
import { getGroupById, GroupMember } from '../api/groupApi';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState } from '../components/ErrorState';
import { Header, HeaderOption } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';
import { Icon } from '../components/Icon';
import { getChoreCategoryIcon, getChoreCategoryMaterialIcon } from '../utils/choreCategoryIcons';

interface ChoreDetailScreenProps {
  choreId: string;
  onBack: () => void;
  onRefresh: () => void;
  onEdit?: () => void;
  onViewHistory?: () => void;
  onNavigateToGroup?: (groupId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

// Category keyword mappings (same as CreateChoreScreen)
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

// Auto-detect category from title and description
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

export function ChoreDetailScreen({
  choreId,
  onBack,
  onRefresh,
  onEdit,
  onViewHistory,
  onNavigateToGroup,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ChoreDetailScreenProps) {
  const { token, user } = useAuth();
  const [chore, setChore] = useState<Chore | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [rotationSchedule, setRotationSchedule] = useState<RotationScheduleItem[]>([]);
  const [rotationScheduleLoading, setRotationScheduleLoading] = useState(false);

  // Header options for the options menu
  const headerOptions: HeaderOption[] = [];

  useEffect(() => {
    loadChore();
  }, [choreId, token]);

  async function loadChore() {
    if (!token) return;

    try {
      setLoading(true);
      const choreData = await getChoreById(token, choreId);
      console.log('[ChoreDetailScreen] Chore data:', {
        id: choreData.id,
        groupId: choreData.groupId,
        group: choreData.group ? {
          id: choreData.group.id,
          name: choreData.group.name,
          avatarUrl: choreData.group.avatarUrl,
        } : null,
      });
      setChore(choreData);

      // Load members if it's a group chore
      if (choreData.groupId) {
        try {
          const groupData = await getGroupById(token, choreData.groupId);
          setMembers(groupData.members || []);
        } catch (err) {
          console.error('Failed to load members:', err);
        }
      }

      // Load rotation schedule if it's a recurring chore with rotation
      if (choreData.isRecurring && choreData.rotationEnabled) {
        try {
          setRotationScheduleLoading(true);
          const schedule = await getRotationSchedule(token, choreId, 10);
          setRotationSchedule(schedule || []);
        } catch (err) {
          console.error('Failed to load rotation schedule:', err);
          // Don't show error to user - schedule is optional
          setRotationSchedule([]);
        } finally {
          setRotationScheduleLoading(false);
        }
      } else {
        // Clear schedule if not recurring or rotation not enabled
        setRotationSchedule([]);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load chore',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGrab() {
    if (!token) return;

    try {
      setActionLoading(true);
      await grabChore(token, choreId);
      Alert.alert('Success', 'Task grabbed! You will earn bonus points.', [
        { text: 'OK', onPress: () => {
          loadChore();
          onRefresh();
        }},
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to grab task',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssign(userId: string) {
    if (!token) return;

    try {
      setActionLoading(true);
      await assignChore(token, choreId, userId);
      setShowAssignMenu(false);
      Alert.alert('Success', 'Task assigned successfully', [
        { text: 'OK', onPress: () => {
          loadChore();
          onRefresh();
        }},
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to assign task',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!token) return;

    Alert.alert(
      'Complete Task',
      'Are you sure you want to mark this task as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setActionLoading(true);
              const result = await completeChore(token, choreId);
              const pointsEarned = result.lastCompletion?.pointsEarned || result.points;
              Alert.alert(
                'Success',
                `Task completed! You earned ${pointsEarned} points.`,
                [
                  { text: 'OK', onPress: () => {
                    loadChore();
                    onRefresh();
                  }},
                ],
              );
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to complete task',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  async function handleDelete() {
    if (!token) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteChore(token, choreId);
              Alert.alert('Success', 'Task deleted successfully', [
                { text: 'OK', onPress: () => {
                  onRefresh();
                  onBack();
                }},
              ]);
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete task',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  function getUserDisplayName(user: Chore['createdByUser'] | Chore['assignedToUser']): string {
    if (!user) return 'Unknown';
    return user?.profile?.displayName || user?.email || 'Unknown';
  }

  function getStatusColor(status: Chore['status']): string {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // Amber-500
      case 'assigned':
        return '#6366F1'; // Indigo-500
      case 'completed':
        return '#10B981'; // Green-500
      default:
        return '#6B7280'; // Gray-500
    }
  }

  function getStatusText(status: Chore['status']): string {
    switch (status) {
      case 'pending':
        return 'Unassigned';
      case 'assigned':
        return 'Assigned';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Task Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (!chore) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Task Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <ErrorState message="Task not found" onRetry={loadChore} />
      </SafeAreaView>
    );
  }

  // Calculate permissions and populate header options
  const isAssignedToMe = chore.assignedTo === user?.id;
  const hasMyAssignment = chore.assignmentType === 'multiple' && chore.assignments?.some(a => a.userId === user?.id && !a.completedAt);
  const canGrab = chore.status === 'pending' && !chore.assignedTo && chore.assignmentType !== 'multiple';
  const canComplete = (chore.status === 'assigned' && isAssignedToMe) || hasMyAssignment;
  const canAssign = chore.status === 'pending' || (chore.status === 'assigned' && chore.createdBy === user?.id);
  const canEdit = chore.createdBy === user?.id && chore.status !== 'completed';
  const canDelete = chore.createdBy === user?.id;
  const detectedCategory = detectCategory(chore.title, chore.description || '');
  const bonusPoints = Math.round(chore.points * 0.5);
  const totalPointsIfUnassigned = chore.points + bonusPoints;

  // Populate header options menu for this chore
  const headerOptionsForChore: HeaderOption[] = [];
  if (onViewHistory) {
    headerOptionsForChore.push({
      label: 'View History',
      icon: 'history',
      onPress: onViewHistory,
    });
  }
  
  if (canEdit && onEdit) {
    headerOptionsForChore.push({
      label: 'Edit Task',
      icon: 'edit',
      onPress: onEdit,
    });
  }
  
  if (canDelete) {
    headerOptionsForChore.push({
      label: 'Delete Task',
      icon: 'delete-outline',
      onPress: handleDelete,
      danger: true,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Task Details"
        onBack={onBack}
        options={headerOptionsForChore}
        useOptionsMenu={true}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Hero Section - Enhanced */}
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <MaterialIcons 
                  name={getChoreCategoryMaterialIcon(detectedCategory || chore.category) as any} 
                  size={40} 
                  color="#6366F1" 
                />
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>{chore.title}</Text>
                {detectedCategory && (
                  <View style={styles.categoryBadge}>
                    <MaterialIcons name="category" size={14} color="#6366F1" />
                    <Text style={styles.categoryBadgeText}>{detectedCategory}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(chore.status) }]}>
              <MaterialIcons 
                name={
                  chore.status === 'completed' ? 'check-circle' :
                  chore.status === 'assigned' ? 'person' :
                  'schedule'
                } 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={styles.statusText}>{getStatusText(chore.status)}</Text>
            </View>
          </View>

          {/* Quick Info Card - Combined Points, Due Date, Assigned To */}
          <View style={styles.quickInfoCard}>
            <View style={styles.quickInfoRow}>
              <View style={styles.quickInfoItem}>
                <MaterialIcons name="stars" size={20} color="#F59E0B" />
                <View style={styles.quickInfoTextContainer}>
                  <Text style={styles.quickInfoLabel}>Points</Text>
                  <View style={styles.quickInfoValueRow}>
                    <Text style={styles.quickInfoValue}>{chore.points}</Text>
                    {canGrab && (
                      <Text style={styles.quickInfoBonus}>+{bonusPoints} bonus</Text>
                    )}
                  </View>
                  {chore.rotationEnabled && chore.rotation && chore.rotation.length > 0 && (
                    <Text style={styles.quickInfoRotationNote}>
                      Each person gets {chore.points} full points when it's their turn
                    </Text>
                  )}
                </View>
              </View>
              {chore.dueDate && (
                <View style={styles.quickInfoDivider} />
              )}
              {chore.dueDate && (
                <View style={styles.quickInfoItem}>
                  <MaterialIcons 
                    name="event" 
                    size={20} 
                    color={new Date(chore.dueDate) < new Date() && !chore.completedAt ? '#EF4444' : '#6366F1'} 
                  />
                  <View style={styles.quickInfoTextContainer}>
                    <Text style={styles.quickInfoLabel}>Due Date</Text>
                    <Text style={[
                      styles.quickInfoValue,
                      new Date(chore.dueDate) < new Date() && !chore.completedAt && styles.quickInfoValueOverdue
                    ]}>
                      {new Date(chore.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            {(chore.assignmentType === 'single' && chore.assignedToUser) && (
              <>
                <View style={styles.quickInfoDividerHorizontal} />
                <View style={styles.quickInfoItem}>
                  <Avatar
                    avatarUrl={getAvatarUrl(chore.assignedToUser?.profile?.avatarUrl || null)}
                    displayName={getUserDisplayName(chore.assignedToUser)}
                    size={32}
                  />
                  <View style={styles.quickInfoTextContainer}>
                    <Text style={styles.quickInfoLabel}>Assigned to</Text>
                    <Text style={styles.quickInfoValue}>{getUserDisplayName(chore.assignedToUser)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Description Card */}
          {chore.description && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Description</Text>
              <Text style={styles.descriptionText}>{chore.description}</Text>
            </View>
          )}

          {/* Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>
            
            {chore.group && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons name="group" size={18} color="#6B7280" />
                  <Text style={styles.detailLabelText}>Group</Text>
                </View>
                {onNavigateToGroup ? (
                  <TouchableOpacity
                    onPress={() => onNavigateToGroup(chore.group!.id)}
                    activeOpacity={0.7}
                    style={styles.linkContainer}
                  >
                    <View style={styles.groupInfoContainer}>
                      <Avatar
                        avatarUrl={chore.group?.avatarUrl || null}
                        displayName={chore.group?.name || 'Unknown Group'}
                        size={40}
                      />
                      <Text style={styles.linkText}>{chore.group?.name}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#6366F1" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.groupInfoContainer}>
                    <Avatar
                      avatarUrl={chore.group?.avatarUrl || null}
                      displayName={chore.group?.name || 'Unknown Group'}
                      size={40}
                    />
                    <Text style={styles.detailValue}>{chore.group?.name}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons name="person" size={18} color="#6B7280" />
                <Text style={styles.detailLabelText}>Created by</Text>
              </View>
              <View style={styles.userContainer}>
                <Avatar
                  avatarUrl={getAvatarUrl(chore.createdByUser?.profile?.avatarUrl || null)}
                  displayName={getUserDisplayName(chore.createdByUser)}
                  size={24}
                />
                <Text style={styles.detailValue}>{getUserDisplayName(chore.createdByUser)}</Text>
              </View>
            </View>

            {/* Friend-to-friend chore */}
            {chore.friendUser && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons name="person" size={18} color="#6B7280" />
                  <Text style={styles.detailLabelText}>Friend</Text>
                </View>
                <View style={styles.userContainer}>
                  <Avatar
                    avatarUrl={getAvatarUrl(chore.friendUser?.profile?.avatarUrl || null)}
                    displayName={chore.friendUser.profile?.displayName || chore.friendUser.email}
                    size={24}
                  />
                  <Text style={styles.detailValue}>
                    {chore.friendUser.id === user?.id ? 'You' : (chore.friendUser.profile?.displayName || chore.friendUser.email)}
                  </Text>
                </View>
              </View>
            )}

            {/* Single assignment */}
            {chore.assignmentType === 'single' && chore.assignedToUser && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons name="assignment-ind" size={18} color="#6B7280" />
                  <Text style={styles.detailLabelText}>Assigned to</Text>
                </View>
                <View style={styles.userContainer}>
                  <Avatar
                    avatarUrl={getAvatarUrl(chore.assignedToUser?.profile?.avatarUrl || null)}
                    displayName={getUserDisplayName(chore.assignedToUser)}
                    size={24}
                  />
                  <Text style={styles.detailValue}>{getUserDisplayName(chore.assignedToUser)}</Text>
                </View>
              </View>
            )}

          {/* Multiple Assignments Card - Full Width Design */}
          {chore.assignmentType === 'multiple' && chore.assignments && chore.assignments.length > 0 && (
            <View style={styles.assignmentsCard}>
              <View style={styles.assignmentsCardHeader}>
                <View style={styles.assignmentsCardHeaderLeft}>
                  <MaterialIcons name="people" size={20} color="#6366F1" />
                  <Text style={styles.assignmentsCardTitle}>Assigned Members</Text>
                </View>
                <Text style={styles.assignmentsCardCount}>{chore.assignments.length}</Text>
              </View>
              
              {/* Progress Summary */}
              {(() => {
                const completedCount = chore.assignments.filter(a => !!a.completedAt).length;
                const totalCount = chore.assignments.length;
                const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                
                return (
                  <View style={styles.assignmentsProgressSection}>
                    <View style={styles.assignmentsProgressBar}>
                      <View 
                        style={[
                          styles.assignmentsProgressFill, 
                          { width: `${progress}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.assignmentsProgressText}>
                      {completedCount} of {totalCount} completed
                    </Text>
                  </View>
                );
              })()}
              
              {/* Members Horizontal Scroll */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.assignmentsScrollContent}
                style={styles.assignmentsScrollView}
              >
                {chore.assignments.map((assignment) => {
                  const isCompleted = !!assignment.completedAt;
                  const isMyAssignment = assignment.userId === user?.id;
                  const displayName = assignment.user?.profile?.displayName || assignment.user?.email || 'Unknown';
                  
                  return (
                    <View 
                      key={assignment.id} 
                      style={[
                        styles.assignmentMemberCard,
                        isMyAssignment && styles.assignmentMemberCardMine,
                        isCompleted && styles.assignmentMemberCardCompleted
                      ]}
                    >
                      <View style={styles.assignmentMemberAvatarWrapper}>
                        <Avatar
                          avatarUrl={assignment.user?.profile?.avatarUrl || null}
                          displayName={displayName}
                          size={48}
                          borderWidth={isMyAssignment ? 3 : 2}
                          borderColor={isMyAssignment ? '#6366F1' : (isCompleted ? '#10B981' : '#E5E7EB')}
                        />
                        {isCompleted && (
                          <View style={styles.assignmentMemberCompletedBadge}>
                            <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                          </View>
                        )}
                        {isMyAssignment && !isCompleted && (
                          <View style={styles.assignmentMemberYouBadge}>
                            <Text style={styles.assignmentMemberYouBadgeText}>You</Text>
                          </View>
                        )}
                      </View>
                      <Text 
                        style={[
                          styles.assignmentMemberName,
                          isMyAssignment && styles.assignmentMemberNameMine,
                          isCompleted && styles.assignmentMemberNameCompleted
                        ]}
                        numberOfLines={1}
                      >
                        {isMyAssignment ? 'You' : displayName}
                      </Text>
                      {isCompleted && assignment.pointsEarned && (
                        <Text style={styles.assignmentMemberPoints}>
                          {assignment.pointsEarned} pts
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}


            {chore.completedAt && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons name="check-circle" size={18} color="#10B981" />
                  <Text style={styles.detailLabelText}>Completed</Text>
                </View>
                <Text style={styles.detailValue}>
                  {new Date(chore.completedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Completion History Card */}
          {chore.completions && chore.completions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Completion History</Text>
              <View style={styles.completionList}>
                {chore.completions.map((completion, index) => (
                  <View 
                    key={completion.id} 
                    style={[
                      styles.completionItem,
                      index < chore.completions!.length - 1 && styles.completionItemBorder
                    ]}
                  >
                    <View style={styles.completionUserInfo}>
                      <Avatar
                        avatarUrl={getAvatarUrl(completion.user?.profile?.avatarUrl || null)}
                        displayName={completion.user?.profile?.displayName || completion.user?.email || 'Unknown'}
                        size={32}
                      />
                      <View style={styles.completionUserDetails}>
                        <Text style={styles.completionUserName}>
                          {completion.user?.profile?.displayName || completion.user?.email || 'Unknown'}
                        </Text>
                        <Text style={styles.completionDate}>
                          {new Date(completion.completedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.completionPoints}>
                      <MaterialIcons name="stars" size={18} color="#F59E0B" />
                      <Text style={styles.completionPointsText}>{completion.pointsEarned}</Text>
                      {completion.onTime && (
                        <View style={styles.onTimeBadge}>
                          <MaterialIcons name="schedule" size={12} color="#10B981" />
                          <Text style={styles.onTimeText}>On time</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recurring & Rotation Info Card */}
          {(chore.isRecurring || chore.rotationEnabled) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Schedule</Text>
              {chore.isRecurring && (
                <View style={styles.scheduleItem}>
                  <View style={styles.scheduleItemHeader}>
                    <MaterialIcons name="repeat" size={20} color="#6366F1" />
                    <Text style={styles.scheduleItemTitle}>Recurring</Text>
                  </View>
                  <View style={styles.scheduleItemContent}>
                    <Text style={styles.scheduleItemValue}>
                      {chore.recurrencePattern ? chore.recurrencePattern.charAt(0).toUpperCase() + chore.recurrencePattern.slice(1) : 'Custom'}
                    </Text>
                    {chore.nextOccurrenceDate && (
                      <Text style={styles.scheduleItemSubtext}>
                        Next: {chore.nextOccurrenceDate ? new Date(chore.nextOccurrenceDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : 'Not scheduled'}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {chore.rotationEnabled && (
                <>
                  {chore.isRecurring && <View style={styles.scheduleDivider} />}
                  <View style={styles.scheduleItem}>
                    <View style={styles.scheduleItemHeader}>
                      <MaterialIcons name="rotate-right" size={20} color="#6366F1" />
                      <Text style={styles.scheduleItemTitle}>Rotation</Text>
                    </View>
                    <View style={styles.scheduleItemContent}>
                      <Text style={styles.scheduleItemValue}>Round-Robin</Text>
                      {chore.rotation && chore.rotation.length > 0 && (
                        <Text style={styles.scheduleItemSubtext}>
                          {chore.rotation.length} member{chore.rotation.length !== 1 ? 's' : ''} in rotation
                        </Text>
                      )}
                      {!chore.isRecurring && (
                        <Text style={[styles.scheduleItemSubtext, { color: '#F59E0B', marginTop: 4 }]}>
                          ⚠️ Rotation works best with recurring tasks. For one-time tasks, it only assigns to the first person.
                        </Text>
                      )}
                      {chore.isRecurring && chore.nextOccurrenceDate && (
                        <Text style={[styles.scheduleItemSubtext, { color: '#6366F1', marginTop: 4, fontWeight: '600' }]}>
                          Next rotation: {chore.nextOccurrenceDate ? new Date(chore.nextOccurrenceDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }) : 'Not scheduled'}
                        </Text>
                      )}
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Rotation Management Section */}
          {chore.rotationEnabled && chore.rotation && chore.rotation.length > 0 && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rotation Order</Text>
                <View style={styles.rotationList}>
                  {chore.rotation
                    .sort((a, b) => a.rotationOrder - b.rotationOrder)
                    .map((rotationMember, index) => {
                      const isSkipped = rotationMember.skipUntil && new Date(rotationMember.skipUntil) > new Date();
                      const lastAssignedDate = rotationMember.lastAssignedAt 
                        ? new Date(rotationMember.lastAssignedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Never';
                      const isCurrentUser = rotationMember.userId === user?.id;
                      return (
                        <View key={rotationMember.id} style={styles.rotationItem}>
                          <View style={styles.rotationItemLeft}>
                            <View style={styles.rotationOrderBadge}>
                              <Text style={styles.rotationOrderText}>{index + 1}</Text>
                            </View>
                            <Avatar
                              avatarUrl={getAvatarUrl(rotationMember.user?.profile?.avatarUrl || null)}
                              displayName={rotationMember.user?.profile?.displayName || rotationMember.user?.email || 'Unknown'}
                              size={32}
                            />
                            <View style={styles.rotationUserInfo}>
                              <Text style={styles.rotationUserName}>
                                {rotationMember.user?.profile?.displayName || rotationMember.user?.email || 'Unknown'}
                                {isCurrentUser && <Text style={styles.youLabel}> (You)</Text>}
                              </Text>
                              <Text style={styles.rotationDetailText}>
                                {chore.isRecurring 
                                  ? `Last: ${lastAssignedDate}`
                                  : chore.assignedTo === rotationMember.userId
                                    ? 'Assigned'
                                    : 'Not assigned'
                                }
                              </Text>
                              {chore.isRecurring && chore.rotation && index === 0 && !rotationMember.lastAssignedAt && (
                                <Text style={styles.rotationNextText}>
                                  Next in rotation
                                </Text>
                              )}
                              {isSkipped && (
                                <View style={styles.skippedBadge}>
                                  <MaterialIcons name="block" size={12} color="#EF4444" />
                                  <Text style={styles.skippedText}>Skipped</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          {chore.assignedTo === rotationMember.userId && (
                            <View style={styles.currentAssigneeBadge}>
                              <MaterialIcons name="person" size={16} color="#6366F1" />
                              <Text style={styles.currentAssigneeText}>Current</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                </View>
              </View>

              {/* Rotation Schedule - Show upcoming assignments for recurring tasks */}
              {chore.isRecurring && rotationSchedule.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Upcoming Schedule</Text>
                  <Text style={styles.scheduleSubtitle}>
                    See when it's each member's turn
                  </Text>
                  {rotationScheduleLoading ? (
                    <ActivityIndicator size="small" color="#6366F1" style={styles.scheduleLoading} />
                  ) : (
                    <View style={styles.scheduleList}>
                      {rotationSchedule.slice(0, 10).map((item, index) => {
                        const assignedMember = members.find(m => m.userId === item.assignedToUserId);
                        const isMyTurn = item.assignedToUserId === user?.id;
                        const dueDateStr = item.dueDate 
                          ? (() => {
                              const date = new Date(item.dueDate);
                              const isDifferentYear = date.getFullYear() !== new Date().getFullYear();
                              return date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                ...(isDifferentYear && { year: 'numeric' }),
                              });
                            })()
                          : 'TBD';
                        const isPast = item.dueDate && new Date(item.dueDate) < new Date();
                        
                        return (
                          <View 
                            key={index} 
                            style={[
                              styles.scheduleItem,
                              isMyTurn && styles.scheduleItemHighlighted,
                              isPast && !item.isAssigned && styles.scheduleItemPast,
                            ]}
                          >
                            <View style={styles.scheduleItemLeft}>
                              <View style={[styles.scheduleNumberBadge, isMyTurn && styles.scheduleNumberBadgeHighlighted]}>
                                <Text style={[styles.scheduleNumberText, isMyTurn && styles.scheduleNumberTextHighlighted]}>
                                  #{item.occurrenceNumber}
                                </Text>
                              </View>
                              <View style={styles.scheduleItemInfo}>
                                <Text style={styles.scheduleItemAssignee}>
                                  {assignedMember 
                                    ? (assignedMember.user?.profile?.displayName || assignedMember.user?.email || 'Unknown')
                                    : 'Unassigned'}
                                  {isMyTurn && <Text style={styles.youLabel}> (You)</Text>}
                                </Text>
                                <Text style={[styles.scheduleItemDate, isPast && !item.isAssigned && styles.scheduleItemDatePast]}>
                                  Due: {dueDateStr}
                                  {item.isAssigned && <Text style={styles.assignedLabel}> • Assigned</Text>}
                                </Text>
                              </View>
                            </View>
                            {isMyTurn && (
                              <View style={styles.yourTurnBadge}>
                                <MaterialIcons name="star" size={16} color="#F59E0B" />
                                <Text style={styles.yourTurnText}>Your Turn</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* Bottom spacing for action buttons */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {!chore.completedAt && (
        <View style={styles.actionButtonsContainer}>
          {canGrab && (
            <TouchableOpacity
              style={[styles.actionButton, styles.grabButton]}
              onPress={handleGrab}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="add-task" size={20} color="#FFFFFF" />
                  <View style={styles.actionButtonTextContainer}>
                    <Text style={styles.actionButtonText}>Grab Task</Text>
                    <Text style={styles.actionButtonSubtext}>
                      +{bonusPoints} bonus = {totalPointsIfUnassigned} points
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}

          {canAssign && members.length > 0 && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.assignButton]}
                onPress={() => setShowAssignMenu(!showAssignMenu)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Assign to Member</Text>
              </TouchableOpacity>

              {showAssignMenu && (
                <View style={styles.assignMenu}>
                  {members.map((member) => (
                    <TouchableOpacity
                      key={member?.user?.id}
                      style={styles.assignMenuItem}
                      onPress={() => handleAssign(member?.user?.id || '')}
                      disabled={actionLoading}
                      activeOpacity={0.7}
                    >
                      <Avatar
                        avatarUrl={getAvatarUrl(member?.user?.profile?.avatarUrl || null)}
                        displayName={member?.user?.profile?.displayName || member?.user?.email || 'Unknown'}
                        size={32}
                      />
                      <Text style={styles.assignMenuItemText}>
                        {member?.user?.profile?.displayName || member?.user?.email || 'Unknown'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {canComplete && chore.assignmentType !== 'multiple' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleComplete}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark as Complete</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {/* Multiple assignments completion button */}
          {chore.assignmentType === 'multiple' && hasMyAssignment && (() => {
            const myAssignment = chore.assignments?.find(a => a.userId === user?.id && !a.completedAt);
            if (!myAssignment) return null;
            
            return (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={async () => {
                  if (!token) return;
                  try {
                    setActionLoading(true);
                    await completeChoreAssignment(token, choreId, myAssignment.id);
                    Alert.alert('Success', 'Assignment completed!', [
                      { text: 'OK', onPress: () => {
                        loadChore();
                        onRefresh();
                      }},
                    ]);
                  } catch (err) {
                    Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete assignment');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Complete My Assignment</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })()}
        </View>
      )}
    </SafeAreaView>
  );
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
    paddingBottom: 100, // Space for action buttons
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerActionsContainer: {
    position: 'relative',
    marginLeft: 8,
  },
  headerMoreButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 180,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
    zIndex: 1000,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  actionMenuItemDanger: {
    // Keep same structure but different text color
  },
  actionMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  actionMenuItemTextDanger: {
    color: '#EF4444',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  quickInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  quickInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  quickInfoDividerHorizontal: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  quickInfoTextContainer: {
    flex: 1,
  },
  quickInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickInfoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  quickInfoValueOverdue: {
    color: '#EF4444',
  },
  quickInfoBonus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  quickInfoRotationNote: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6366F1',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  statusIcon: {
    marginRight: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  pointsContainer: {
    gap: 12,
  },
  pointsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F59E0B',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  bonusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  bonusTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailLabelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  groupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completionList: {
    gap: 0,
  },
  completionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  completionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  completionUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  completionUserDetails: {
    flex: 1,
  },
  completionUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  completionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  completionPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completionPointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  onTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  onTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  bottomSpacer: {
    height: 20,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  grabButton: {
    backgroundColor: '#F59E0B',
  },
  assignButton: {
    backgroundColor: '#6366F1',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  actionButtonTextContainer: {
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  actionButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.9,
    marginTop: 2,
  },
  assignMenu: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
  },
  assignMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  assignMenuItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  assignmentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  assignmentsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assignmentsCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignmentsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  assignmentsCardCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignmentsProgressSection: {
    marginBottom: 16,
    gap: 8,
  },
  assignmentsProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  assignmentsProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  assignmentsProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  assignmentsScrollView: {
    marginHorizontal: -16, // Offset card padding
  },
  assignmentsScrollContent: {
    paddingHorizontal: 16, // Restore padding for content
    gap: 12,
  },
  assignmentMemberCard: {
    width: 100,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  assignmentMemberCardMine: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  assignmentMemberCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#D1FAE5',
    opacity: 0.8,
  },
  assignmentMemberAvatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  assignmentMemberCompletedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#10B981',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  assignmentMemberYouBadge: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    transform: [{ translateX: -20 }],
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  assignmentMemberYouBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assignmentMemberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  assignmentMemberNameMine: {
    color: '#6366F1',
    fontWeight: '700',
  },
  assignmentMemberNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  assignmentMemberPoints: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
  },
  assignmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assignmentUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  assignmentUserInfo: {
    flex: 1,
  },
  assignmentUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  completedBadgeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  completeAssignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  completeAssignmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  multipleAssignmentHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    marginTop: 8,
  },
  multipleAssignmentHintText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
    flex: 1,
  },
  recurringInfoContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  recurringPatternText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  recurringNextText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  scheduleItemContainer: {
    marginBottom: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scheduleItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  scheduleItemContent: {
    marginLeft: 28,
  },
  scheduleItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 4,
  },
  scheduleItemSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  scheduleSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    marginTop: 4,
  },
  scheduleLoading: {
    marginVertical: 16,
  },
  scheduleList: {
    marginTop: 8,
    gap: 8,
  },
  scheduleItemHighlighted: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
    borderWidth: 2,
  },
  scheduleItemPast: {
    opacity: 0.6,
    borderColor: '#FCA5A5',
  },
  scheduleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scheduleNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleNumberBadgeHighlighted: {
    backgroundColor: '#6366F1',
  },
  scheduleNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  scheduleNumberTextHighlighted: {
    color: '#FFFFFF',
  },
  scheduleItemInfo: {
    flex: 1,
  },
  scheduleItemAssignee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  scheduleItemDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  scheduleItemDatePast: {
    color: '#EF4444',
    fontWeight: '500',
  },
  assignedLabel: {
    color: '#10B981',
    fontWeight: '500',
  },
  yourTurnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yourTurnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  youLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  rotationList: {
    gap: 8,
  },
  rotationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rotationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rotationOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotationOrderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rotationUserInfo: {
    flex: 1,
  },
  rotationUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  rotationDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rotationNextText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 2,
  },
  skippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  skippedText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
  currentAssigneeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  currentAssigneeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366F1',
  },
});
