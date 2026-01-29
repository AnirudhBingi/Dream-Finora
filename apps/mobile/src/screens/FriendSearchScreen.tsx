import React, { useMemo, useState, useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  searchUsers,
  sendFriendRequest,
  inviteUserToApp,
  SearchUser,
} from "../api/friendApi";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { getAvatarUrl } from "../utils/avatar";
import { TrustScoreBadge } from "../components/TrustScoreDisplay";
import { useTheme } from "../theme";

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMobile, setInviteMobile] = useState("");
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
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to search users",
      );
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
      Alert.alert("Success", "Friend request sent!", [
        {
          text: "OK",
          onPress: () => {
            if (onRequestSent) {
              onRequestSent();
            }
            onBack();
          },
        },
      ]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send friend request";
      // If user not found, offer to invite them
      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("User not found")
      ) {
        Alert.alert(
          "User Not Found",
          "This person is not on Dream Finora yet. Would you like to invite them to join?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Invite",
              onPress: () => {
                // Pre-fill the invite form with the search query
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                  userIdentifier,
                );
                if (isEmail) {
                  setInviteEmail(userIdentifier);
                } else {
                  setInviteMobile(userIdentifier);
                }
                setShowInviteForm(true);
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", errorMessage);
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
      Alert.alert("Error", "Please enter an email or mobile number");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      setInviting(true);
      const result = await inviteUserToApp(token, {
        email: email || undefined,
        mobileNumber: mobile || undefined,
      });

      Alert.alert(
        "Invitation Sent!",
        `We've sent an invitation to ${email || mobile}. They'll receive a link to join Dream Finora.`,
        [
          {
            text: "OK",
            onPress: () => {
              setInviteEmail("");
              setInviteMobile("");
              setShowInviteForm(false);
              if (onRequestSent) {
                onRequestSent();
              }
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setInviting(false);
    }
  }

  function getUserDisplayName(user: SearchUser): string {
    return user.profile?.displayName || user.email;
  }

  function getFriendStatusBadge(status?: string) {
    switch (status) {
      case "accepted":
        return (
          <View style={styles.statusBadge}>
            <MaterialIcons
              name="check-circle"
              size={16}
              color={theme.colors.success}
            />
            <Text style={styles.statusText}>Friends</Text>
          </View>
        );
      case "pending":
        return (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <MaterialIcons
              name="schedule"
              size={16}
              color={theme.colors.warning}
            />
            <Text style={[styles.statusText, styles.pendingText]}>Pending</Text>
          </View>
        );
      case "blocked":
        return (
          <View style={[styles.statusBadge, styles.blockedBadge]}>
            <MaterialIcons name="block" size={16} color={theme.colors.error} />
            <Text style={[styles.statusText, styles.blockedText]}>Blocked</Text>
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Add Friends"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by email or name..."
            placeholderTextColor={theme.colors.textTertiary}
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
                setSearchQuery("");
                setSearchResults([]);
                searchInputRef.current?.blur();
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {searching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
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
                <MaterialIcons
                  name="email"
                  size={20}
                  color={theme.colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
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
                <MaterialIcons
                  name="phone"
                  size={20}
                  color={theme.colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="+1234567890"
                  placeholderTextColor={theme.colors.textTertiary}
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
                  setInviteEmail("");
                  setInviteMobile("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.inviteButton,
                  inviting && styles.inviteButtonDisabled,
                ]}
                onPress={handleInviteUser}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textInverse}
                  />
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
            const canSendRequest =
              !user.friendStatus || user.friendStatus === "none";

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
                        <TrustScoreBadge
                          score={user.trustScore.score}
                          size="small"
                        />
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
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.textInverse}
                        />
                      ) : (
                        <>
                          <MaterialIcons
                            name="person-add"
                            size={18}
                            color={theme.colors.textInverse}
                          />
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    searchContainer: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderWidth: 2,
      borderColor: theme.colors.border,
      minHeight: 52,
    },
    searchIcon: {
      marginRight: theme.spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      paddingVertical: 14,
      fontFamily: Platform.select({
        ios: "System",
        android: "Roboto",
      }),
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
    searchingIndicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
    },
    searchingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    scrollContent: {
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing["2xl"],
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 48,
      minHeight: 300,
    },
    emptyText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    emptySubtext: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    userCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
      minWidth: 0,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.md,
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textInverse,
    },
    userDetails: {
      flex: 1,
      minWidth: 0,
    },
    userNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: 4,
    },
    userName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    userEmail: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.normal,
      marginTop: 2,
    },
    userMobile: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.normal,
    },
    userActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.colors.successBackground,
      borderRadius: theme.spacing.md,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    statusText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.success,
    },
    pendingBadge: {
      backgroundColor: theme.colors.warningBackground,
    },
    pendingText: {
      color: theme.colors.warning,
    },
    blockedBadge: {
      backgroundColor: theme.colors.errorBackground,
    },
    blockedText: {
      color: theme.colors.error,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.md,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      minHeight: 40,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
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
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    inviteForm: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      padding: theme.spacing.xl,
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    inviteFormSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
      lineHeight: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.sm,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
      minHeight: 52,
    },
    inputIcon: {
      marginLeft: theme.spacing.base,
      marginRight: theme.spacing.md,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      fontFamily: Platform.select({
        ios: "System",
        android: "Roboto",
      }),
    },
    orText: {
      textAlign: "center",
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
      marginVertical: 20,
      fontWeight: theme.typography.fontWeight.medium,
    },
    inviteFormActions: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.md,
      paddingVertical: theme.spacing.base,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    cancelButtonText: {
      color: theme.colors.gray700,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    inviteButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.md,
      paddingVertical: theme.spacing.base,
      gap: theme.spacing.sm,
      minHeight: 48,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
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
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
