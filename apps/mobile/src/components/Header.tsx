import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getProfile, Profile } from '../api/profileApi';
import { getUnreadCount } from '../api/notificationApi';
import { getAvatarUrl } from '../utils/avatar';
import { Icon } from './Icon';

export interface HeaderOption {
  label: string;
  icon?: string;
  onPress: () => void;
  danger?: boolean; // Red color for destructive actions
}

interface HeaderProps {
  // Navigation props
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  
  // Detail/Edit screen props
  title?: string; // Screen title (centered)
  onBack?: () => void; // Back button handler
  rightActions?: ReactNode; // Custom actions (Edit, Delete, etc.)
  
  // Options menu (for non-main screens)
  options?: HeaderOption[]; // Screen-specific options (Edit, Delete, etc.)
  onNavigateToMessages?: () => void; // Messages option
  
  // Visibility toggles
  showProfile?: boolean; // Show/hide profile button (default: true if onNavigateToProfile provided)
  showNotifications?: boolean; // Show/hide notifications (default: true if onNavigateToNotifications provided)
  showSettings?: boolean; // Show/hide settings (default: true if onNavigateToSettings provided)
  useOptionsMenu?: boolean; // Use options menu instead of direct settings/notifications (for non-main screens)
}

// Shared profile cache across all Header instances
let profileCache: Profile | null = null;
let profileCacheToken: string | null = null;
let unreadCountCache: number = 0;
let unreadCountCacheToken: string | null = null;

function Header({
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
  title,
  onBack,
  rightActions,
  options = [],
  onNavigateToMessages,
  showProfile = !!onNavigateToProfile,
  showNotifications = !!onNavigateToNotifications,
  showSettings = !!onNavigateToSettings,
  useOptionsMenu = false,
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
        // Use cached data immediately (only if cache is not null)
        setProfile(profileCache);
      } else {
        // No cache available, set to null
        setProfile(null);
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
      // Cache the profile data only if it's not null
      if (profileData) {
        profileCache = profileData;
        profileCacheToken = token;
        setProfile(profileData);
      } else {
        // If profile is null, set to null and clear cache
        profileCache = null;
        profileCacheToken = null;
        setProfile(null);
      }
    } catch (err) {
      console.error('[Header] Failed to load profile:', err);
      // On error, clear cache and set profile to null
      profileCache = null;
      profileCacheToken = null;
      setProfile(null);
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

  const avatarUrl = getAvatarUrl(profile?.avatarUrl || null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);

  // Determine layout: back button mode or profile mode
  const hasBackButton = !!onBack;
  const hasTitle = !!title;
  const hasRightActions = !!rightActions;
  
  // Build options menu items
  const menuItems: HeaderOption[] = [
    ...options, // Screen-specific options first
    ...(onNavigateToNotifications ? [{
      label: 'Notifications',
      icon: 'notifications',
      onPress: () => {
        setShowOptionsMenu(false);
        onNavigateToNotifications();
      },
    }] : []),
    ...(onNavigateToMessages ? [{
      label: 'Messages',
      icon: 'message',
      onPress: () => {
        setShowOptionsMenu(false);
        onNavigateToMessages();
      },
    }] : []),
    ...(onNavigateToSettings ? [{
      label: 'Settings',
      icon: 'settings',
      onPress: () => {
        setShowOptionsMenu(false);
        onNavigateToSettings();
      },
    }] : []),
  ];

  // Calculate total header height (safe area + header content)
  const totalHeaderHeight = headerHeight + insets.top;

  return (
    <View 
      style={styles.header}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout;
        setHeaderHeight(height);
      }}
    >
      {/* Left Section */}
      <View style={styles.headerLeft}>
        {hasBackButton ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Goes back to previous screen"
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : showProfile && onNavigateToProfile ? (
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
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Center Section - Title */}
      {hasTitle && (
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}

      {/* Right Section */}
      <View style={styles.headerRight}>
        {useOptionsMenu && menuItems.length > 0 ? (
          <View style={styles.optionsMenuContainer}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowOptionsMenu(!showOptionsMenu)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Options"
              accessibilityHint="Opens options menu"
            >
              <MaterialIcons name="more-vert" size={24} color="#FFFFFF" />
              {unreadCount > 0 && onNavigateToNotifications && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            {showOptionsMenu && (
              <Modal
                transparent
                visible={showOptionsMenu}
                animationType="fade"
                onRequestClose={() => setShowOptionsMenu(false)}
              >
                <TouchableOpacity
                  style={styles.optionsMenuBackdrop}
                  activeOpacity={1}
                  onPress={() => setShowOptionsMenu(false)}
                >
                  <View style={[styles.optionsMenuPosition, { top: totalHeaderHeight }]}>
                    <View style={styles.optionsMenu}>
                      {menuItems.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.optionsMenuItem,
                            item.danger && styles.optionsMenuItemDanger,
                          ]}
                          onPress={() => {
                            setShowOptionsMenu(false);
                            item.onPress();
                          }}
                          activeOpacity={0.7}
                        >
                          {item.icon && (
                            <MaterialIcons 
                              name={item.icon as any} 
                              size={20} 
                              color={item.danger ? '#EF4444' : '#374151'} 
                            />
                          )}
                          <Text style={[
                            styles.optionsMenuItemText,
                            item.danger && styles.optionsMenuItemTextDanger,
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}
          </View>
        ) : (
          <>
            {hasRightActions && (
              <View style={styles.customActions}>
                {rightActions}
              </View>
            )}
            {showNotifications && onNavigateToNotifications && (
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
            {showSettings && onNavigateToSettings && (
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
            {!hasRightActions && !showNotifications && !showSettings && (
              <View style={styles.placeholder} />
            )}
          </>
        )}
      </View>
      {/* Overlay to close options menu when clicking outside */}
      {showOptionsMenu && (
        <TouchableOpacity
          style={styles.optionsMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        />
      )}
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
    zIndex: 1000,
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
  headerLeft: {
    minWidth: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  profileButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 48,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  customActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    overflow: 'visible', // Ensure badge is visible
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
    zIndex: 10, // Ensure badge appears above other elements
    // 3D effect for badge
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 5, // Higher elevation for Android
      },
    }),
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  optionsMenuContainer: {
    position: 'relative',
  },
  optionsMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionsMenuPosition: {
    position: 'absolute',
    right: 20,
  },
  optionsMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 200,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  optionsMenuItemDanger: {
    // Keep same structure but different text color
  },
  optionsMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  optionsMenuItemTextDanger: {
    color: '#EF4444',
  },
});

export { Header };
export type { HeaderOption };
export default Header;

