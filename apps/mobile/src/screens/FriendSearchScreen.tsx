import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
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

interface FriendSearchScreenProps {
  onBack: () => void;
  onRequestSent?: () => void;
  onViewProfile?: (userId: string) => void;
}

export function FriendSearchScreen({ onBack, onRequestSent, onViewProfile }: FriendSearchScreenProps) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMobile, setInviteMobile] = useState('');

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email or name..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        {searching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {searchQuery.length < 2 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Search for friends</Text>
            <Text style={styles.emptySubtext}>
              Enter at least 2 characters to search by email or display name
            </Text>
          </View>
        ) : showInviteForm ? (
          <View style={styles.inviteForm}>
            <Text style={styles.inviteFormTitle}>Invite to Dream Finora</Text>
            <Text style={styles.inviteFormSubtitle}>
              Send an invitation to someone who isn't on the app yet
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
          <View style={styles.emptyContainer}>
            <MaterialIcons name="person-off" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              Try searching with a different email or name
            </Text>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => setShowInviteForm(true)}
            >
              <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.inviteButtonText}>Invite by Email/Phone</Text>
            </TouchableOpacity>
          </View>
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
                  <View style={styles.avatar}>
                    <MaterialIcons name="person" size={24} color="#6B7280" />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{getUserDisplayName(user)}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    {user.mobileNumber && (
                      <Text style={styles.userMobile}>{user.mobileNumber}</Text>
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
                      activeOpacity={0.7}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  userMobile: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inviteForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginTop: 16,
  },
  inviteFormTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  inviteFormSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
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
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginVertical: 16,
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
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
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
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    gap: 8,
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

