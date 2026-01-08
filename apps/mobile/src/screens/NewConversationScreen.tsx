import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getFriends, Friend } from '../api/friendApi';
import { getGroups, Group } from '../api/groupApi';
import { startConversation } from '../api/messagingApi';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';

interface NewConversationScreenProps {
  onBack: () => void;
  onConversationStarted?: (chatId: string, otherUser?: any, group?: Group) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

type TabType = 'friends' | 'groups';

export function NewConversationScreen({
  onBack,
  onConversationStarted,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: NewConversationScreenProps) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [starting, setStarting] = useState<string | null>(null); // userId or groupId being processed

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [friendsData, groupsData] = await Promise.all([
        getFriends(token),
        getGroups(token),
      ]);
      
      // Handle friends
      const friendsList = Array.isArray(friendsData) 
        ? friendsData.filter(f => f.status === 'accepted')
        : [];
      setFriends(friendsList);
      
      // Handle groups - can be array or paginated response
      let groupsList: Group[] = [];
      if (Array.isArray(groupsData)) {
        groupsList = groupsData;
      } else if (groupsData && typeof groupsData === 'object' && 'groups' in groupsData) {
        groupsList = (groupsData as any).groups || [];
      }
      setGroups(groupsList);
    } catch (err: any) {
      setError(getUserFriendlyErrorMessage(err));
      setFriends([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartConversation(friend: Friend) {
    if (!token || !friend.friend || starting) return;

    const friendId = friend.friend.id || friend.friendId;
    if (!friendId) return;

    try {
      setStarting(friendId);
      const conversation = await startConversation(token, friendId);
      if (onConversationStarted) {
        onConversationStarted(conversation.id, friend.friend);
      }
    } catch (err: any) {
      // Error handling - could show toast
      console.error('Failed to start conversation:', err);
    } finally {
      setStarting(null);
    }
  }

  async function handleStartGroupChat(group: Group) {
    if (!token || starting) return;

    // TODO: Implement group chat creation/joining
    // For now, we'll need to add backend support for group chats
    // This is a placeholder
    console.log('Group chat not yet implemented:', group.id);
  }

  function getUserDisplayName(friend: Friend): string {
    return friend.friend?.profile?.displayName || friend.friend?.email || 'Unknown';
  }

  function getGroupDisplayName(group: Group): string {
    return group.name || 'Unnamed Group';
  }

  // Filter data based on search query
  const filteredFriends = Array.isArray(friends) ? friends.filter((friend) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const displayName = getUserDisplayName(friend).toLowerCase();
    const email = friend.friend?.email?.toLowerCase() || '';
    return displayName.includes(query) || email.includes(query);
  }) : [];

  const filteredGroups = Array.isArray(groups) ? groups.filter((group) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getGroupDisplayName(group).toLowerCase();
    const description = group.description?.toLowerCase() || '';
    return name.includes(query) || description.includes(query);
  }) : [];

  const renderFriend = ({ item }: { item: Friend }) => {
    const displayName = getUserDisplayName(item);
    const friendId = item.friend?.id || item.friendId || '';
    const isStarting = starting === friendId;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleStartConversation(item)}
        disabled={isStarting}
        activeOpacity={0.7}
      >
        <Avatar
          avatarUrl={item.friend?.profile?.avatarUrl}
          displayName={displayName}
          size={52}
          borderWidth={2}
          borderColor="#FFFFFF"
        />
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{displayName}</Text>
          {item.friend?.email && item.friend?.profile?.displayName && (
            <Text style={styles.itemSubtext}>{item.friend.email}</Text>
          )}
        </View>
        {isStarting ? (
          <ActivityIndicator size="small" color="#6366F1" />
        ) : (
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        )}
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const displayName = getGroupDisplayName(item);
    const isStarting = starting === item.id;
    const memberCount = item.members?.length || 0;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleStartGroupChat(item)}
        disabled={isStarting || true} // Disabled until group chat is implemented
        activeOpacity={0.7}
      >
        {item.avatarUrl ? (
          <View style={[styles.groupAvatar, { backgroundColor: '#EEF2FF' }]}>
            <Text style={[styles.groupAvatarText, { color: '#6366F1' }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : (
          <View style={[styles.groupAvatar, { backgroundColor: '#EEF2FF' }]}>
            <Text style={[styles.groupAvatarText, { color: '#6366F1' }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{displayName}</Text>
          <Text style={styles.itemSubtext}>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
            {item.description ? ` • ${item.description}` : ''}
          </Text>
        </View>
        {isStarting ? (
          <ActivityIndicator size="small" color="#6366F1" />
        ) : (
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header
          title="New Message"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header
          title="New Message"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error} onRetry={loadData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title="New Message"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends or groups..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.searchClear}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'friends' ? (
        filteredFriends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No friends found' : 'No friends yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Add friends to start conversations'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredFriends}
            renderItem={renderFriend}
            keyExtractor={(item, index) => item.id || `friend-${index}`}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : (
        filteredGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="group-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No groups found' : 'No groups yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Create or join a group to start group chats'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredGroups}
            renderItem={renderGroup}
            keyExtractor={(item, index) => item.id || `group-${index}`}
            contentContainerStyle={styles.listContent}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  searchClear: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  itemSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

