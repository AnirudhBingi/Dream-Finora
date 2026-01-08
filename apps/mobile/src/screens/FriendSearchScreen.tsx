import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import {
  searchUsers,
  sendFriendRequest,
  inviteUserToApp,
  SearchUser,
} from '../api/friendApi';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { getAvatarUrl } from '../utils/avatar';
import { TrustScoreBadge } from '../components/TrustScoreDisplay';

interface FriendSearchScreenProps {
  onBack: () => void;
  onRequestSent?: () => void;
  onViewProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FriendSearchScreen({ 
  onBack, 
  onRequestSent, 
  onViewProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FriendSearchScreenProps) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMobile, setInviteMobile] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function performSearch(query: string) {
    if (!token || query.length < 2) return;

    try {
      setSearching(true);
      const results = await searchUsers(token, query);
      setSearchResults(results);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to search users');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(userIdentifier: string) {
    if (!token) return;

    try {
      setSendingRequest(userIdentifier);
      await sendFriendRequest(token, { friendEmailOrMobile: userIdentifier });
      Alert.alert('Success', 'Friend request sent!', [
        {
          text: 'OK',
          onPress: () => {
            if (onRequestSent) {
              onRequestSent();
            }
            onBack();
          },
        },
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send friend request';
      // If user not found, offer to invite them
      if (errorMessage.includes('not found') || errorMessage.includes('User not found')) {
        Alert.alert(
          'User Not Found',
          'This person is not on Dream Finora yet. Would you like to invite them to join?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Invite',
              onPress: () => {
                // Pre-fill the invite form with the search query
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userIdentifier);
                if (isEmail) {
                  setInviteEmail(userIdentifier);
                } else {
                  setInviteMobile(userIdentifier);
                }
                setShowInviteForm(true);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSendingRequest(null);
    }
  }

  async function handleInviteUser() {
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
      const result = await inviteUserToApp(token, {
        email: email || undefined,
        mobileNumber: mobile || undefined,
      });
      
      Alert.alert(
        'Invitation Sent!',
        `We've sent an invitation to ${email || mobile}. They'll receive a link to join Dream Finora.`,
        [
          { text: 'OK', onPress: () => {
            setInviteEmail('');
            setInviteMobile('');
            setShowInviteForm(false);
            if (onRequestSent) {
              onRequestSent();
            }
          }},
        ]
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }

  function getUserDisplayName(user: SearchUser): string {
    return user.profile?.displayName || user.email;
  }

  function getFriendStatusBadge(status?: string) {
    switch (status) {
      case 'accepted':
        return (
          <View style={styles.statusBadge}>
            <MaterialIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.statusText}>Friends</Text>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <MaterialIcons name="schedule" size={16} color="#F59E0B" />
            <Text style={[styles.statusText, styles.pendingText]}>Pending</Text>
          </View>
        );
      case 'blocked':
        return (
          <View style={[styles.statusBadge, styles.blockedBadge]}>
            <MaterialIcons name="block" size={16} color="#EF4444" />
            <Text style={[styles.statusText, styles.blockedText]}>Blocked</Text>
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Add Friends"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by email or name..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                searchInputRef.current?.blur();
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        {searching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.length < 2 ? (
          <EmptyState
            icon="search"
            title="Search for friends"
            message="Enter at least 2 characters to search by email or display name"
          />
        ) : showInviteForm ? (
          <View style={styles.inviteForm}>
            <Text style={styles.inviteFormTitle}>Invite to Dream Finora</Text>
            <Text style={styles.inviteFormSubtitle}>
              Send an invitation to someone who isn't on the app yet
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

            <View style={styles.inviteFormActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                  setInviteMobile('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inviteButton, inviting && styles.inviteButtonDisabled]}
                onPress={handleInviteUser}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.inviteButtonText}>Send Invitation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : searchResults.length === 0 && !searching ? (
          <EmptyState
            icon="person-off"
            title="No users found"
            message="Try searching with a different email or name"
            actionLabel="Invite by Email/Phone"
            onAction={() => setShowInviteForm(true)}
          />
        ) : (
          searchResults.map((user) => {
            const userIdentifier = user.email; // Use email as identifier (backend supports email or mobile)
            const isSending = sendingRequest === userIdentifier;
            const canSendRequest = !user.friendStatus || user.friendStatus === 'none';

            return (
              <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                onPress={() => {
                  if (onViewProfile) {
                    onViewProfile(user.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.userInfo}>
                  {(() => {
                    const avatarUrl = user.profile?.avatarUrl 
                      ? getAvatarUrl(user.profile.avatarUrl)
                      : null;
                    const displayName = getUserDisplayName(user);
                    const initials = displayName.charAt(0).toUpperCase();

                    return (
                      <View style={styles.avatar}>
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <Text style={styles.avatarText}>{initials}</Text>
                        )}
                      </View>
                    );
                  })()}
                  <View style={styles.userDetails}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {getUserDisplayName(user)}
                      </Text>
                      {/* Show trust score if available (backend already handles visibility) */}
                      {user.trustScore && (
                        <TrustScoreBadge score={user.trustScore.score} size="small" />
                      )}
                    </View>
                    {!user.profile?.displayName && user.email && (
                      <Text style={styles.userEmail} numberOfLines={1}>
                        {user.email}
                      </Text>
                    )}
                    {user.mobileNumber && (
                      <Text style={styles.userMobile} numberOfLines={1}>
                        {user.mobileNumber}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.userActions}>
                  {getFriendStatusBadge(user.friendStatus)}
                  {canSendRequest && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSendRequest(userIdentifier);
                      }}
                      disabled={isSending}
                      activeOpacity={0.8}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
                          <Text style={styles.addButtonText}>Add</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 14,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  searchingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
    marginTop: 2,
  },
  userMobile: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  pendingText: {
    color: '#F59E0B',
  },
  blockedBadge: {
    backgroundColor: '#FEE2E2',
  },
  blockedText: {
    color: '#EF4444',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inviteForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
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
  inviteFormActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
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

