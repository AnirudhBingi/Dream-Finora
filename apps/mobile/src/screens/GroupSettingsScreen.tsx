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
  Image,
  Platform,
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
  uploadGroupAvatar,
  GroupWithExpenses,
  GroupMemberRole,
} from '../api/groupApi';
import { Header } from '../components/Header';
import { getAvatarUrl } from '../utils/avatar';
import { pickImage } from '../utils/imagePicker';
import { Avatar } from '../components/Avatar';
import { getApiBaseUrl } from '../api/getApiBaseUrl';

const GROUP_ICONS = [
  { name: 'group', label: 'Group' },
  { name: 'home', label: 'Home' },
  { name: 'people', label: 'People' },
  { name: 'family-restroom', label: 'Family' },
  { name: 'work', label: 'Work' },
  { name: 'school', label: 'School' },
  { name: 'sports-soccer', label: 'Sports' },
  { name: 'restaurant', label: 'Dining' },
  { name: 'flight', label: 'Travel' },
  { name: 'favorite', label: 'Favorites' },
  { name: 'star', label: 'Star' },
  { name: 'celebration', label: 'Celebration' },
];

function getUserDisplayName(user: any): string {
  if (!user) return 'Unknown';
  return user.profile?.displayName || user.email || 'Unknown';
}

