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
import { getFriends, Friend } from '../api/friendApi';
import { addGroupMember, getGroupById, GroupMemberRole, inviteGroupMember } from '../api/groupApi';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { SkeletonFriendList } from '../components/SkeletonLoader';
import { getAvatarUrl } from '../utils/avatar';

interface AddGroupMemberScreenProps {
  groupId: string;
  onBack: () => void;
  onMemberAdded?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function AddGroupMemberScreen({
  groupId,
  onBack,
  onMemberAdded,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: AddGroupMemberScreenProps) {
  const { token, user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMobile, setInviteMobile] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadData();
  }, [token, groupId]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      
      // Load friends and group data separately so friends still load if group data fails
      let friendsData: Friend[] = [];
      let memberIds: string[] = [];
      
      try {
        console.log('[AddGroupMemberScreen] Loading friends...');
        const friendsResponse = await getFriends(token);
        console.log('[AddGroupMemberScreen] Raw friends response:', friendsResponse);
        console.log('[AddGroupMemberScreen] Is array?', Array.isArray(friendsResponse));
        console.log('[AddGroupMemberScreen] Type:', typeof friendsResponse);
        
        // Ensure friendsData is an array
        friendsData = Array.isArray(friendsResponse) ? friendsResponse : [];
        console.log('[AddGroupMemberScreen] Friends loaded:', friendsData.length);
        if (friendsData.length > 0) {
          console.log('[AddGroupMemberScreen] First friend:', JSON.stringify(friendsData[0], null, 2));
        }
      } catch (friendsErr) {
        console.error('[AddGroupMemberScreen] Failed to load friends:', friendsErr);
        Alert.alert('Error', 'Failed to load friends. Please try again.');
        setFriends([]);
        return;
      }
      
      try {
        console.log('[AddGroupMemberScreen] Loading group data for groupId:', groupId);
        const groupData = await getGroupById(token, groupId);
        console.log('[AddGroupMemberScreen] Group data keys:', Object.keys(groupData));
        console.log('[AddGroupMemberScreen] Group data.members:', groupData.members);
        console.log('[AddGroupMemberScreen] Group data.GroupMember:', groupData.GroupMember);
        
        // Get existing member IDs from group (handle both GroupMember and members for compatibility)
        const members = groupData.members || groupData.GroupMember || [];
        console.log('[AddGroupMemberScreen] Members array length:', members.length);
        console.log('[AddGroupMemberScreen] First member:', members.length > 0 ? JSON.stringify(members[0], null, 2) : 'none');
        
        memberIds = Array.isArray(members) 
          ? members.map((m: any) => {
              const id = m.userId || m.user?.id;
              console.log('[AddGroupMemberScreen] Member mapping:', { userId: m.userId, 'user?.id': m.user?.id, result: id });
              return id;
            }).filter((id: any) => id != null)
          : [];
        console.log('[AddGroupMemberScreen] Group member IDs extracted:', memberIds.length, memberIds);
        setExistingMemberIds(memberIds);
      } catch (groupErr) {
        console.error('[AddGroupMemberScreen] Failed to load group data:', groupErr);
        // Continue without filtering - show all friends even if group data failed
        memberIds = [];
        setExistingMemberIds([]);
      }
      
      // Filter out friends who are already members
      console.log('[AddGroupMemberScreen] Filtering friends. Total:', friendsData.length, 'Existing members:', memberIds.length);
      console.log('[AddGroupMemberScreen] Member IDs to filter:', memberIds);
      if (friendsData.length > 0) {
        console.log('[AddGroupMemberScreen] First friend friendId:', friendsData[0]?.friendId);
        console.log('[AddGroupMemberScreen] Is first friend in memberIds?', memberIds.includes(friendsData[0]?.friendId));
      }
      
      const availableFriends = friendsData.filter(
        friend => {
          if (!friend || !friend.friendId) {
            console.warn('[AddGroupMemberScreen] Friend missing friendId:', friend);
            return false;
          }
          const isMember = memberIds.includes(friend.friendId);
          if (isMember) {
            console.log('[AddGroupMemberScreen] Filtering out friend (already member):', friend.friendId, friend.friend?.email);
          }
          return !isMember;
        },
      );
      console.log('[AddGroupMemberScreen] Available friends after filtering:', availableFriends.length);
      if (availableFriends.length === 0 && friendsData.length > 0) {
        console.warn('[AddGroupMemberScreen] All friends filtered out! This might indicate a bug in filtering logic.');
        console.warn('[AddGroupMemberScreen] Friends friendIds:', friendsData.map(f => f.friendId));
        console.warn('[AddGroupMemberScreen] Member IDs:', memberIds);
      }
      setFriends(availableFriends);
    } catch (err) {
      console.error('Unexpected error in loadData:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(friendId: string) {
    if (!token) return;

    try {
      setAdding(friendId);
      await addGroupMember(token, groupId, friendId);
      Alert.alert('Success', 'Member added successfully', [
        { text: 'OK', onPress: () => {
          onMemberAdded?.();
          onBack();
        }},
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(null);
    }
  }

  function getUserDisplayName(friend: Friend): string {
    return friend?.friend?.profile?.displayName || friend?.friend?.email || 'Unknown';
  }

  async function handleInvite() {
    if (!token) return;

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

    try {
      setInviting(true);
      const result = await inviteGroupMember(token, groupId, {
        email: email || undefined,
        mobileNumber: mobile || undefined,
      });
      
      Alert.alert(
        'Invitation Sent',
        `Invitation sent successfully! ${result.inviteLink ? `Share this link: ${result.inviteLink}` : ''}`,
        [
          { text: 'OK', onPress: () => {
            setInviteEmail('');
            setInviteMobile('');
            setShowInviteForm(false);
            onMemberAdded?.();
          }},
        ]
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }

  const filteredFriends = friends.filter(friend =>
    friend && friend.friend && (
      getUserDisplayName(friend).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (friend.friend.email && friend.friend.email.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Add Member"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <SkeletonFriendList count={5} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Add Member"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, !showInviteForm && styles.tabActive]}
              onPress={() => setShowInviteForm(false)}
            >
              <Text style={[styles.tabText, !showInviteForm && styles.tabTextActive]}>
                Add Friends
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, showInviteForm && styles.tabActive]}
              onPress={() => setShowInviteForm(true)}
            >
              <Text style={[styles.tabText, showInviteForm && styles.tabTextActive]}>
                Invite by Email/Phone
              </Text>
            </TouchableOpacity>
          </View>

          {!showInviteForm ? (
            <>
              {/* Search Input */}
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends by name or email..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchQuery('')}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Invite Form */}
              <View style={styles.inviteForm}>
                <Text style={styles.inviteFormTitle}>Invite by Email or Phone</Text>
                <Text style={styles.inviteFormSubtitle}>
                  Send an invitation to someone who isn't your friend yet
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="email" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="email@example.com"
                      placeholderTextColor="#9CA3AF"
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <Text style={styles.orText}>OR</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="+1234567890"
                      placeholderTextColor="#9CA3AF"
                      value={inviteMobile}
                      onChangeText={setInviteMobile}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.inviteButton, inviting && styles.inviteButtonDisabled]}
                  onPress={handleInvite}
                  disabled={inviting || (!inviteEmail.trim() && !inviteMobile.trim())}
                  activeOpacity={0.8}
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.inviteButtonText}>Send Invitation</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Friends List */}
          {!showInviteForm && (
            filteredFriends.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title={searchQuery ? 'No friends found' : 'No friends available'}
                message={
                  searchQuery
                    ? 'Try a different search term or check your spelling'
                    : 'All your friends are already members of this circle. Invite someone new using the "Invite by Email/Phone" tab!'
                }
              />
            ) : (
              <View style={styles.friendsList}>
                {filteredFriends.map((friend) => {
                  const avatarUrl = friend?.friend?.profile?.avatarUrl
                    ? getAvatarUrl(friend.friend.profile.avatarUrl)
                    : null;
                  const displayName = getUserDisplayName(friend);
                  const initials = displayName.charAt(0).toUpperCase();

                  return (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.friendCard}
                      onPress={() => handleAddMember(friend.friendId)}
                      disabled={adding === friend.friendId}
                      activeOpacity={0.7}
                    >
                      <View style={styles.friendInfo}>
                        <View style={styles.friendAvatar}>
                          {avatarUrl ? (
                            <Image
                              source={{ uri: avatarUrl }}
                              style={styles.friendAvatarImage}
                            />
                          ) : (
                            <Text style={styles.friendAvatarText}>{initials}</Text>
                          )}
                        </View>
                        <View style={styles.friendDetails}>
                          <Text style={styles.friendName} numberOfLines={1}>
                            {displayName}
                          </Text>
                          {!friend?.friend?.profile?.displayName && friend?.friend?.email && (
                            <Text style={styles.friendEmail} numberOfLines={1}>
                              {friend.friend.email}
                            </Text>
                          )}
                        </View>
                      </View>
                      {adding === friend.friendId ? (
                        <ActivityIndicator size="small" color="#6366F1" />
                      ) : (
                        <View style={styles.addButton}>
                          <MaterialIcons name="person-add" size={20} color="#6366F1" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  friendsList: {
    gap: 12,
    marginTop: 4,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  friendAvatarImage: {
    width: '100%',
    height: '100%',
  },
  friendAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  friendDetails: {
    flex: 1,
    minWidth: 0,
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
    fontWeight: '400',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  inviteForm: {
    marginTop: 8,
  },
  inviteFormTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  inviteFormSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    minHeight: 52,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9CA3AF',
    marginVertical: 20,
    fontWeight: '500',
  },
  inviteButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
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
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

