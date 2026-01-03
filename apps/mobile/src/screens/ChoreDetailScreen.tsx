import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getChoreById, completeChore, grabChore, assignChore, deleteChore, Chore } from '../api/choreApi';
import { getGroupById, GroupMember } from '../api/groupApi';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';

interface ChoreDetailScreenProps {
  choreId: string;
  onBack: () => void;
  onRefresh: () => void;
  onEdit?: () => void;
  onViewHistory?: () => void;
}

export function ChoreDetailScreen({
  choreId,
  onBack,
  onRefresh,
  onEdit,
  onViewHistory,
}: ChoreDetailScreenProps) {
  const { token, user } = useAuth();
  const [chore, setChore] = useState<Chore | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  useEffect(() => {
    loadChore();
  }, [choreId, token]);

  async function loadChore() {
    if (!token) return;

    try {
      setLoading(true);
      const choreData = await getChoreById(token, choreId);
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
      Alert.alert('Success', 'Chore grabbed! You will earn bonus points.', [
        { text: 'OK', onPress: () => {
          loadChore();
          onRefresh();
        }},
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to grab chore',
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
      Alert.alert('Success', 'Chore assigned successfully', [
        { text: 'OK', onPress: () => {
          loadChore();
          onRefresh();
        }},
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to assign chore',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!token) return;

    Alert.alert(
      'Complete Chore',
      'Are you sure you want to mark this chore as complete?',
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
                `Chore completed! You earned ${pointsEarned} points.`,
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
                err instanceof Error ? err.message : 'Failed to complete chore',
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
      'Delete Chore',
      'Are you sure you want to delete this chore? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteChore(token, choreId);
              Alert.alert('Success', 'Chore deleted successfully', [
                { text: 'OK', onPress: () => {
                  onRefresh();
                  onBack();
                }},
              ]);
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete chore',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  function getUserDisplayName(user: Chore['createdByUser']): string {
    if (!user) return 'Unknown';
    return user?.profile?.displayName || user?.email || 'Unknown';
  }

  function getStatusColor(status: Chore['status']): string {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // Amber-500
      case 'assigned':
        return '#3B82F6'; // Blue-500
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chore Details</Text>
          <View style={styles.placeholder} />
        </View>
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (!chore) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chore Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState message="Chore not found" onRetry={loadChore} />
      </SafeAreaView>
    );
  }

  const isAssignedToMe = chore.assignedTo === user?.id;
  const canGrab = chore.status === 'pending' && !chore.assignedTo;
  const canComplete = chore.status === 'assigned' && isAssignedToMe;
  const canAssign = chore.status === 'pending' || (chore.status === 'assigned' && chore.createdBy === user?.id);
  const canEdit = chore.createdBy === user?.id && chore.status !== 'completed';
  const canDelete = chore.createdBy === user?.id;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.headerActions}>
              {onViewHistory && (
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={onViewHistory}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="history" size={24} color="#2563EB" />
                </TouchableOpacity>
              )}
              {canEdit && onEdit && (
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={onEdit}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="edit" size={24} color="#2563EB" />
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                  disabled={actionLoading}
                >
                  <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.choreCard}>
            <View style={styles.choreHeader}>
              <Text style={styles.choreTitle}>{chore.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(chore.status) }]}>
                <Text style={styles.statusText}>{getStatusText(chore.status)}</Text>
              </View>
            </View>

            {chore.description && (
              <Text style={styles.choreDescription}>{chore.description}</Text>
            )}

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Points:</Text>
                <Text style={styles.infoValue}>
                  {chore.points} {canGrab && `(+${Math.round(chore.points * 0.5)} bonus)`}
                </Text>
              </View>

              {chore.group && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Group:</Text>
                  <Text style={styles.infoValue}>{chore.group.name}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created by:</Text>
                <Text style={styles.infoValue}>{getUserDisplayName(chore.createdByUser)}</Text>
              </View>

              {chore.assignedToUser && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Assigned to:</Text>
                  <Text style={styles.infoValue}>{getUserDisplayName(chore.assignedToUser)}</Text>
                </View>
              )}

              {chore.dueDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Due date:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(chore.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {chore.completedAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Completed:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(chore.completedAt).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {chore.completions && chore.completions.length > 0 && (
                <View style={styles.completionSection}>
                  <Text style={styles.completionTitle}>Completion History</Text>
                  {chore.completions.map((completion) => (
                    <View key={completion.id} style={styles.completionItem}>
                      <Text style={styles.completionText}>
                        {completion.user?.profile?.displayName || completion.user?.email || 'Unknown'} - {completion.pointsEarned} points
                      </Text>
                      <Text style={styles.completionDate}>
                        {new Date(completion.completedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {!chore.completedAt && (
            <View style={styles.actions}>
              {canGrab && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.grabButton]}
                  onPress={handleGrab}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      Grab Chore (+{Math.round(chore.points * 0.5)} bonus)
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {canAssign && members.length > 0 && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.assignButton]}
                    onPress={() => setShowAssignMenu(!showAssignMenu)}
                    activeOpacity={0.7}
                  >
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
                        >
                          <Text style={styles.assignMenuItemText}>
                            {member?.user?.profile?.displayName || member?.user?.email || 'Unknown'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {canComplete && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={handleComplete}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>Mark as Complete</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
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
    paddingHorizontal: 24, // lg: 24px
    // No paddingTop - SafeAreaView handles top spacing
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // md: 16px
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 4, // xs: 4px
    minHeight: 44, // Touch target
  },
  backButtonText: {
    fontSize: 16, // Body: 16px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // lg: 24px
  },
  errorText: {
    fontSize: 16, // Body: 16px
    color: '#EF4444', // Red-500
    marginBottom: 16, // md: 16px
  },
  choreCard: {
    backgroundColor: '#fff',
    borderRadius: 12, // Card: 12px
    padding: 16, // md: 16px
    marginBottom: 16, // md: 16px
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  choreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // md: 12px
  },
  choreTitle: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4, // xs: 4px
    paddingHorizontal: 8, // sm: 8px
    borderRadius: 4, // xs: 4px
  },
  statusText: {
    fontSize: 12, // Small: 12px
    color: '#fff',
    fontWeight: '500', // Medium
  },
  choreDescription: {
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
    marginBottom: 16, // md: 16px
    lineHeight: 24, // Body line height
  },
  infoSection: {
    paddingTop: 16, // md: 16px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12, // md: 12px
  },
  infoLabel: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
    fontWeight: '500', // Medium
  },
  infoValue: {
    fontSize: 14, // Body: 14px
    color: '#111827', // Gray-900
  },
  completionSection: {
    marginTop: 16, // md: 16px
    paddingTop: 16, // md: 16px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  completionTitle: {
    fontSize: 16, // Body: 16px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginBottom: 12, // md: 12px
  },
  completionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8, // sm: 8px
  },
  completionText: {
    fontSize: 14, // Body: 14px
    color: '#374151', // Gray-700
  },
  completionDate: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
  },
  actions: {
    marginTop: 16, // md: 16px
  },
  actionButton: {
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12, // md: 12px
  },
  grabButton: {
    backgroundColor: '#F59E0B', // Amber-500
  },
  assignButton: {
    backgroundColor: '#3B82F6', // Blue-500
  },
  completeButton: {
    backgroundColor: '#10B981', // Green-500
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  assignMenu: {
    backgroundColor: '#F9FAFB', // Gray-50
    borderRadius: 8, // Button: 8px
    padding: 8, // sm: 8px
    marginBottom: 12, // md: 12px
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  assignMenuItem: {
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 16, // md: 16px
    borderRadius: 4, // xs: 4px
    marginBottom: 4, // xs: 4px
  },
  assignMenuItemText: {
    fontSize: 16, // Body: 16px
    color: '#111827', // Gray-900
  },
});

