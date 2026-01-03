import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { useAuth } from '../auth/authContext';
import { getProfile, Profile } from '../api/profileApi';
import { getUnreadCount } from '../api/notificationApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { Icon } from './Icon';

interface HeaderProps {
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

// Shared profile cache across all Header instances
let profileCache: Profile | null = null;
let profileCacheToken: string | null = null;
let unreadCountCache: number = 0;
let unreadCountCacheToken: string | null = null;

export function Header({
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: HeaderProps) {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(() => {
    // Initialize from cache if available
    return profileCache && profileCacheToken === token ? profileCache : null;
  });
  const [unreadCount, setUnreadCount] = useState(() => {
    // Initialize from cache if available
    return unreadCountCache && unreadCountCacheToken === token ? unreadCountCache : 0;
  });
  const isLoadingProfile = useRef(false);

  useEffect(() => {
    if (token) {
      // Only load profile if we don't have cached data for this token and not already loading
      if ((!profileCache || profileCacheToken !== token) && !isLoadingProfile.current) {
        isLoadingProfile.current = true;
        loadProfile();
      } else if (profileCache && profileCacheToken === token) {
        // Use cached data immediately
        setProfile(profileCache);
      }
      
      // Use cached unread count if available, then refresh
      if (unreadCountCache && unreadCountCacheToken === token) {
        setUnreadCount(unreadCountCache);
      }
      // Always refresh unread count (it changes frequently)
      loadUnreadCount();
    } else {
      // Clear cache if token is removed
      profileCache = null;
      profileCacheToken = null;
      unreadCountCache = 0;
      unreadCountCacheToken = null;
      isLoadingProfile.current = false;
      setProfile(null);
      setUnreadCount(0);
    }
  }, [token]);

  // Refresh unread count periodically
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  async function loadProfile() {
    if (!token) return;
    try {
      const profileData = await getProfile(token);
      // Cache the profile data
      profileCache = profileData;
      profileCacheToken = token;
      setProfile(profileData);
    } catch (err) {
      console.error('[Header] Failed to load profile:', err);
    } finally {
      isLoadingProfile.current = false;
    }
  }

  async function loadUnreadCount() {
    if (!token) return;
    try {
      const count = await getUnreadCount(token);
      // Cache the unread count
      unreadCountCache = count;
      unreadCountCacheToken = token;
      setUnreadCount(count);
    } catch (err) {
      console.error('[Header] Failed to load unread count:', err);
    }
  }

  function getAvatarUrl(avatarUrl: string | null): string | null {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    const baseUrl = getApiBaseUrl();
    const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
    return `${baseUrl}${cleanPath}`;
  }

  const avatarUrl = getAvatarUrl(profile?.avatarUrl || null);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={onNavigateToProfile}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Profile"
        accessibilityHint="Opens your profile screen"
      >
        {avatarUrl ? (
          <Image 
            source={{ uri: avatarUrl }} 
            style={styles.profileAvatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.profileAvatarPlaceholder}>
            <Text style={styles.profileAvatarText}>
              {profile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.headerRight}>
        {onNavigateToNotifications && (
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={onNavigateToNotifications}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            accessibilityHint="Opens notifications screen"
          >
            <Icon name="notifications" size={28} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {onNavigateToSettings && (
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={onNavigateToSettings}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Opens settings screen"
          >
            <Icon name="settings" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#6366F1', // Indigo-500 - nice modern color
    // 3D Effect with gradient-like appearance using shadows
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5', // Darker indigo for shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        borderBottomWidth: 0,
      },
      android: {
        elevation: 8,
        borderBottomWidth: 0,
      },
    }),
    // Add a subtle border for depth
    borderBottomWidth: 1,
    borderBottomColor: '#4F46E5', // Darker indigo border
  },
  profileButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    // 3D effect for avatar
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // 3D effect for placeholder
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    position: 'relative',
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent white for glass effect
    // 3D effect for buttons
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#6366F1',
    // 3D effect for badge
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

