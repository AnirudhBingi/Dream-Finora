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
import { createGroup, CreateGroupDto } from '../api/groupApi';
import { getFriends, Friend } from '../api/friendApi';

interface CreateGroupScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

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

export function CreateGroupScreen({ onBack, onSuccess }: CreateGroupScreenProps) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('group');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMobile, setInviteMobile] = useState('');
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) {
      loadFriends();
    }
  }, [token]);

  async function loadFriends() {
    if (!token) return;

    try {
      setLoadingFriends(true);
      const friendsData = await getFriends(token);
      setFriends(friendsData);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  }

  function toggleMember(friendId: string) {
    setSelectedMemberIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  }

  function getUserDisplayName(friend: Friend): string {
    return friend?.friend?.profile?.displayName || friend?.friend?.email || 'Unknown';
  }

  async function handleInviteToGroup() {
    // This function is called when user clicks "Send Invitation" in the invite form
    // The actual invitation will be sent after group creation in handleSave
    // For now, we'll just validate and show a message
    const email = inviteEmail.trim();
    const mobile = inviteMobile.trim();

    if (!email && !mobile) {
      Alert.alert('Error', 'Please enter an email or mobile number');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    Alert.alert(
      'Invitation Ready',
      'The invitation will be sent after you create the circle.',
      [{ text: 'OK' }]
    );
  }

  async function handleSave() {
    if (!token) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a circle name');
      return;
    }

    try {
      setSaving(true);

      const groupData: CreateGroupDto = {
        name: name.trim(),
        description: description.trim() || undefined,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
      };

      const group = await createGroup(token, groupData);

      // If there are pending invitations, send them now
      if (showInviteForm && (inviteEmail.trim() || inviteMobile.trim())) {
        try {
          const email = inviteEmail.trim();
          const mobile = inviteMobile.trim();
          
          if (email || mobile) {
            await inviteGroupMember(token, group.id, {
              email: email || undefined,
              mobileNumber: mobile || undefined,
            });
          }
        } catch (inviteErr) {
          console.error('Failed to send invitation:', inviteErr);
          // Don't block group creation if invitation fails
          Alert.alert(
            'Circle Created',
            'Circle created successfully, but invitation could not be sent. You can invite from circle settings.',
            [{ text: 'OK', onPress: onSuccess }]
          );
          return;
        }
      }

      Alert.alert('Success', 'Circle created successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create circle');
    } finally {
      setSaving(false);
    }
  }

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
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Circle</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Circle Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Roommates, Friends, Family"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a description for this group"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

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

            <View style={styles.inputGroup}>
              <View style={styles.memberSectionHeader}>
                <View>
                  <Text style={styles.label}>Add Members</Text>
                  <Text style={styles.helperText}>
                    Select friends to add to your circle. You can add more later.
                  </Text>
                </View>
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowInviteForm(!showInviteForm);
                      if (showInviteForm) {
                        setInviteEmail('');
                        setInviteMobile('');
                      }
                    }}
                    style={styles.inviteToggleButton}
                  >
                    <MaterialIcons name="person-add" size={18} color="#2563EB" />
                    <Text style={styles.inviteToggleText}>
                      {showInviteForm ? 'Hide' : 'Invite'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowMemberPicker(!showMemberPicker)}
                    style={styles.toggleButton}
                  >
                    <Text style={styles.toggleButtonText}>
                      {showMemberPicker ? 'Hide' : 'Select Friends'}
                    </Text>
                    <MaterialIcons
                      name={showMemberPicker ? 'expand-less' : 'expand-more'}
                      size={20}
                      color="#2563EB"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {showInviteForm && (
                <View style={styles.inviteForm}>
                  <Text style={styles.inviteFormTitle}>Invite by Email or Phone</Text>
                  <Text style={styles.inviteFormSubtitle}>
                    Invite someone who isn't your friend yet. They'll receive an invitation to join the app and this circle.
                  </Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <Text style={styles.orText}>OR</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mobile Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+1234567890"
                      value={inviteMobile}
                      onChangeText={setInviteMobile}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.inviteButton, inviting && styles.inviteButtonDisabled]}
                    onPress={handleInviteToGroup}
                    disabled={inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.inviteButtonText}>Send Invitation</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              
              {selectedMemberIds.length > 0 && (
                <View style={styles.selectedMembersContainer}>
                  <Text style={styles.selectedMembersText}>
                    {selectedMemberIds.length} friend{selectedMemberIds.length !== 1 ? 's' : ''} selected
                  </Text>
                </View>
              )}

              {showMemberPicker && (
                <View style={styles.memberPickerContainer}>
                  {loadingFriends ? (
                    <ActivityIndicator size="small" color="#2563EB" style={styles.loadingIndicator} />
                  ) : friends.length === 0 ? (
                    <View style={styles.emptyFriendsContainer}>
                      <MaterialIcons name="people-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.emptyFriendsText}>No friends yet</Text>
                      <Text style={styles.emptyFriendsSubtext}>
                        Add friends to invite them to your circle
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.friendsList}>
                      {friends.map((friend) => {
                        const isSelected = selectedMemberIds.includes(friend.friendId);
                        return (
                          <TouchableOpacity
                            key={friend.id}
                            style={[
                              styles.friendCard,
                              isSelected && styles.friendCardSelected,
                            ]}
                            onPress={() => toggleMember(friend.friendId)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.friendInfo}>
                              <View style={styles.friendAvatar}>
                                <Text style={styles.friendAvatarText}>
                                  {(getUserDisplayName(friend) || 'U').charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.friendDetails}>
                                <Text style={styles.friendName}>{getUserDisplayName(friend)}</Text>
                                <Text style={styles.friendEmail}>{friend?.friend?.email || 'No email'}</Text>
                              </View>
                            </View>
                            {isSelected && (
                              <MaterialIcons name="check-circle" size={24} color="#2563EB" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color="#2563EB" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                You'll be automatically added as a member. Add friends now or invite others by email/phone later from group settings.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Create Circle</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
    marginBottom: 24, // lg: 24px
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
  headerTitle: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
  },
  placeholder: {
    width: 60, // Match back button width
  },
  form: {
    marginTop: 8, // sm: 8px
  },
  inputGroup: {
    marginBottom: 24, // lg: 24px
  },
  label: {
    fontSize: 12, // Labels: 12px
    fontWeight: '500', // Medium
    color: '#374151', // Gray-700
    marginBottom: 4, // xs: 4px
    textTransform: 'uppercase', // Labels: Uppercase
    letterSpacing: 0.5, // Labels: Letter-spacing: 0.5px
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB', // Gray-300
    borderRadius: 8, // Input: 8px
    padding: 12, // md: 12px (3 * 4px)
    paddingHorizontal: 16, // md: 16px
    fontSize: 16, // Input: 16px (prevents zoom on iOS)
    color: '#111827', // Gray-900
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12, // md: 12px (3 * 4px)
  },
  infoBox: {
    backgroundColor: '#F3F4F6', // Gray-100
    borderRadius: 8, // Button: 8px
    padding: 16, // md: 16px
    marginBottom: 24, // lg: 24px
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12, // md: 12px
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
    lineHeight: 21, // 1.5 line-height
  },
  saveButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12, // md: 12px (3 * 4px)
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB', // Primary Blue
  },
  cancelButtonText: {
    color: '#2563EB', // Primary Blue
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
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
  memberSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  selectedMembersContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  selectedMembersText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  memberPickerContainer: {
    marginTop: 12,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  loadingIndicator: {
    padding: 20,
  },
  emptyFriendsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyFriendsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyFriendsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  friendsList: {
    padding: 8,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  friendCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  friendEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inviteToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  inviteToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  inviteForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inviteFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  inviteFormSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginVertical: 12,
    fontWeight: '500',
  },
  inviteButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

