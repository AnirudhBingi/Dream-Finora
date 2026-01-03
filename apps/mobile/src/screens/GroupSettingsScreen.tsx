import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import {
  getGroupById,
  updateGroup,
  deleteGroup,
  changeMemberRole,
  transferOwnership,
  leaveGroup,
  removeGroupMember,
  GroupWithExpenses,
  GroupMemberRole,
} from '../api/groupApi';

interface GroupSettingsScreenProps {
  groupId: string;
  onBack: () => void;
  onGroupUpdated?: () => void;
  onAddMember?: (groupId: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
}

export function GroupSettingsScreen({
  groupId,
  onBack,
  onGroupUpdated,
  onAddMember,
  onNavigateToUserProfile,
}: GroupSettingsScreenProps) {
  const { token, user } = useAuth();
  const [group, setGroup] = useState<GroupWithExpenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadGroup();
  }, [token, groupId]);

  async function loadGroup() {
    if (!token) return;

    try {
      setLoading(true);
      const groupData = await getGroupById(token, groupId);
      setGroup(groupData);
      setName(groupData.name);
      setDescription(groupData.description || '');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load group');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!token || !group) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    try {
      setSaving(true);
      await updateGroup(token, groupId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      Alert.alert('Success', 'Group updated successfully', [
        { text: 'OK', onPress: () => {
          onGroupUpdated?.();
          loadGroup();
        }},
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup() {
    if (!token) return;

    Alert.alert(
      'Delete Circle',
      'Are you sure you want to delete this circle? This will delete all expenses, chores, and member data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(token, groupId);
              Alert.alert('Success', 'Circle deleted successfully', [
                { text: 'OK', onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete circle');
            }
          },
        },
      ],
    );
  }

  async function handleLeaveGroup() {
    if (!token) return;

    Alert.alert(
      'Leave Circle',
      'Are you sure you want to leave this circle? You will no longer have access to its expenses and chores.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(token, groupId);
              Alert.alert('Success', 'You have left the circle', [
                { text: 'OK', onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to leave circle');
            }
          },
        },
      ],
    );
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!token) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGroupMember(token, groupId, memberId);
              Alert.alert('Success', 'Member removed successfully');
              loadGroup();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove member');
            }
          },
        },
      ],
    );
  }

  async function handleChangeRole(memberId: string, currentRole: GroupMemberRole) {
    if (!token) return;

    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    
    try {
      await changeMemberRole(token, groupId, memberId, newRole);
      Alert.alert('Success', `Member role changed to ${newRole}`);
      loadGroup();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to change member role');
    }
  }

  async function handleTransferOwnership(newOwnerId: string, newOwnerName: string) {
    if (!token) return;

    Alert.alert(
      'Transfer Ownership',
      `Are you sure you want to transfer ownership to ${newOwnerName}? You will remain as an admin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async () => {
            try {
              await transferOwnership(token, groupId, newOwnerId);
              Alert.alert('Success', 'Ownership transferred successfully');
              loadGroup();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to transfer ownership');
            }
          },
        },
      ],
    );
  }

  function getUserDisplayName(member: GroupWithExpenses['members'][0]): string {
    if (!member?.user) return 'Unknown';
    return member.user.profile?.displayName || member.user.email || 'Unknown';
  }

  function isUserAdmin(): boolean {
    if (!group || !user) return false;
    // Creator is always an admin
    if (group.createdBy === user.id) return true;
    // Check if user is in members array with ADMIN role
    if (!group.members || !Array.isArray(group.members)) return false;
    const member = group.members.find(m => m.userId === user.id);
    return member?.role === 'ADMIN';
  }

  function isUserCreator(): boolean {
    return group?.createdBy === user?.id;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading circle settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Circle not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin = isUserAdmin();
  const isCreator = isUserCreator();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Circle Settings</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Edit Group Info Section */}
          {isAdmin && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Circle Information</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Circle name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Circle description (optional)"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Members Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Members</Text>
              {isAdmin && onAddMember && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onAddMember(groupId)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="person-add" size={20} color="#2563EB" />
                  <Text style={styles.addButtonText}>Add Member</Text>
                </TouchableOpacity>
              )}
            </View>
            {(group.members || []).map((member) => {
              const isCurrentUser = member.userId === user?.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberCard}
                  onPress={() => {
                    if (!isCurrentUser && onNavigateToUserProfile) {
                      onNavigateToUserProfile(member.userId);
                    }
                  }}
                  activeOpacity={isCurrentUser ? 1 : 0.7}
                  disabled={isCurrentUser}
                >
                <View style={styles.memberInfo}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                        {(getUserDisplayName(member) || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>
                        {isCurrentUser ? 'You' : getUserDisplayName(member)}
                    </Text>
                      <Text style={styles.memberEmail}>{member.user?.email || 'No email'}</Text>
                  </View>
                </View>
                <View style={styles.memberActions}>
                  <View style={styles.memberBadges}>
                    {member.userId === group.createdBy && (
                      <View style={[styles.badge, styles.creatorBadge]}>
                        <MaterialIcons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.badgeText}>Creator</Text>
                      </View>
                    )}
                    {member.role === 'ADMIN' && member.userId !== group.createdBy && (
                      <View style={[styles.badge, styles.adminBadge]}>
                        <MaterialIcons name="admin-panel-settings" size={12} color="#2563EB" />
                        <Text style={styles.badgeText}>Admin</Text>
                      </View>
                    )}
                  </View>
                  {isAdmin && member.userId !== user?.id && (
                    <View style={styles.actionButtons}>
                      {member.userId !== group.createdBy && (
                        <>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleChangeRole(member.id, member.role)}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons
                              name={member.role === 'ADMIN' ? 'person' : 'admin-panel-settings'}
                              size={18}
                              color="#2563EB"
                            />
                            <Text style={styles.actionButtonText}>
                              {member.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.removeButton]}
                            onPress={() => handleRemoveMember(member.id, getUserDisplayName(member))}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="person-remove" size={18} color="#EF4444" />
                            <Text style={[styles.actionButtonText, styles.removeButtonText]}>
                              Remove
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Transfer Ownership Section */}
          {isCreator && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transfer Ownership</Text>
              <Text style={styles.sectionDescription}>
                Transfer ownership to another member. They will become the creator and you will remain as an admin.
              </Text>
              {(group.members || [])
                .filter(m => m.userId !== user?.id)
                .map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.transferCard}
                    onPress={() => handleTransferOwnership(member.userId, getUserDisplayName(member))}
                    activeOpacity={0.7}
                  >
                    <View style={styles.memberInfo}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {(getUserDisplayName(member) || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>{getUserDisplayName(member)}</Text>
                        <Text style={styles.memberEmail}>{member.user?.email || 'No email'}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="arrow-forward" size={20} color="#2563EB" />
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
            {!isCreator && (
              <TouchableOpacity
                style={[styles.dangerButton, styles.leaveButton]}
                onPress={handleLeaveGroup}
                activeOpacity={0.7}
              >
                <MaterialIcons name="exit-to-app" size={20} color="#EF4444" />
                <Text style={styles.dangerButtonText}>Leave Circle</Text>
              </TouchableOpacity>
            )}
            {isCreator && (
              <TouchableOpacity
                style={[styles.dangerButton, styles.deleteButton]}
                onPress={handleDeleteGroup}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                <Text style={styles.dangerButtonText}>Delete Circle</Text>
              </TouchableOpacity>
            )}
          </View>
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
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
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
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  memberCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  memberActions: {
    gap: 8,
  },
  memberBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creatorBadge: {
    backgroundColor: '#FEF3C7',
  },
  adminBadge: {
    backgroundColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  removeButton: {
    borderColor: '#EF4444',
  },
  removeButtonText: {
    color: '#EF4444',
  },
  transferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dangerSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    borderWidth: 1,
  },
  leaveButton: {
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  deleteButton: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
});

