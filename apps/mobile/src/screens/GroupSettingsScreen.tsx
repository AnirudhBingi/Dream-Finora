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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getGroupById,
  updateGroup,
  deleteGroup,
  changeMemberRole,
  transferOwnership,
  leaveGroup,
  removeGroupMember,
  uploadGroupAvatar,
  getGroupJoinRequests,
  approveGroupJoinRequest,
  declineGroupJoinRequest,
  GroupWithExpenses,
  GroupMemberRole,
  GroupMember,
  GroupJoinRequest,
  GroupVisibility,
} from "../api/groupApi";
import { Header } from "../components/Header";
import { getAvatarUrl } from "../utils/avatar";
import { pickSquareAvatarImage } from "../utils/imagePicker";
import { Avatar } from "../components/Avatar";
import { getApiBaseUrl } from "../api/getApiBaseUrl";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

const GROUP_ICONS = [
  { name: "group", label: "Group" },
  { name: "home", label: "Home" },
  { name: "people", label: "People" },
  { name: "family-restroom", label: "Family" },
  { name: "work", label: "Work" },
  { name: "school", label: "School" },
  { name: "sports-soccer", label: "Sports" },
  { name: "restaurant", label: "Dining" },
  { name: "flight", label: "Travel" },
  { name: "favorite", label: "Favorites" },
  { name: "star", label: "Star" },
  { name: "celebration", label: "Celebration" },
];

function getUserDisplayName(user: any): string {
  if (!user) return "Unknown";
  return user.profile?.displayName || user.email || "Unknown";
}

