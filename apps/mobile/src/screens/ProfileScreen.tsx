import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getProfile, Profile } from '../api/profileApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { getTrustScoreBreakdown, TrustScoreWithBreakdown } from '../api/trustScoreApi';

interface ProfileScreenProps {
  onEdit: () => void;
  onBack: () => void;
}

export function ProfileScreen({ onEdit, onBack, onSettings }: ProfileScreenProps) {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trustScoreBreakdown, setTrustScoreBreakdown] = useState<TrustScoreWithBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [token]);

  async function loadProfile() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [profileData, breakdownData] = await Promise.all([
        getProfile(token),
        getTrustScoreBreakdown(token).catch(() => null), // Don't fail if breakdown fails
      ]);
      console.log('[Profile] Loaded profile data:', JSON.stringify(profileData, null, 2));
      console.log('[Profile] Trust score:', profileData?.user?.trustScore);
      setProfile(profileData);
      setTrustScoreBreakdown(breakdownData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  function getAvatarUrl(avatarUrl: string | null): string | null {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    // Ensure we have a proper URL
    const baseUrl = getApiBaseUrl();
    const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
    return `${baseUrl}${cleanPath}`;
  }

  function getTrustScoreColor(score: number): string {
    // Trust Score Colors from design guide:
    // Excellent (90-100): #10B981 (Green)
    // Good (70-89): #3B82F6 (Blue)
    // Fair (50-69): #F59E0B (Amber)
    // Poor (0-49): #EF4444 (Red)
    if (score >= 90) return '#10B981'; // Green
    if (score >= 70) return '#3B82F6'; // Blue-500
    if (score >= 50) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const avatarUrl = getAvatarUrl(profile?.avatarUrl || null);

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
          </View>

        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              style={styles.avatar}
              onError={(e) => {
                console.error('Image load error:', e.nativeEvent.error);
                console.error('Failed to load avatar URL:', avatarUrl);
              }}
              onLoad={() => {
                console.log('Avatar loaded successfully:', avatarUrl);
              }}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {profile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.displayName}>
          {profile?.displayName || 'No display name'}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>

        {profile?.user?.trustScore ? (
          <View style={styles.trustScoreContainer}>
            <Text style={styles.trustScoreLabel}>Trust Score</Text>
            <View style={styles.trustScoreValueContainer}>
              <Text style={[
                styles.trustScoreValue,
                { color: getTrustScoreColor(profile.user.trustScore.score) }
              ]}>
                {profile.user.trustScore.score}
              </Text>
              <Text style={styles.trustScoreMax}>/ 100</Text>
            </View>
            <View style={styles.trustScoreBar}>
              <View
                style={[
                  styles.trustScoreBarFill,
                  { 
                    width: `${profile.user.trustScore.score}%`,
                    backgroundColor: getTrustScoreColor(profile.user.trustScore.score),
                  },
                ]}
              />
            </View>

            {/* Score Breakdown */}
            {trustScoreBreakdown?.breakdown?.expense && (
              <View style={styles.breakdownContainer}>
                <Text style={styles.breakdownTitle}>Score Breakdown</Text>
                
                {/* Expense Score */}
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownItemLabel}>
                    Billchop Score: {Math.round(trustScoreBreakdown.expenseScore)}/40
                  </Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(trustScoreBreakdown.expenseScore / 40) * 100}%`,
                          backgroundColor: '#2563EB',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownDetails}>
                    On-time: {Math.round(trustScoreBreakdown.breakdown.expense.onTimeSettlementRate * 100)}% • 
                    Recent: {Math.round(trustScoreBreakdown.breakdown.expense.recentActivityBonus * 100)}% • 
                    Volume: {Math.round(trustScoreBreakdown.breakdown.expense.volumeBonus * 100)}%
                  </Text>
                </View>

                {/* Chore Score */}
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownItemLabel}>
                    Chore Board Score: {Math.round(trustScoreBreakdown.choreScore)}/30
                  </Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(trustScoreBreakdown.choreScore / 30) * 100}%`,
                          backgroundColor: '#10B981',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownDetails}>
                    Completion: {Math.round(trustScoreBreakdown.breakdown.chore.completionRate * 100)}% • 
                    On-time: {Math.round(trustScoreBreakdown.breakdown.chore.onTimeRate * 100)}% • 
                    Points: {Math.round(trustScoreBreakdown.breakdown.chore.pointsBonus * 100)}%
                  </Text>
                </View>

                {/* Community Score */}
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownItemLabel}>
                    Community Score: {Math.round(trustScoreBreakdown.communityScore)}/30
                  </Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(trustScoreBreakdown.communityScore / 30) * 100}%`,
                          backgroundColor: '#F59E0B',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownDetails}>
                    Listings: {Math.round(trustScoreBreakdown.breakdown.community.listingSuccessRate * 100)}% • 
                    Engagement: {Math.round(trustScoreBreakdown.breakdown.community.engagementRate * 100)}% • 
                    Response: {Math.round(trustScoreBreakdown.breakdown.community.responseRate * 100)}%
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.trustScoreContainer}>
            <Text style={styles.trustScoreLabel}>Trust Score</Text>
            <Text style={styles.trustScoreLoading}>Calculating...</Text>
          </View>
        )}

        {profile?.bio && (
          <View style={styles.bioContainer}>
            <Text style={styles.bioLabel}>Bio</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        )}

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Text style={styles.editButtonText}>Edit My Space</Text>
            </TouchableOpacity>
            {onSettings && (
              <TouchableOpacity style={styles.settingsButton} onPress={onSettings}>
                <MaterialIcons name="settings" size={20} color="#2563EB" />
                <Text style={styles.settingsButtonText}>Settings</Text>
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
    paddingBottom: 24, // lg: 24px
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginBottom: 16, // md: 16px
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    width: '100%',
  },
  backButton: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 4, // xs: 4px
    minWidth: 60,
    minHeight: 44, // Touch target: 44px
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16, // Body: 16px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium (Text Button)
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
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  content: {
    paddingHorizontal: 24, // lg: 24px (screen padding)
    // No paddingTop - SafeAreaView handles top spacing
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16, // md: 16px
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
    fontSize: 32, // H1: 32px, Bold
    fontWeight: 'bold',
    color: '#111827', // Gray-900
    marginBottom: 4, // xs: 4px
    lineHeight: 38.4, // 1.2 line-height
  },
  email: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
    marginBottom: 16, // md: 16px
    lineHeight: 21, // 1.5 line-height
  },
  trustScoreContainer: {
    width: '100%',
    marginBottom: 24, // lg: 24px
    padding: 16, // md: 16px
    backgroundColor: '#F9FAFB', // Gray-50
    borderRadius: 12, // Card: 12px
    alignItems: 'center',
  },
  trustScoreLabel: {
    fontSize: 12, // Labels: 12px
    fontWeight: '500', // Medium
    color: '#6B7280', // Gray-500
    marginBottom: 8, // sm: 8px
    textTransform: 'uppercase', // Labels: Uppercase
    letterSpacing: 0.5, // Labels: Letter-spacing: 0.5px
  },
  trustScoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12, // md: 12px (3 * 4px)
  },
  trustScoreValue: {
    fontSize: 48, // Trust Score: 48px, Bold
    fontWeight: 'bold',
    // Color will be set dynamically based on score
  },
  trustScoreMax: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#9CA3AF', // Gray-400
    marginLeft: 4, // xs: 4px
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
    // backgroundColor will be set dynamically based on score
    borderRadius: 4, // xs: 4px
  },
  trustScoreLoading: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  bioContainer: {
    width: '100%',
    marginBottom: 24, // lg: 24px
    padding: 16, // md: 16px
    backgroundColor: '#F9FAFB', // Gray-50
    borderRadius: 12, // Card: 12px
  },
  bioLabel: {
    fontSize: 12, // Labels: 12px
    fontWeight: '500', // Medium
    color: '#6B7280', // Gray-500
    marginBottom: 8, // sm: 8px
    textTransform: 'uppercase', // Labels: Uppercase
    letterSpacing: 0.5, // Labels: Letter-spacing: 0.5px
  },
  bio: {
    fontSize: 16, // Large Body: 16px
    color: '#111827', // Gray-900
    lineHeight: 24, // 1.5 line-height
  },
  actionsContainer: {
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  editButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    width: '100%',
    alignItems: 'center',
    minHeight: 44, // Button: 44px touch target
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#fff',
    width: '100%',
  },
  settingsButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
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
  breakdownDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
});