interface GroupSettingsScreenProps {
  groupId: string;
  onBack: () => void;
  onGroupUpdated?: () => void;
  onAddMember?: (groupId: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GroupSettingsScreen({
  groupId,
  onBack,
  onGroupUpdated,
  onAddMember,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GroupSettingsScreenProps) {
  const { token, user } = useAuth();
  const [group, setGroup] = useState<GroupWithExpenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('group');
  const [circleImageUri, setCircleImageUri] = useState<string | null>(null);

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
      // TODO: Load group icon and image when backend supports it
      // setSelectedIcon(groupData.icon || 'group');
      // setCircleImageUri(groupData.imageUrl || null);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load group');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  async function handlePickCircleImage() {
    try {
      const uri = await pickImage({ aspect: [1, 1] });
      if (uri) {
        setCircleImageUri(uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
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
      
      // Upload avatar if a new image was selected
      if (circleImageUri && circleImageUri.startsWith('file://')) {
        try {
          const filename = circleImageUri.split('/').pop() || 'image.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          await uploadGroupAvatar(token, groupId, circleImageUri, filename, type);
          console.log('[GroupSettingsScreen] Group avatar uploaded');
        } catch (avatarErr) {
          console.error('[GroupSettingsScreen] Failed to upload avatar:', avatarErr);
          // Continue with group update even if avatar upload fails
        }
      }
      
      await updateGroup(token, groupId, {
        name: name.trim(),
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


  function isUserAdmin(): boolean {
    if (!group || !user) return false;
    // Creator is always an admin
    if (group.createdBy === user.id) return true;
    // Check if user is in members array with ADMIN role
    if (!group.members || !Array.isArray(group.members)) return false;
    const member = group.members.find(m => m.userId === user.id);
    return member?.role === 'ADMIN';
  }

  function canUserEdit(): boolean {
    if (!group || !user) return false;
    // If allowMemberEditing is true, any member can edit
    if (group.allowMemberEditing) {
      // Check if user is a member
      if (!group.members || !Array.isArray(group.members)) return false;
      const member = group.members.find(m => m.userId === user.id);
      return !!member; // Any member can edit if allowMemberEditing is true
    }
    // Otherwise, only admins can edit
    return isUserAdmin();
  }

  function isUserCreator(): boolean {
    return group?.createdBy === user?.id;
  }

  function getUserDisplayName(user: any): string {
    if (!user) return 'Unknown';
    return user.profile?.displayName || user.email || 'Unknown';
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
        <Header
          title="Circle Settings"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Circle not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin = isUserAdmin();
  const isCreator = isUserCreator();
  const canEdit = canUserEdit();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Circle Settings"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          {/* Circle Information Section - Always visible */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Circle Information</Text>
            
            {/* Circle Picture/Icon */}
            <View style={styles.circleInfoCard}>
              <View style={styles.circleInfoHeader}>
                {group.avatarUrl ? (
                  <Image
                    source={{
                      uri: group.avatarUrl.startsWith('http')
                        ? group.avatarUrl
                        : `${getApiBaseUrl()}${group.avatarUrl}`,
                    }}
                    style={styles.circleInfoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.circleInfoIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={[styles.circleInfoIconText, { color: '#6366F1' }]}>
                      {group.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.circleInfoDetails}>
                  <Text style={styles.circleInfoName}>{group.name}</Text>
                  {group.description && group.description.trim() && group.description.trim() !== 'Check' && (
                    <Text style={styles.circleInfoDescription} numberOfLines={2}>
                      {group.description}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Edit Group Info Section - Only if user can edit */}
          {canEdit && (
            <View style={styles.section}>
              {/* Circle Picture - Centered */}
              <View style={styles.imagePickerSection}>
                <TouchableOpacity
                  style={styles.imagePickerContainer}
                  onPress={handlePickCircleImage}
                  activeOpacity={0.7}
                >
                  {circleImageUri ? (
                    <Image
                      source={{ uri: circleImageUri }}
                      style={styles.circleImagePreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <MaterialIcons name="add-photo-alternate" size={32} color="#9CA3AF" />
                      <Text style={styles.imagePickerText}>Tap to add picture</Text>
                    </View>
                  )}
                  {circleImageUri && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setCircleImageUri(null)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Circle Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Circle name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Icon Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Icon</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.iconPicker}
                  contentContainerStyle={styles.iconPickerContent}
                >
                  {GROUP_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon.name}
                      style={[
                        styles.iconOption,
                        selectedIcon === icon.name && styles.iconOptionSelected,
                      ]}
                      onPress={() => setSelectedIcon(icon.name)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={icon.name as any}
                        size={32}
                        color={selectedIcon === icon.name ? '#2563EB' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.iconLabel,
                          selectedIcon === icon.name && styles.iconLabelSelected,
                        ]}
                      >
                        {icon.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Members Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Members</Text>
                <Text style={styles.sectionSubtitle}>
                  {(group.members || []).length} member{(group.members || []).length !== 1 ? 's' : ''}
                </Text>
              </View>
              {isAdmin && onAddMember && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onAddMember(groupId)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="person-add" size={18} color="#6366F1" />
                  <Text style={styles.addButtonText}>Add</Text>
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
                  <Avatar
                    avatarUrl={member.user?.profile?.avatarUrl}
                    displayName={getUserDisplayName(member.user) || 'Unknown'}
                    size={44}
                    borderWidth={2}
                    borderColor="#FFFFFF"
                  />
                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>
                        {isCurrentUser ? 'You' : getUserDisplayName(member.user)}
                      </Text>
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
                    </View>
                    {!member.user?.profile?.displayName && member.user?.email && (
                      <Text style={styles.memberEmail}>{member.user.email}</Text>
                    )}
                  </View>
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
                            size={16}
                            color="#2563EB"
                          />
                          <Text style={styles.actionButtonText}>
                            {member.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.removeButton]}
                          onPress={() => handleRemoveMember(member.id, getUserDisplayName(member.user))}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="person-remove" size={16} color="#EF4444" />
                          <Text style={[styles.actionButtonText, styles.removeButtonText]}>
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
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
                      <Avatar
                        avatarUrl={member.user?.profile?.avatarUrl}
                        displayName={getUserDisplayName(member.user) || 'Unknown'}
                        size={44}
                        borderWidth={2}
                        borderColor="#FFFFFF"
                      />
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>{getUserDisplayName(member.user)}</Text>
                        {!member.user?.profile?.displayName && member.user?.email && (
                          <Text style={styles.memberEmail}>{member.user.email}</Text>
                        )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
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
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 52,
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
  circleInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  circleInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  circleInfoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  circleInfoIconText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  circleInfoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  circleInfoDetails: {
    flex: 1,
    gap: 4,
  },
  circleInfoName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  circleInfoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  addButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
        elevation: 1,
      },
    }),
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  memberBadges: {
    flexDirection: 'row',
    gap: 6,
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
    flexShrink: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 13,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  imagePickerContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  circleImagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconPicker: {
    marginTop: 8,
  },
  iconPickerContent: {
    gap: 12,
    paddingVertical: 4,
  },
  iconOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minWidth: 80,
    marginRight: 8,
  },
  iconOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  iconLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  iconLabelSelected: {
    color: '#2563EB',
    fontWeight: '500',
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

