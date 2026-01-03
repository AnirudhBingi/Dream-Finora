import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getFriends } from '../api/friendApi';
import { getBalances, BalanceInfo } from '../api/expenseApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';

interface BillchopFriendsScreenProps {
  onBack: () => void;
  onViewFriendExpenses: (friendId: string, friendName: string) => void;
}

export function BillchopFriendsScreen({ onBack, onViewFriendExpenses }: BillchopFriendsScreenProps) {
  const { token, user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      const [friendsData, balancesData] = await Promise.all([
        getFriends(token),
        fetch(`${getApiBaseUrl()}/expenses/balances`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).then(res => res.json()),
      ]);

      setFriends(friendsData);
      setBalances(balancesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getUserDisplayName(friend: any): string {
    return friend.friend?.profile?.displayName || friend.friend?.email || 'Unknown';
  }

  function getUserAvatar(friend: any): string | null {
    return friend.friend?.profile?.avatarUrl || null;
  }

  function getBalanceForFriend(friendId: string): { owed: number; owedTo: number } {
    if (!balances) return { owed: 0, owedTo: 0 };

    const owedBy = balances.owedByUser.find(item => item.user.id === friendId);
    const owedTo = balances.owedToUser.find(item => item.user.id === friendId);

    return {
      owed: owedBy?.amount || 0,
      owedTo: owedTo?.amount || 0,
    };
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        {friends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Friends Yet</Text>
            <Text style={styles.emptyText}>
              Add friends to start splitting expenses with them
            </Text>
          </View>
        ) : (
          friends.map((friend) => {
            const friendName = getUserDisplayName(friend);
            const avatar = getUserAvatar(friend);
            const balance = getBalanceForFriend(friend.friend.id);
            const netBalance = balance.owedTo - balance.owed;

            return (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendCard}
                onPress={() => onViewFriendExpenses(friend.friend.id, friendName)}
              >
                <View style={styles.friendInfo}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {friendName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{friendName}</Text>
                    {netBalance !== 0 && (
                      <Text
                        style={[
                          styles.balanceText,
                          netBalance > 0 ? styles.positiveBalance : styles.negativeBalance,
                        ]}
                      >
                        {netBalance > 0
                          ? `You owe ${formatCurrency(Math.abs(netBalance))}`
                          : `Owes you ${formatCurrency(Math.abs(netBalance))}`}
                      </Text>
                    )}
                    {netBalance === 0 && (
                      <Text style={styles.balanceText}>Settled up</Text>
                    )}
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 14,
    color: '#6B7280',
  },
  positiveBalance: {
    color: '#EF4444',
  },
  negativeBalance: {
    color: '#10B981',
  },
});