interface GroupSettingsScreenProps {
  groupId: string;
  onBack: () => void;
  onGroupUpdated?: () => void;
  onAddMember?: (groupId: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function GroupSettingsScreen({
  groupId,
  onBack,
  onGroupUpdated,
  onAddMember,
  onNavigateToUserProfile,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: GroupSettingsScreenProps) {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string>("group");
  const [circleImageUri, setCircleImageUri] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<GroupVisibility>("private");

  const {
    data: group,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<GroupWithExpenses>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getGroupById(token, groupId);
    },
    immediate: true,
    deps: [token, groupId],
    transform: (groupData: GroupWithExpenses) => {
      setName(groupData.name);
      setVisibility(groupData.visibility || "private");
      // TODO: Load group icon and image when backend supports it
      // setSelectedIcon(groupData.icon || 'group');
      // setCircleImageUri(groupData.imageUrl || null);
      return groupData;
    },
  });

  const isAdmin = !!group?.members?.some(
    (member) => member.userId === user?.id && member.role === "ADMIN",
  );

  const { data: joinRequests, refetch: refetchJoinRequests } = useDataFetch<
    GroupJoinRequest[]
  >({
    fetchFn: async () => {
      if (!token || !group || !isAdmin) return [];
      return getGroupJoinRequests(token, groupId);
    },
    immediate: true,
    deps: [token, groupId, isAdmin],
  });

  const { loading: joinActionLoading, execute: executeJoinAction } =
    useAsyncOperation({
      operationFn: async (payload: {
        requestId: string;
        action: "approve" | "decline";
      }) => {
        if (!token) throw new Error("No authentication token");
        if (payload.action === "approve") {
          return approveGroupJoinRequest(token, groupId, payload.requestId);
        }
        return declineGroupJoinRequest(token, groupId, payload.requestId);
      },
      onSuccess: () => {
        refetchJoinRequests();
        refetch();
      },
    });

  const pendingJoinRequests = (joinRequests ?? []).filter(
    (request) => request.status === "pending",
  );

  async function handlePickCircleImage() {
    try {
      const uri = await pickSquareAvatarImage({ quality: 0.9 });
      if (uri) {
        setCircleImageUri(uri);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  }

  async function handleSave() {
    if (!token || !group) return;

    if (!name.trim()) {
      Alert.alert("Error", "Group name is required");
      return;
    }

    try {
      setSaving(true);

      // Upload avatar if a new image was selected
      if (circleImageUri && circleImageUri.startsWith("file://")) {
        try {
          const filename = circleImageUri.split("/").pop() || "image.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";
          await uploadGroupAvatar(
            token,
            groupId,
            circleImageUri,
            filename,
            type,
          );
          console.log("[GroupSettingsScreen] Group avatar uploaded");
        } catch (avatarErr) {
          console.error(
            "[GroupSettingsScreen] Failed to upload avatar:",
            avatarErr,
          );
          // Continue with group update even if avatar upload fails
        }
      }

      await updateGroup(token, groupId, {
        name: name.trim(),
        visibility,
      });
      Alert.alert("Success", "Group updated successfully", [
        {
          text: "OK",
          onPress: () => {
            onGroupUpdated?.();
            refetch();
          },
        },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update group",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup() {
    if (!token) return;

    Alert.alert(
      "Delete Circle",
      "Are you sure you want to delete this circle? This will delete all expenses, chores, and member data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGroup(token, groupId);
              Alert.alert("Success", "Circle deleted successfully", [
                { text: "OK", onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to delete circle",
              );
            }
          },
        },
      ],
    );
  }

  async function handleLeaveGroup() {
    if (!token) return;

    Alert.alert(
      "Leave Circle",
      "Are you sure you want to leave this circle? You will no longer have access to its expenses and chores.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup(token, groupId);
              Alert.alert("Success", "You have left the circle", [
                { text: "OK", onPress: onBack },
              ]);
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to leave circle",
              );
            }
          },
        },
      ],
    );
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!token) return;

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberName} from this circle?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeGroupMember(token, groupId, memberId);
              Alert.alert("Success", "Member removed successfully");
              refetch();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to remove member",
              );
            }
          },
        },
      ],
    );
  }

  async function handleChangeRole(
    memberId: string,
    currentRole: GroupMemberRole,
  ) {
    if (!token) return;

    const newRole = currentRole === "ADMIN" ? "MEMBER" : "ADMIN";

    try {
      await changeMemberRole(token, groupId, memberId, newRole);
      Alert.alert("Success", `Member role changed to ${newRole}`);
      refetch();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to change member role",
      );
    }
  }

  async function handleTransferOwnership(
    newOwnerId: string,
    newOwnerName: string,
  ) {
    if (!token) return;

    Alert.alert(
      "Transfer Ownership",
      `Are you sure you want to transfer ownership to ${newOwnerName}? You will remain as an admin.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          onPress: async () => {
            try {
              await transferOwnership(token, groupId, newOwnerId);
              Alert.alert("Success", "Ownership transferred successfully");
              refetch();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to transfer ownership",
              );
            }
          },
        },
      ],
    );
  }

  function isUserAdmin(): boolean {
    if (!group || !user) return false;
    // Creator is always an admin
    if (group.createdBy === user.id) return true;
    // Check if user is in members array with ADMIN role
    if (!group.members || !Array.isArray(group.members)) return false;
    const member = group.members.find((m: GroupMember) => m.userId === user.id);
    return member?.role === "ADMIN";
  }

  function canUserEdit(): boolean {
    if (!group || !user) return false;
    // If allowMemberEditing is true, any member can edit
    if (group.allowMemberEditing) {
      // Check if user is a member
      if (!group.members || !Array.isArray(group.members)) return false;
      const member = group.members.find(
        (m: GroupMember) => m.userId === user.id,
      );
      return !!member; // Any member can edit if allowMemberEditing is true
    }
    // Otherwise, only admins can edit
    return isUserAdmin();
  }

  function isUserCreator(): boolean {
    return group?.createdBy === user?.id;
  }

  function getUserDisplayName(user: any): string {
    if (!user) return "Unknown";
    return user.profile?.displayName || user.email || "Unknown";
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading circle settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Circle Settings"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Circle not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCreator = isUserCreator();
  const canEdit = canUserEdit();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Circle Settings"
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
          {/* Circle Information Section - Always visible */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Circle Information</Text>

            {/* Circle Picture/Icon */}
            <View style={styles.circleInfoCard}>
              <View style={styles.circleInfoHeader}>
                {group.avatarUrl ? (
                  <Image
                    source={{
                      uri: group.avatarUrl.startsWith("http")
                        ? group.avatarUrl
                        : `${getApiBaseUrl()}${group.avatarUrl}`,
                    }}
                    style={styles.circleInfoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.circleInfoIcon,
                      { backgroundColor: theme.colors.primaryBackground },
                    ]}
                  >
                    <Text
                      style={[
                        styles.circleInfoIconText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {group.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.circleInfoDetails}>
                  <Text style={styles.circleInfoName}>{group.name}</Text>
                  {group.description &&
                    group.description.trim() &&
                    group.description.trim() !== "Check" && (
                      <Text
                        style={styles.circleInfoDescription}
                        numberOfLines={2}
                      >
                        {group.description}
                      </Text>
                    )}
                </View>
              </View>
            </View>
          </View>

          {/* Edit Group Info Section - Only if user can edit */}
          {canEdit && (
            <View style={styles.section}>
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
                      <MaterialIcons
                        name="add-photo-alternate"
                        size={32}
                        color={theme.colors.textTertiary}
                      />
                      <Text style={styles.imagePickerText}>
                        Tap to add picture
                      </Text>
                    </View>
                  )}
                  {circleImageUri && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setCircleImageUri(null)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={20}
                        color={theme.colors.textInverse}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Circle Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Circle name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Icon Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Icon</Text>
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
                        size={32}
                        color={
                          selectedIcon === icon.name
                            ? theme.colors.blue
                            : theme.colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.iconLabel,
                          selectedIcon === icon.name &&
                            styles.iconLabelSelected,
                        ]}
                      >
                        {icon.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {isAdmin && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Circle Visibility</Text>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Public circle</Text>
                  <Text style={styles.settingDescription}>
                    Allow anyone to request to join this circle.
                  </Text>
                </View>
                <Switch
                  value={visibility === "public"}
                  onValueChange={(value) =>
                    setVisibility(value ? "public" : "private")
                  }
                  trackColor={{
                    false: theme.colors.borderDark,
                    true: theme.colors.blue,
                  }}
                  thumbColor={theme.colors.textInverse}
                />
              </View>
            </View>
          )}

          {/* Members Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Members</Text>
                <Text style={styles.sectionSubtitle}>
                  {(group.members || []).length} member
                  {(group.members || []).length !== 1 ? "s" : ""}
                </Text>
              </View>
              {isAdmin && onAddMember && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onAddMember(groupId)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="person-add"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {(group.members || []).map((member: GroupMember) => {
              const isCurrentUser = member.userId === user?.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberCard}
                  onPress={() => {
                    if (!isCurrentUser && onNavigateToUserProfile) {
                      onNavigateToUserProfile(member.userId);
                    }
                  }}
                  activeOpacity={isCurrentUser ? 1 : 0.7}
                  disabled={isCurrentUser}
                >
                  <View style={styles.memberInfo}>
                    <Avatar
                      avatarUrl={member.user?.profile?.avatarUrl}
                      displayName={getUserDisplayName(member.user) || "Unknown"}
                      size={44}
                      borderWidth={2}
                      borderColor={theme.colors.textInverse}
                    />
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>
                          {isCurrentUser
                            ? "You"
                            : getUserDisplayName(member.user)}
                        </Text>
                        <View style={styles.memberBadges}>
                          {member.userId === group.createdBy && (
                            <View style={[styles.badge, styles.creatorBadge]}>
                              <MaterialIcons
                                name="star"
                                size={12}
                                color={theme.colors.warning}
                              />
                              <Text style={styles.badgeText}>Creator</Text>
                            </View>
                          )}
                          {member.role === "ADMIN" &&
                            member.userId !== group.createdBy && (
                              <View style={[styles.badge, styles.adminBadge]}>
                                <MaterialIcons
                                  name="admin-panel-settings"
                                  size={12}
                                  color={theme.colors.blue}
                                />
                                <Text style={styles.badgeText}>Admin</Text>
                              </View>
                            )}
                        </View>
                      </View>
                      {!member.user?.profile?.displayName &&
                        member.user?.email && (
                          <Text style={styles.memberEmail}>
                            {member.user.email}
                          </Text>
                        )}
                    </View>
                  </View>
                  {isAdmin && member.userId !== user?.id && (
                    <View style={styles.actionButtons}>
                      {member.userId !== group.createdBy && (
                        <>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() =>
                              handleChangeRole(member.id, member.role)
                            }
                            activeOpacity={0.7}
                          >
                            <MaterialIcons
                              name={
                                member.role === "ADMIN"
                                  ? "person"
                                  : "admin-panel-settings"
                              }
                              size={16}
                              color={theme.colors.blue}
                            />
                            <Text style={styles.actionButtonText}>
                              {member.role === "ADMIN"
                                ? "Make Member"
                                : "Make Admin"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.removeButton]}
                            onPress={() =>
                              handleRemoveMember(
                                member.id,
                                getUserDisplayName(member.user),
                              )
                            }
                            activeOpacity={0.7}
                          >
                            <MaterialIcons
                              name="person-remove"
                              size={16}
                              color={theme.colors.error}
                            />
                            <Text
                              style={[
                                styles.actionButtonText,
                                styles.removeButtonText,
                              ]}
                            >
                              Remove
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {isAdmin && pendingJoinRequests.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>Join Requests</Text>
                  <Text style={styles.sectionSubtitle}>
                    {pendingJoinRequests.length} pending
                  </Text>
                </View>
              </View>
              {pendingJoinRequests.map((request) => {
                const requestUser = request.user;
                const requestName =
                  requestUser?.profile?.displayName ||
                  requestUser?.email ||
                  "Unknown";
                return (
                  <View key={request.id} style={styles.memberCard}>
                    <View style={styles.memberInfo}>
                      <Avatar
                        avatarUrl={requestUser?.profile?.avatarUrl}
                        displayName={requestName}
                        size={44}
                        borderWidth={2}
                        borderColor={theme.colors.textInverse}
                      />
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>{requestName}</Text>
                        {!requestUser?.profile?.displayName &&
                          requestUser?.email && (
                            <Text style={styles.memberEmail}>
                              {requestUser.email}
                            </Text>
                          )}
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                          executeJoinAction({
                            requestId: request.id,
                            action: "approve",
                          })
                        }
                        disabled={joinActionLoading}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name="check"
                          size={16}
                          color={theme.colors.blue}
                        />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.removeButton]}
                        onPress={() =>
                          executeJoinAction({
                            requestId: request.id,
                            action: "decline",
                          })
                        }
                        disabled={joinActionLoading}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name="close"
                          size={16}
                          color={theme.colors.error}
                        />
                        <Text
                          style={[
                            styles.actionButtonText,
                            styles.removeButtonText,
                          ]}
                        >
                          Decline
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Transfer Ownership Section */}
          {isCreator && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transfer Ownership</Text>
              <Text style={styles.sectionDescription}>
                Transfer ownership to another member. They will become the
                creator and you will remain as an admin.
              </Text>
              {(group.members || [])
                .filter((m: GroupMember) => m.userId !== user?.id)
                .map((member: GroupMember) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.transferCard}
                    onPress={() =>
                      handleTransferOwnership(
                        member.userId,
                        getUserDisplayName(member),
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.memberInfo}>
                      <Avatar
                        avatarUrl={member.user?.profile?.avatarUrl}
                        displayName={
                          getUserDisplayName(member.user) || "Unknown"
                        }
                        size={44}
                        borderWidth={2}
                        borderColor={theme.colors.textInverse}
                      />
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>
                          {getUserDisplayName(member.user)}
                        </Text>
                        {!member.user?.profile?.displayName &&
                          member.user?.email && (
                            <Text style={styles.memberEmail}>
                              {member.user.email}
                            </Text>
                          )}
                      </View>
                    </View>
                    <MaterialIcons
                      name="arrow-forward"
                      size={20}
                      color={theme.colors.blue}
                    />
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
            {!isCreator && (
              <TouchableOpacity
                style={[styles.dangerButton, styles.leaveButton]}
                onPress={handleLeaveGroup}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="exit-to-app"
                  size={20}
                  color={theme.colors.error}
                />
                <Text style={styles.dangerButtonText}>Leave Circle</Text>
              </TouchableOpacity>
            )}
            {isCreator && (
              <TouchableOpacity
                style={[styles.dangerButton, styles.deleteButton]}
                onPress={handleDeleteGroup}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color={theme.colors.error}
                />
                <Text style={styles.dangerButtonText}>Delete Circle</Text>
              </TouchableOpacity>
            )}
          </View>
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
      paddingBottom: 24,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      marginBottom: 16,
      textAlign: "center",
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionHeaderLeft: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
      letterSpacing: -0.3,
    },
    sectionSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    sectionDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.base,
      padding: theme.spacing.base,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    settingDescription: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.gray700,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.backgroundSecondary,
      minHeight: 52,
    },
    textArea: {
      minHeight: 80,
      paddingTop: 12,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      marginTop: theme.spacing.sm,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    circleInfoCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    circleInfoHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    circleInfoIcon: {
      width: 64,
      height: 64,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    },
    circleInfoIconText: {
      fontSize: 28,
      fontWeight: "700",
      letterSpacing: -0.5,
    },
    circleInfoImage: {
      width: 64,
      height: 64,
      borderRadius: 16,
    },
    circleInfoDetails: {
      flex: 1,
      gap: 4,
    },
    circleInfoName: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    circleInfoDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    addButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    memberInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: 12,
    },
    memberDetails: {
      flex: 1,
    },
    memberNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    memberName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    memberEmail: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    memberBadges: {
      flexDirection: "row",
      gap: 6,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.spacing.md,
    },
    creatorBadge: {
      backgroundColor: theme.colors.warningBackground,
    },
    adminBadge: {
      backgroundColor: theme.colors.infoBackground,
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
    },
    actionButtons: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
      flexShrink: 0,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.blue,
      backgroundColor: theme.colors.background,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.blue,
    },
    removeButton: {
      borderColor: theme.colors.error,
    },
    removeButtonText: {
      color: theme.colors.error,
    },
    transferCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    imagePickerSection: {
      alignItems: "center",
      marginBottom: 32,
      marginTop: 8,
    },
    imagePickerContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: "dashed",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      position: "relative",
    },
    circleImagePreview: {
      width: "100%",
      height: "100%",
    },
    imagePickerPlaceholder: {
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      gap: 8,
    },
    imagePickerText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "center",
    },
    removeImageButton: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 3,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    iconPicker: {
      marginTop: theme.spacing.sm,
    },
    iconPickerContent: {
      gap: theme.spacing.md,
      paddingVertical: 4,
    },
    iconOption: {
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      minWidth: 80,
      marginRight: theme.spacing.sm,
    },
    iconOptionSelected: {
      borderColor: theme.colors.blue,
      backgroundColor: theme.colors.blueBackground,
    },
    iconLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 4,
      textAlign: "center",
    },
    iconLabelSelected: {
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.medium,
    },
    dangerSectionTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.error,
      marginBottom: theme.spacing.base,
    },
    dangerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      borderWidth: 1,
    },
    leaveButton: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.background,
    },
    deleteButton: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorBackground,
    },
    dangerButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.error,
    },
  });
}
