import React, { useState, useMemo } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getFriends, Friend } from "../api/friendApi";
import {
  addGroupMember,
  getGroupById,
  GroupMemberRole,
  inviteGroupMember,
} from "../api/groupApi";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { SkeletonFriendList } from "../components/SkeletonLoader";
import { getAvatarUrl } from "../utils/avatar";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMobile, setInviteMobile] = useState("");

  // Fetch friends and group members
  const {
    data: friendsAndMembersData,
    loading,
    error,
    refetch,
  } = useDataFetch<{ friends: Friend[]; existingMemberIds: string[] }>({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const [friendsData, groupData] = await Promise.all([
        getFriends(token),
        getGroupById(token, groupId),
      ]);
      const existingMemberIds = (groupData.members || []).map((m) => m.userId);
      return {
        friends: friendsData || [],
        existingMemberIds,
      };
    },
    immediate: true,
    deps: [token, groupId],
  });

  const friends = friendsAndMembersData?.friends || [];
  const existingMemberIds = friendsAndMembersData?.existingMemberIds || [];

  // Filter out friends who are already members
  const availableFriends = useMemo(() => {
    return friends.filter(
      (friend) => !existingMemberIds.includes(friend.friendId),
    );
  }, [friends, existingMemberIds]);

  const { execute: handleAddMember, loading: addingMember } = useAsyncOperation(
    {
      operationFn: async (friendId: string) => {
        if (!token) throw new Error("Not authenticated");
        return addGroupMember(token, groupId, friendId);
      },
      onSuccess: () => {
        Alert.alert("Success", "Member added successfully", [
          {
            text: "OK",
            onPress: () => {
              refetch(); // Refresh friends and members list
              onMemberAdded?.();
              onBack();
            },
          },
        ]);
      },
      onError: (errorMessage) => {
        Alert.alert("Error", errorMessage);
      },
    },
  );

  function getUserDisplayName(friend: Friend): string {
    return (
      friend?.friend?.profile?.displayName || friend?.friend?.email || "Unknown"
    );
  }

  const { execute: handleInvite, loading: inviting } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");

      const email = inviteEmail.trim();
      const mobile = inviteMobile.trim();

      if (!email && !mobile) {
        throw new Error("Please enter an email or mobile number");
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      return inviteGroupMember(token, groupId, {
        email: email || undefined,
        mobileNumber: mobile || undefined,
      });
    },
    onSuccess: (result) => {
      Alert.alert(
        "Invitation Sent",
        `Invitation sent successfully! ${result.inviteLink ? `Share this link: ${result.inviteLink}` : ""}`,
        [
          {
            text: "OK",
            onPress: () => {
              setInviteEmail("");
              setInviteMobile("");
              setShowInviteForm(false);
              refetch(); // Refresh friends and members list
              onMemberAdded?.();
            },
          },
        ],
      );
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

  const filteredFriends = useMemo(() => {
    return availableFriends.filter(
      (friend) =>
        friend &&
        friend.friend &&
        (getUserDisplayName(friend)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
          (friend.friend.email &&
            friend.friend.email
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))),
    );
  }, [availableFriends, searchQuery]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Add Member"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <SkeletonFriendList count={5} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Add Member"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Add Member"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, !showInviteForm && styles.tabActive]}
              onPress={() => setShowInviteForm(false)}
            >
              <Text
                style={[
                  styles.tabText,
                  !showInviteForm && styles.tabTextActive,
                ]}
              >
                Add Friends
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, showInviteForm && styles.tabActive]}
              onPress={() => setShowInviteForm(true)}
            >
              <Text
                style={[styles.tabText, showInviteForm && styles.tabTextActive]}
              >
                Invite by Email/Phone
              </Text>
            </TouchableOpacity>
          </View>

          {!showInviteForm ? (
            <>
              {/* Search Input */}
              <View style={styles.searchContainer}>
                <MaterialIcons
                  name="search"
                  size={20}
                  color={theme.colors.textTertiary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends by name or email..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchQuery("")}
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
            </>
          ) : (
            <>
              {/* Invite Form */}
              <View style={styles.inviteForm}>
                <Text style={styles.inviteFormTitle}>
                  Invite by Email or Phone
                </Text>
                <Text style={styles.inviteFormSubtitle}>
                  Send an invitation to someone who isn't your friend yet
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

                <TouchableOpacity
                  style={[
                    styles.inviteButton,
                    inviting && styles.inviteButtonDisabled,
                  ]}
                  onPress={() => handleInvite()}
                  disabled={
                    inviting || (!inviteEmail.trim() && !inviteMobile.trim())
                  }
                  activeOpacity={0.8}
                >
                  {inviting ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.white}
                    />
                  ) : (
                    <Text style={styles.inviteButtonText}>Send Invitation</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Friends List */}
          {!showInviteForm &&
            (filteredFriends.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title={
                  searchQuery ? "No friends found" : "No friends available"
                }
                message={
                  searchQuery
                    ? "Try a different search term or check your spelling"
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
                      disabled={addingMember}
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
                            <Text style={styles.friendAvatarText}>
                              {initials}
                            </Text>
                          )}
                        </View>
                        <View style={styles.friendDetails}>
                          <Text style={styles.friendName} numberOfLines={1}>
                            {displayName}
                          </Text>
                          {!friend?.friend?.profile?.displayName &&
                            friend?.friend?.email && (
                              <Text
                                style={styles.friendEmail}
                                numberOfLines={1}
                              >
                                {friend.friend.email}
                              </Text>
                            )}
                        </View>
                      </View>
                      {addingMember ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.primary}
                        />
                      ) : (
                        <View style={styles.addButton}>
                          <MaterialIcons
                            name="person-add"
                            size={20}
                            color={theme.colors.primary}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      marginBottom: 20,
      backgroundColor: theme.colors.backgroundSecondary,
      minHeight: 52,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      marginRight: theme.spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      fontFamily: Platform.select({
        ios: "System",
        android: "Roboto",
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      padding: theme.spacing.base,
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
    friendInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: theme.spacing.md,
    },
    friendAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.md,
      overflow: "hidden",
    },
    friendAvatarImage: {
      width: "100%",
      height: "100%",
    },
    friendAvatarText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.white,
    },
    friendDetails: {
      flex: 1,
      minWidth: 0,
    },
    friendName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    friendEmail: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.normal,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    tabsContainer: {
      flexDirection: "row",
      marginBottom: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.md,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      borderRadius: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    tabActive: {
      backgroundColor: theme.colors.background,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
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
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    inviteForm: {
      marginTop: 8,
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
    inviteButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.md,
      paddingVertical: theme.spacing.base,
      paddingHorizontal: theme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.sm,
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
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
