import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getFriends, Friend, searchUsers, SearchUser } from "../api/friendApi";
import { getGroups, Group, getGroupById, GroupMember } from "../api/groupApi";
import { Avatar } from "./Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useTheme } from "../theme";

export interface SelectedParticipant {
  userId: string;
  type: "friend" | "group-member";
  name: string;
  email: string;
}

interface ParticipantPickerProps {
  selectedParticipants: SelectedParticipant[];
  onSelectionChange: (participants: SelectedParticipant[]) => void;
  allowMultiple?: boolean;
  showGroups?: boolean;
  showFriends?: boolean;
  groupId?: string;
  initialGroupId?: string | null;
  onGroupChange?: (groupId: string | null) => void;
  excludeCurrentUser?: boolean; // If true, exclude current user from selection (e.g., for Charge Riders where driver can't be a passenger)
}

export function ParticipantPicker({
  selectedParticipants,
  onSelectionChange,
  allowMultiple = true,
  showGroups = true,
  showFriends = false,
  groupId,
  initialGroupId,
  onGroupChange,
  excludeCurrentUser = false,
}: ParticipantPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroupId || null,
  );
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Sync selectedGroupId with initialGroupId or groupId prop
  useEffect(() => {
    const groupIdToUse = groupId || initialGroupId;
    if (groupIdToUse !== undefined) {
      setSelectedGroupId(groupIdToUse);
    }
  }, [groupId, initialGroupId]);

  useEffect(() => {
    if (token) {
      loadFriends();
      if (showGroups) {
        loadGroups();
      }
    }
  }, [token, showGroups]);

  useEffect(() => {
    if (selectedGroupId && token) {
      loadGroupMembers(selectedGroupId);
    } else {
      setGroupMembers([]);
    }
  }, [selectedGroupId, token]);

  async function loadFriends() {
    if (!token) return;

    try {
      setLoadingFriends(true);
      const friendsData = await getFriends(token);
      setFriends(friendsData);
    } catch (err) {
      console.error("Failed to load friends:", err);
    } finally {
      setLoadingFriends(false);
    }
  }

  async function loadGroups() {
    if (!token) return;

    try {
      setLoadingGroups(true);
      const groupsData = await getGroups(token);
      // Handle both array response and paginated response
      let groupsList: Group[] = [];
      if (Array.isArray(groupsData)) {
        groupsList = groupsData;
      } else if (groupsData && typeof groupsData === "object") {
        groupsList = (groupsData as any).groups || [];
      }
      setGroups(groupsList);
    } catch (err) {
      console.error("Failed to load groups:", err);
      setGroups([]); // Set empty array on error
    } finally {
      setLoadingGroups(false);
    }
  }

  async function loadGroupMembers(groupId: string) {
    if (!token) return;

    try {
      setLoadingMembers(true);
      const groupData = await getGroupById(token, groupId);
      setGroupMembers(groupData.members || []);
    } catch (err) {
      console.error("Failed to load group members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }

  function toggleParticipant(participant: SelectedParticipant) {
    const isSelected = (selectedParticipants || []).some(
      (p) => p.userId === participant.userId && p.type === participant.type,
    );

    if (isSelected) {
      // Remove participant
      onSelectionChange(
        (selectedParticipants || []).filter(
          (p) =>
            !(p.userId === participant.userId && p.type === participant.type),
        ),
      );
    } else {
      // Add participant
      if (allowMultiple) {
        onSelectionChange([...(selectedParticipants || []), participant]);
      } else {
        onSelectionChange([participant]);
      }
    }
  }

  function isParticipantSelected(
    userId: string,
    type: "friend" | "group-member",
  ): boolean {
    return (selectedParticipants || []).some(
      (p) => p.userId === userId && p.type === type,
    );
  }

  function getUserDisplayName(friend: Friend): string {
    return (
      friend?.friend?.profile?.displayName || friend?.friend?.email || "Unknown"
    );
  }

  function getMemberDisplayName(member: GroupMember): string {
    return (
      member?.user?.profile?.displayName || member?.user?.email || "Unknown"
    );
  }

  return (
    <View style={styles.container}>
      {/* Friends Section - Only show if showFriends is true or no group is selected */}
      {(showFriends || !selectedGroupId) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={20} color={theme.colors.blue} />
            <Text style={styles.sectionTitle}>Friends</Text>
          </View>
          {!token ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Please log in to select participants
              </Text>
            </View>
          ) : loadingFriends ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.blue} />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="people-outline"
                size={24}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Add friends from the Friends screen
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.scrollView}
            >
              {/* Add current user as "You" in friends list */}
              {user && (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.participantChip,
                    isParticipantSelected(user.id, "friend") &&
                      styles.participantChipSelected,
                  ]}
                  onPress={() =>
                    toggleParticipant({
                      userId: user.id,
                      type: "friend",
                      name: "You",
                      email: user.email || "",
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.chipContent}>
                    <View
                      style={
                        isParticipantSelected(user.id, "friend") &&
                        styles.avatarSelected
                      }
                    >
                      <Avatar
                        avatarUrl={undefined}
                        displayName="You"
                        size={32}
                        borderColor={
                          isParticipantSelected(user.id, "friend")
                            ? theme.colors.textInverse
                            : "transparent"
                        }
                        borderWidth={
                          isParticipantSelected(user.id, "friend") ? 2 : 0
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.chipText,
                        isParticipantSelected(user.id, "friend") &&
                          styles.chipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      You
                    </Text>
                    {isParticipantSelected(user.id, "friend") && (
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color={theme.colors.textInverse}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              {friends
                .filter((friend) => {
                  // Filter out current user if excludeCurrentUser is true
                  if (excludeCurrentUser && friend.friendId === user?.id) {
                    return false;
                  }
                  return true;
                })
                .map((friend) => {
                  const isSelected = isParticipantSelected(
                    friend.friendId,
                    "friend",
                  );
                  return (
                    <TouchableOpacity
                      key={friend.id}
                      style={[
                        styles.participantChip,
                        isSelected && styles.participantChipSelected,
                      ]}
                      onPress={() =>
                        toggleParticipant({
                          userId: friend.friendId,
                          type: "friend",
                          name: getUserDisplayName(friend),
                          email: friend.friend.email,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.chipContent}>
                        <View style={isSelected && styles.avatarSelected}>
                          <Avatar
                            avatarUrl={friend?.friend?.profile?.avatarUrl}
                            displayName={getUserDisplayName(friend)}
                            size={32}
                            borderColor={
                              isSelected
                                ? theme.colors.textInverse
                                : "transparent"
                            }
                            borderWidth={isSelected ? 2 : 0}
                          />
                        </View>
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {getUserDisplayName(friend)}
                        </Text>
                        {isSelected && (
                          <MaterialIcons
                            name="check-circle"
                            size={16}
                            color={theme.colors.textInverse}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Groups Section */}
      {showGroups && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="group" size={20} color={theme.colors.blue} />
            <Text style={styles.sectionTitle}>Groups</Text>
          </View>
          {!token ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Please log in to see groups</Text>
            </View>
          ) : loadingGroups ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.blue} />
              <Text style={styles.loadingText}>Loading groups...</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="people-outline"
                size={24}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.emptyText}>No groups yet</Text>
              <Text style={styles.emptySubtext}>
                Create a group from the Circles screen
              </Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scrollView}
              >
                {groups &&
                  Array.isArray(groups) &&
                  groups.map((group) => {
                    const isSelected = selectedGroupId === group.id;
                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[
                          styles.groupChip,
                          isSelected && styles.groupChipSelected,
                        ]}
                        onPress={() => {
                          const newGroupId = isSelected ? null : group.id;
                          setSelectedGroupId(newGroupId);
                          onGroupChange?.(newGroupId);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.chipContent}>
                          <Avatar
                            avatarUrl={getAvatarUrl(group.avatarUrl || null)}
                            displayName={group.name}
                            size={32}
                            borderColor={
                              isSelected
                                ? theme.colors.textInverse
                                : "transparent"
                            }
                            borderWidth={isSelected ? 2 : 0}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {group.name}
                          </Text>
                          {isSelected && (
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color={theme.colors.textInverse}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>

              {/* Group Members */}
              {selectedGroupId && (
                <View style={styles.groupMembersContainer}>
                  {loadingMembers ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.blue}
                      />
                      <Text style={styles.loadingText}>Loading members...</Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.scrollView}
                    >
                      {groupMembers
                        .filter((member) => {
                          // Filter out current user if excludeCurrentUser is true
                          if (
                            excludeCurrentUser &&
                            member.userId === user?.id
                          ) {
                            return false;
                          }
                          return true;
                        })
                        .map((member) => {
                          const isCurrentUser = member.userId === user?.id;
                          const displayName = isCurrentUser
                            ? "You"
                            : getMemberDisplayName(member);
                          const isSelected = isParticipantSelected(
                            member.userId,
                            "group-member",
                          );
                          return (
                            <TouchableOpacity
                              key={member.userId}
                              style={[
                                styles.participantChip,
                                isSelected && styles.participantChipSelected,
                              ]}
                              onPress={() =>
                                toggleParticipant({
                                  userId: member.userId,
                                  type: "group-member",
                                  name: displayName,
                                  email: member.user.email,
                                })
                              }
                              activeOpacity={0.7}
                            >
                              <View style={styles.chipContent}>
                                <View
                                  style={isSelected && styles.avatarSelected}
                                >
                                  <Avatar
                                    avatarUrl={member?.user?.profile?.avatarUrl}
                                    displayName={displayName}
                                    size={32}
                                    borderColor={
                                      isSelected
                                        ? theme.colors.textInverse
                                        : "transparent"
                                    }
                                    borderWidth={isSelected ? 2 : 0}
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextSelected,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {displayName}
                                </Text>
                                {isSelected && (
                                  <MaterialIcons
                                    name="check-circle"
                                    size={16}
                                    color={theme.colors.textInverse}
                                  />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Selected Participants Summary */}
      {selectedParticipants.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {selectedParticipants.length} participant
            {selectedParticipants.length !== 1 ? "s" : ""} selected
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.base,
      minHeight: 120, // Ensure minimum height so it's always visible
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      paddingHorizontal: theme.spacing.xs,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    scrollView: {
      marginHorizontal: -theme.spacing.base,
      paddingHorizontal: theme.spacing.base,
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    emptyContainer: {
      paddingVertical: theme.spacing.base,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 80,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    participantChip: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 20,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.sm,
      borderWidth: 2,
      borderColor: "transparent",
    },
    participantChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    groupChip: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 20,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.sm,
      borderWidth: 2,
      borderColor: "transparent",
    },
    groupChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    chipContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.gray200,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarSelected: {
      // This style is used for the Avatar component wrapper when selected
      // The Avatar component handles its own styling
      backgroundColor: theme.colors.background,
    },
    chipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      maxWidth: 120,
    },
    chipTextSelected: {
      color: theme.colors.textInverse,
    },
    groupMembersContainer: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    summaryContainer: {
      marginTop: theme.spacing.base,
      paddingTop: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    summaryText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
  });
