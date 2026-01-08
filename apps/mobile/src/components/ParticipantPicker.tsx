import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getFriends, Friend, searchUsers, SearchUser } from '../api/friendApi';
import { getGroups, Group, getGroupById, GroupMember } from '../api/groupApi';
import { Avatar } from './Avatar';

export interface SelectedParticipant {
  userId: string;
  type: 'friend' | 'group-member';
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
}: ParticipantPickerProps) {
  const { token, user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
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
      console.error('Failed to load friends:', err);
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
      } else if (groupsData && typeof groupsData === 'object') {
        groupsList = (groupsData as any).groups || [];
      }
      setGroups(groupsList);
    } catch (err) {
      console.error('Failed to load groups:', err);
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
      console.error('Failed to load group members:', err);
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
          (p) => !(p.userId === participant.userId && p.type === participant.type),
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

  function isParticipantSelected(userId: string, type: 'friend' | 'group-member'): boolean {
    return (selectedParticipants || []).some((p) => p.userId === userId && p.type === type);
  }

  function getUserDisplayName(friend: Friend): string {
    return friend?.friend?.profile?.displayName || friend?.friend?.email || 'Unknown';
  }

  function getMemberDisplayName(member: GroupMember): string {
    return member?.user?.profile?.displayName || member?.user?.email || 'Unknown';
  }

  return (
    <View style={styles.container}>
      {/* Friends Section - Only show if showFriends is true or no group is selected */}
      {(showFriends || !selectedGroupId) && (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="people" size={20} color="#2563EB" />
          <Text style={styles.sectionTitle}>Friends</Text>
        </View>
        {!token ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Please log in to select participants</Text>
          </View>
        ) : loadingFriends ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={24} color="#9CA3AF" />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Add friends from the Friends screen</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
            {/* Add current user as "You" in friends list */}
            {user && (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.participantChip,
                  isParticipantSelected(user.id, 'friend') && styles.participantChipSelected,
                ]}
                onPress={() =>
                  toggleParticipant({
                    userId: user.id,
                    type: 'friend',
                    name: 'You',
                    email: user.email || '',
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.chipContent}>
                  <View style={isParticipantSelected(user.id, 'friend') && styles.avatarSelected}>
                    <Avatar
                      avatarUrl={user.profile?.avatarUrl}
                      displayName="You"
                      size={32}
                      borderColor={isParticipantSelected(user.id, 'friend') ? '#FFFFFF' : 'transparent'}
                      borderWidth={isParticipantSelected(user.id, 'friend') ? 2 : 0}
                    />
                  </View>
                  <Text
                    style={[
                      styles.chipText,
                      isParticipantSelected(user.id, 'friend') && styles.chipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    You
                  </Text>
                  {isParticipantSelected(user.id, 'friend') && (
                    <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            {friends.map((friend) => {
              const isSelected = isParticipantSelected(friend.friendId, 'friend');
              return (
                <TouchableOpacity
                  key={friend.id}
                  style={[styles.participantChip, isSelected && styles.participantChipSelected]}
                  onPress={() =>
                    toggleParticipant({
                      userId: friend.friendId,
                      type: 'friend',
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
                        borderColor={isSelected ? '#FFFFFF' : 'transparent'}
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
                      <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
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
            <MaterialIcons name="group" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Groups</Text>
          </View>
          {!token ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Please log in to see groups</Text>
            </View>
          ) : loadingGroups ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading groups...</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={24} color="#9CA3AF" />
              <Text style={styles.emptyText}>No groups yet</Text>
              <Text style={styles.emptySubtext}>Create a group from the Circles screen</Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scrollView}
              >
                {groups && Array.isArray(groups) && groups.map((group) => {
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <TouchableOpacity
                      key={group.id}
                      style={[styles.groupChip, isSelected && styles.groupChipSelected]}
                      onPress={() => {
                        const newGroupId = isSelected ? null : group.id;
                        setSelectedGroupId(newGroupId);
                        onGroupChange?.(newGroupId);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.chipContent}>
                        <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                          <MaterialIcons
                            name="group"
                            size={16}
                            color={isSelected ? '#FFFFFF' : '#6B7280'}
                          />
                        </View>
                        <Text
                          style={[styles.chipText, isSelected && styles.chipTextSelected]}
                          numberOfLines={1}
                        >
                          {group.name}
                        </Text>
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
                      <ActivityIndicator size="small" color="#3B82F6" />
                      <Text style={styles.loadingText}>Loading members...</Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.scrollView}
                    >
                      {groupMembers.map((member) => {
                          const isCurrentUser = member.userId === user?.id;
                          const displayName = isCurrentUser ? 'You' : getMemberDisplayName(member);
                          const isSelected = isParticipantSelected(member.userId, 'group-member');
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
                                  type: 'group-member',
                                  name: displayName,
                                  email: member.user.email,
                                })
                              }
                              activeOpacity={0.7}
                            >
                              <View style={styles.chipContent}>
                                <View style={isSelected && styles.avatarSelected}>
                                  <Avatar
                                    avatarUrl={member?.user?.profile?.avatarUrl}
                                    displayName={displayName}
                                    size={32}
                                    borderColor={isSelected ? '#FFFFFF' : 'transparent'}
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
                                  <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
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
            {selectedParticipants.length} participant{selectedParticipants.length !== 1 ? 's' : ''}{' '}
            selected
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    minHeight: 120, // Ensure minimum height so it's always visible
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  participantChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  participantChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  groupChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarSelected: {
    // This style is used for the Avatar component wrapper when selected
    // The Avatar component handles its own styling
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    maxWidth: 120,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  groupMembersContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});

