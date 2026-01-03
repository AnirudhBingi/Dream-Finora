import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getFriends, Friend } from '../api/friendApi';
import { addGroupMember, getGroupById, GroupMemberRole } from '../api/groupApi';

interface AddGroupMemberScreenProps {
  groupId: string;
  onBack: () => void;
  onMemberAdded?: () => void;
}

export function AddGroupMemberScreen({
  groupId,
  onBack,
  onMemberAdded,
}: AddGroupMemberScreenProps) {
  const { token, user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token, groupId]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      const [friendsData, groupData] = await Promise.all([
        getFriends(token),
        getGroupById(token, groupId),
      ]);
      
      // Get existing member IDs from group
      const memberIds = groupData.members.map(m => m.userId);
      setExistingMemberIds(memberIds);
      
      // Filter out friends who are already members
      const availableFriends = friendsData.filter(
        friend => !memberIds.includes(friend.friendId),
      );
      setFriends(availableFriends);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(friendId: string) {
    if (!token) return;

    try {
      setAdding(friendId);
      await addGroupMember(token, groupId, friendId);
      Alert.alert('Success', 'Member added successfully', [
        { text: 'OK', onPress: () => {
          onMemberAdded?.();
          onBack();
        }},
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(null);
    }
  }

  function getUserDisplayName(friend: Friend): string {
    return friend.friend.profile?.displayName || friend.friend.email;
  }

  const filteredFriends = friends.filter(friend =>
    getUserDisplayName(friend).toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Member</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Friends List */}
          {filteredFriends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No friends found' : 'No friends available'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'All your friends are already members of this circle'}
              </Text>
            </View>
          ) : (
            <View style={styles.friendsList}>
              {filteredFriends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendCard}
                  onPress={() => handleAddMember(friend.friendId)}
                  disabled={adding === friend.friendId}
                  activeOpacity={0.7}
                >
                  <View style={styles.friendInfo}>
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>
                        {getUserDisplayName(friend).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{getUserDisplayName(friend)}</Text>
                      <Text style={styles.friendEmail}>{friend.friend.email}</Text>
                    </View>
                  </View>
                  {adding === friend.friendId ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <MaterialIcons name="person-add" size={24} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  friendsList: {
    gap: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
});

