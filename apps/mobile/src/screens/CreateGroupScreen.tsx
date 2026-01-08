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
// Note: Icon component will fallback to MaterialIcons for icons not in navigationIconMap
import { useAuth } from '../auth/authContext';
import { createGroup, CreateGroupDto, inviteGroupMember, uploadGroupAvatar } from '../api/groupApi';
import { getFriends, Friend } from '../api/friendApi';
import { pickImage } from '../utils/imagePicker';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';

interface CreateGroupScreenProps {
  onBack: () => void;
  onSuccess: (groupId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
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

export function CreateGroupScreen({ 
  onBack, 
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreateGroupScreenProps) {
  const { token } = useAuth();
  const [name, setName] = useState('');
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
  const [circleImageUri, setCircleImageUri] = useState<string | null>(null);
  const [allowMemberEditing, setAllowMemberEditing] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) {
      loadFriends();
    }
  }, [token]);

  async function loadFriends() {
    if (!token) return;

    try {
      setLoadingFriends(true);
      console.log('[CreateGroupScreen] Loading friends...');
      const friendsData = await getFriends(token);
      console.log('[CreateGroupScreen] Raw friends response:', friendsData);
      console.log('[CreateGroupScreen] Is array?', Array.isArray(friendsData));
      console.log('[CreateGroupScreen] Type:', typeof friendsData);
      
      // Ensure friendsData is an array
      const friendsArray = Array.isArray(friendsData) ? friendsData : [];
      console.log('[CreateGroupScreen] Friends loaded:', friendsArray.length);
      if (friendsArray.length > 0) {
        console.log('[CreateGroupScreen] First friend:', JSON.stringify(friendsArray[0], null, 2));
      }
      setFriends(friendsArray);
    } catch (err) {
      console.error('[CreateGroupScreen] Failed to load friends:', err);
      Alert.alert('Error', 'Failed to load friends. Please try again.');
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }

  function toggleMember(friendId: string) {
    console.log('[CreateGroupScreen] toggleMember called with friendId:', friendId);
    setSelectedMemberIds((prev) => {
      console.log('[CreateGroupScreen] Previous selectedMemberIds:', prev);
      const newIds = prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId];
      console.log('[CreateGroupScreen] New selectedMemberIds:', newIds);
      return newIds;
    });
  }

  function getUserDisplayName(friend: Friend): string {
    return friend?.friend?.profile?.displayName || friend?.friend?.email || 'Unknown';
  }

