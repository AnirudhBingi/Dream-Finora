import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getUserProfile, UserProfile } from '../api/profileApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockUser } from '../api/friendApi';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';

interface UserProfileScreenProps {
  userId: string;
  onBack: () => void;
  onNavigateToMessage?: (userId: string) => void;
  onNavigateToMutualFriends?: (userId: string) => void;
  onNavigateToListings?: (userId: string) => void;
}

export function UserProfileScreen({
  userId,
  onBack,
  onNavigateToMessage,
  onNavigateToMutualFriends,
  onNavigateToListings,
}: UserProfileScreenProps) {
  const { token, user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [token, userId]);

  async function loadProfile() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const profileData = await getUserProfile(token, userId);
      setProfile(profileData);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function getAvatarUrl(avatarUrl: string | null): string | null {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    const baseUrl = getApiBaseUrl();
    const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
    return `${baseUrl}${cleanPath}`;
  }

  function getTrustScoreColor(score: number): string {
    if (score >= 90) return '#10B981';
    if (score >= 70) return '#3B82F6';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  }

  async function handleSendFriendRequest() {
    if (!token || !profile) return;

    try {
      setActionLoading(true);
      await sendFriendRequest(token, { friendEmailOrMobile: profile.email || '' });
      Alert.alert('Success', 'Friend request sent!');
      await loadProfile(); // Refresh to update friend status
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcceptRequest() {
    if (!token || !profile) return;

    try {
      setActionLoading(true);
      // Need to get the friendship ID - for now, reload and accept
      Alert.alert('Info', 'Please accept the request from the friends list');
      await loadProfile();
    } catch (err) {
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveFriend() {
    if (!token || !profile) return;

    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${profile.displayName || profile.email} as a friend?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              // Need friendship ID - for now, show message
              Alert.alert('Info', 'Please remove from friends list');
              await loadProfile();
            } catch (err) {
              Alert.alert('Error', 'Failed to remove friend');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  async function handleBlockUser() {
    if (!token || !profile) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profile.displayName || profile.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await blockUser(token, userId);
              Alert.alert('Success', 'User blocked');
              await loadProfile();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to block user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonDetailScreen />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState message={error} onRetry={loadProfile} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <ErrorState message="Profile not found" onRetry={loadProfile} />
      </View>
    );
  }

  const avatarUrl = getAvatarUrl(profile.avatarUrl);
  const isFriend = profile.friendStatus === 'accepted';
  const isPendingIncoming = profile.friendStatus === 'pending_incoming';
  const isPendingOutgoing = profile.friendStatus === 'pending_outgoing';
  const isBlocked = profile.friendStatus === 'blocked';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {profile.displayName?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.displayName}>{profile.displayName || 'No display name'}</Text>
          {profile.email && <Text style={styles.email}>{profile.email}</Text>}
          {profile.mobileNumber && <Text style={styles.mobile}>{profile.mobileNumber}</Text>}

          {/* Friend Status Badge */}
          <View style={styles.friendStatusContainer}>
            {isFriend && (
              <View style={styles.friendBadge}>
                <MaterialIcons name="check-circle" size={16} color="#10B981" />
                <Text style={styles.friendBadgeText}>Friends</Text>
              </View>
            )}
            {isPendingIncoming && (
              <View style={[styles.friendBadge, styles.pendingBadge]}>
                <MaterialIcons name="schedule" size={16} color="#F59E0B" />
                <Text style={[styles.friendBadgeText, styles.pendingText]}>Friend Request Received</Text>
              </View>
            )}
            {isPendingOutgoing && (
              <View style={[styles.friendBadge, styles.pendingBadge]}>
                <MaterialIcons name="schedule" size={16} color="#F59E0B" />
                <Text style={[styles.friendBadgeText, styles.pendingText]}>Request Sent</Text>
              </View>
            )}
            {isBlocked && (
              <View style={[styles.friendBadge, styles.blockedBadge]}>
                <MaterialIcons name="block" size={16} color="#EF4444" />
                <Text style={[styles.friendBadgeText, styles.blockedText]}>Blocked</Text>
              </View>
            )}
          </View>

          {/* Trust Score Section */}
          {profile.trustScore && (
            <View style={styles.trustScoreContainer}>
              <Text style={styles.trustScoreLabel}>Trust Score</Text>
              <View style={styles.trustScoreValueContainer}>
                <Text style={[styles.trustScoreValue, { color: getTrustScoreColor(profile.trustScore.score) }]}>
                  {profile.trustScore.score}
                </Text>
                <Text style={styles.trustScoreMax}>/ 100</Text>
              </View>
              <View style={styles.trustScoreBar}>
                <View
                  style={[
                    styles.trustScoreBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, profile.trustScore.score))}%`,
                      backgroundColor: getTrustScoreColor(profile.trustScore.score),
                    },
                  ]}
                />
              </View>

              {/* Breakdown if available */}
              {profile.trustScore.breakdown && (
                <View style={styles.breakdownContainer}>
                  <Text style={styles.breakdownTitle}>Score Breakdown</Text>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>
                      Billchop: {Math.round(profile.trustScore.breakdown.expenseScore)}/40
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${(profile.trustScore.breakdown.expenseScore / 40) * 100}%`,
                            backgroundColor: '#2563EB',
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>
                      Chores: {Math.round(profile.trustScore.breakdown.choreScore)}/30
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${(profile.trustScore.breakdown.choreScore / 30) * 100}%`,
                            backgroundColor: '#10B981',
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownItemLabel}>
                      Community: {Math.round(profile.trustScore.breakdown.communityScore)}/30
                    </Text>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${(profile.trustScore.breakdown.communityScore / 30) * 100}%`,
                            backgroundColor: '#F59E0B',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Bio Section */}
          {profile.bio && (
            <View style={styles.bioContainer}>
              <Text style={styles.bioLabel}>Bio</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          )}

          {/* Mutual Friends Section */}
          {profile.mutualFriendsCount > 0 && (
            <TouchableOpacity
              style={styles.infoCard}
              onPress={() => onNavigateToMutualFriends?.(userId)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="people" size={20} color="#2563EB" />
              <Text style={styles.infoCardText}>
                {profile.mutualFriendsCount} mutual friend{profile.mutualFriendsCount !== 1 ? 's' : ''}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Listings Count */}
          {profile.listingsCount > 0 && (
            <TouchableOpacity
              style={styles.infoCard}
              onPress={() => onNavigateToListings?.(userId)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="home" size={20} color="#2563EB" />
              <Text style={styles.infoCardText}>
                {profile.listingsCount} listing{profile.listingsCount !== 1 ? 's' : ''}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Shared Groups */}
          {profile.sharedGroupsCount > 0 && (
            <View style={styles.infoCard}>
              <MaterialIcons name="group" size={20} color="#2563EB" />
              <Text style={styles.infoCardText}>
                {profile.sharedGroupsCount} shared group{profile.sharedGroupsCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {!isFriend && !isPendingOutgoing && !isPendingIncoming && !isBlocked && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSendFriendRequest}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Add Friend</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isPendingIncoming && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleAcceptRequest}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => Alert.alert('Info', 'Please reject from friends list')}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {isFriend && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleRemoveFriend}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <MaterialIcons name="person-remove" size={20} color="#EF4444" />
                <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Remove Friend</Text>
              </TouchableOpacity>
            )}

            {onNavigateToMessage && (isFriend || profile.profileVisibility === 'public') && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => onNavigateToMessage(userId)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="message" size={20} color="#2563EB" />
                <Text style={styles.secondaryButtonText}>Message</Text>
              </TouchableOpacity>
            )}

            {!isBlocked && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBlockUser}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <MaterialIcons name="block" size={20} color="#EF4444" />
                <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Block User</Text>
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
    alignItems: 'center',
  },
  header: {
    width: '100%',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  mobile: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  friendStatusContainer: {
    marginBottom: 16,
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  friendBadgeText: {
    fontSize: 14,
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
  trustScoreContainer: {
    width: '100%',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
  },
  trustScoreLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trustScoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  trustScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  trustScoreMax: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 4,
  },
  trustScoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trustScoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  breakdownItem: {
    marginBottom: 16,
  },
  breakdownItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  breakdownBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bioContainer: {
    width: '100%',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bio: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  infoCardText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  rejectButtonText: {
    color: '#EF4444',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
});

