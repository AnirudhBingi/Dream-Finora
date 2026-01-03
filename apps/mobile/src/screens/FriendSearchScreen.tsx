import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import {
  searchUsers,
  sendFriendRequest,
  SearchUser,
} from '../api/friendApi';

interface FriendSearchScreenProps {
  onBack: () => void;
  onRequestSent?: () => void;
}

export function FriendSearchScreen({ onBack, onRequestSent }: FriendSearchScreenProps) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

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
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to search users');
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
      Alert.alert('Success', 'Friend request sent!', [
        {
          text: 'OK',
          onPress: () => {
            if (onRequestSent) {
              onRequestSent();
            }
            onBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send friend request');
    } finally {
      setSendingRequest(null);
    }
  }

  function getUserDisplayName(user: SearchUser): string {
    return user.profile?.displayName || user.email;
  }

  function getFriendStatusBadge(status?: string) {
    switch (status) {
      case 'accepted':
        return (
          <View style={styles.statusBadge}>
            <MaterialIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.statusText}>Friends</Text>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <MaterialIcons name="schedule" size={16} color="#F59E0B" />
            <Text style={[styles.statusText, styles.pendingText]}>Pending</Text>
          </View>
        );
      case 'blocked':
        return (
          <View style={[styles.statusBadge, styles.blockedBadge]}>
            <MaterialIcons name="block" size={16} color="#EF4444" />
            <Text style={[styles.statusText, styles.blockedText]}>Blocked</Text>
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email or name..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        {searching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {searchQuery.length < 2 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Search for friends</Text>
            <Text style={styles.emptySubtext}>
              Enter at least 2 characters to search by email or display name
            </Text>
          </View>
        ) : searchResults.length === 0 && !searching ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="person-off" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              Try searching with a different email or name
            </Text>
          </View>
        ) : (
          searchResults.map((user) => {
            const userIdentifier = user.email; // Use email as identifier (backend supports email or mobile)
            const isSending = sendingRequest === userIdentifier;
            const canSendRequest = !user.friendStatus || user.friendStatus === 'none';

            return (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <MaterialIcons name="person" size={24} color="#6B7280" />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{getUserDisplayName(user)}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    {user.mobileNumber && (
                      <Text style={styles.userMobile}>{user.mobileNumber}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.userActions}>
                  {getFriendStatusBadge(user.friendStatus)}
                  {canSendRequest && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleSendRequest(userIdentifier)}
                      disabled={isSending}
                      activeOpacity={0.7}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
                          <Text style={styles.addButtonText}>Add</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  userMobile: {
    fontSize: 14,
    color: '#6B7280',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  pendingText: {
    color: '#F59E0B',
  },
  blockedBadge: {
    backgroundColor: '#FEE2E2',
  },
  blockedText: {
    color: '#EF4444',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