  const filteredFriends = friends.filter((friend) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const displayName = getUserDisplayName(friend).toLowerCase();
    const email = friend?.friend?.email?.toLowerCase() || '';
    return displayName.includes(query) || email.includes(query);
  });

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
    if (!token) return;

    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Circle name is required');
      return;
    }
    if (trimmedName.length < 2) {
      setNameError('Circle name must be at least 2 characters');
      return;
    }
    setNameError(null);

    try {
      setSaving(true);

      const groupData: CreateGroupDto = {
        name: name.trim(),
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
        allowMemberEditing,
        icon: selectedIcon,
      };

      console.log('[CreateGroupScreen] Creating group with data:', groupData);
      console.log('[CreateGroupScreen] Selected member IDs:', selectedMemberIds);
      const group = await createGroup(token, groupData);
      console.log('[CreateGroupScreen] Group created:', group);

      // Upload circle image if selected
      if (circleImageUri && circleImageUri.startsWith('file://')) {
        try {
          const filename = circleImageUri.split('/').pop() || 'image.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          await uploadGroupAvatar(token, group.id, circleImageUri, filename, type);
          console.log('[CreateGroupScreen] Group avatar uploaded');
        } catch (avatarErr) {
          console.error('[CreateGroupScreen] Failed to upload avatar:', avatarErr);
          // Don't block group creation if avatar upload fails
        }
      }

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
            [{ text: 'OK', onPress: () => onSuccess(group.id) }]
          );
          return;
        }
      }

      Alert.alert('Success', 'Circle created successfully!', [
        { text: 'OK', onPress: () => onSuccess(group.id) },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create circle');
    } finally {
      setSaving(false);
    }
  }

  console.log('[CreateGroupScreen] Render - friends.length:', friends.length);
  console.log('[CreateGroupScreen] Render - loadingFriends:', loadingFriends);
  console.log('[CreateGroupScreen] Render - showMemberPicker:', showMemberPicker);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Create Circle"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          <View style={styles.form}>
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

            {/* Circle Name Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>CIRCLE NAME</Text>
              <TextInput
                style={[styles.input, nameError && styles.inputError]}
                placeholder="e.g., Roommates, Friends, Family"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError(null);
                }}
                autoCapitalize="words"
                placeholderTextColor="#9CA3AF"
              />
              {nameError && (
                <Text style={styles.errorText}>{nameError}</Text>
              )}
            </View>

            {/* Icon Selection Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>ICON</Text>
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
                      size={28}
                      color={selectedIcon === icon.name ? '#6366F1' : '#6B7280'}
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

            {/* Editing Permissions Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>EDITING PERMISSIONS</Text>
              <Text style={styles.helperText}>
                Choose who can edit circle details (name, icon, picture)
              </Text>
              <View style={styles.permissionOptions}>
                <TouchableOpacity
                  style={[
                    styles.permissionOption,
                    !allowMemberEditing && styles.permissionOptionActive,
                  ]}
                  onPress={() => setAllowMemberEditing(false)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={!allowMemberEditing ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={!allowMemberEditing ? '#6366F1' : '#9CA3AF'}
                  />
                  <View style={styles.permissionOptionContent}>
                    <Text style={[
                      styles.permissionOptionTitle,
                      !allowMemberEditing && styles.permissionOptionTitleActive,
                    ]}>
                      Admin Only
                    </Text>
                    <Text style={styles.permissionOptionDescription}>
                      Only admins can edit circle details
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.permissionOption,
                    allowMemberEditing && styles.permissionOptionActive,
                  ]}
                  onPress={() => setAllowMemberEditing(true)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={allowMemberEditing ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={allowMemberEditing ? '#6366F1' : '#9CA3AF'}
                  />
                  <View style={styles.permissionOptionContent}>
                    <Text style={[
                      styles.permissionOptionTitle,
                      allowMemberEditing && styles.permissionOptionTitleActive,
                    ]}>
                      All Members
                    </Text>
                    <Text style={styles.permissionOptionDescription}>
                      Any member can edit circle details
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Add Members Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>ADD MEMBERS</Text>
              <Text style={styles.helperText}>
                Select friends to add to your circle. You can add more later.
              </Text>
              
              <View style={styles.memberActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowInviteForm(!showInviteForm);
                    if (showInviteForm) {
                      setShowMemberPicker(false);
                      setInviteEmail('');
                      setInviteMobile('');
                    }
                  }}
                  style={[styles.actionButton, showInviteForm && styles.actionButtonActive]}
                >
                  <Icon name="person-add" size={18} color="#6366F1" />
                  <Text style={styles.actionButtonText}>
                    {showInviteForm ? 'Hide Invite' : 'Invite'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowMemberPicker(!showMemberPicker);
                    if (showMemberPicker) {
                      setShowInviteForm(false);
                    }
                  }}
                  style={[styles.actionButton, showMemberPicker && styles.actionButtonActive]}
                >
                  <Icon name="people" size={18} color="#6366F1" />
                  <Text style={styles.actionButtonText}>
                    {showMemberPicker ? 'Hide Friends' : 'Select Friends'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar for Friends */}
              {showMemberPicker && (
                <View style={styles.searchContainer}>
                  <Icon name="search" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9CA3AF"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearSearchButton}
                    >
                      <Icon name="close" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

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
                    <ActivityIndicator size="small" color="#6366F1" style={styles.loadingIndicator} />
                  ) : filteredFriends.length === 0 ? (
                    <View style={styles.emptyFriendsContainer}>
                      <Icon name={searchQuery ? "search-off" : "people-outline"} size={48} color="#9CA3AF" />
                      <Text style={styles.emptyFriendsText}>
                        {searchQuery ? 'No friends found' : 'No friends yet'}
                      </Text>
                      <Text style={styles.emptyFriendsSubtext}>
                        {searchQuery 
                          ? 'Try a different search term'
                          : 'Add friends to invite them to your circle'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.friendsList}>
                      {filteredFriends.map((friend) => {
                        const isSelected = selectedMemberIds.includes(friend.friendId);
                        const displayName = getUserDisplayName(friend);
                        return (
                          <TouchableOpacity
                            key={`friend-${friend.friendId}`}
                            style={[
                              styles.friendCard,
                              isSelected && styles.friendCardSelected,
                            ]}
                            onPress={() => toggleMember(friend.friendId)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.friendInfo}>
                              <Avatar
                                avatarUrl={friend?.friend?.profile?.avatarUrl}
                                displayName={displayName}
                                size={40}
                                borderWidth={2}
                                borderColor="#FFFFFF"
                              />
                              <View style={styles.friendDetails}>
                                <Text style={styles.friendName}>{displayName}</Text>
                                {!friend?.friend?.profile?.displayName && friend?.friend?.email && (
                                  <Text style={styles.friendEmail}>{friend.friend.email}</Text>
                                )}
                              </View>
                            </View>
                            {isSelected && (
                              <Icon name="check-circle" size={24} color="#6366F1" />
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
              <Icon name="info-outline" size={20} color="#6366F1" />
              <Text style={styles.infoText}>
                You'll be automatically added as a member. Add friends now or invite others by email/phone later from group settings.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled, (!name.trim() || saving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Create Circle</Text>
              )}
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
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 16,
  },
  form: {
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 52,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  infoBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
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
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  iconLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  iconLabelSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  memberSectionHeader: {
    marginBottom: 12,
  },
  memberSectionTitle: {
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  actionButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  selectedMembersContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  selectedMembersText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  memberPickerContainer: {
    marginTop: 12,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  friendCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
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
  inviteForm: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginVertical: 12,
    fontWeight: '500',
  },
  inviteButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
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
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
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
  permissionOptions: {
    marginTop: 12,
    gap: 12,
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  permissionOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  permissionOptionContent: {
    flex: 1,
    gap: 4,
  },
  permissionOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  permissionOptionTitleActive: {
    color: '#6366F1',
  },
  permissionOptionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});
