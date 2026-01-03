import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/authContext';
import { getGroups, Group } from '../api/groupApi';

interface GroupListScreenProps {
  onCreateGroup: () => void;
  onViewGroup: (groupId: string) => void;
  onBack: () => void;
}

export function GroupListScreen({
  onCreateGroup,
  onViewGroup,
  onBack,
}: GroupListScreenProps) {
  const { token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, [token]);

  async function loadGroups() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const groupsData = await getGroups(token);
      setGroups(groupsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load circles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getUserDisplayName(user: Group['createdByUser']): string {
    return user.profile?.displayName || user.email;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading circles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadGroups} />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateGroup}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonText}>+ New Circle</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadGroups}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Your Circles</Text>

          {groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No circles yet</Text>
              <Text style={styles.emptySubtext}>
                Create a circle to start splitting bills with friends!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateGroup}
              >
                <Text style={styles.emptyButtonText}>Create Circle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => onViewGroup(group.id)}
                activeOpacity={0.7}
              >
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  {group._count && (
                    <Text style={styles.groupExpenseCount}>
                      {group._count.expenses} billchop{group._count.expenses !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
                {group.description && (
                  <Text style={styles.groupDescription}>{group.description}</Text>
                )}
                <View style={styles.groupFooter}>
                  <Text style={styles.groupMembers}>
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.groupCreator}>
                    Created by {getUserDisplayName(group.createdByUser)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
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
    paddingBottom: 24, // lg: 24px
  },
  content: {
    paddingHorizontal: 24, // lg: 24px
    // No paddingTop - SafeAreaView handles top spacing
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // md: 16px
  },
  backButton: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 4, // xs: 4px
    minHeight: 44, // Touch target
  },
  backButtonText: {
    fontSize: 16, // Body: 16px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
  },
  createButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // lg: 24px
  },
  loadingText: {
    marginTop: 16, // md: 16px
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
  },
  errorContainer: {
    padding: 16, // md: 16px
    backgroundColor: '#FEF2F2', // Red-50
    borderRadius: 8, // Button: 8px
    marginBottom: 16, // md: 16px
  },
  errorText: {
    fontSize: 14, // Body: 14px
    color: '#EF4444', // Red-500
    marginBottom: 8, // sm: 8px
  },
  retryButton: {
    backgroundColor: '#EF4444', // Red-500
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  sectionTitle: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginBottom: 16, // md: 16px
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32, // xl: 32px
  },
  emptyText: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#374151', // Gray-700
    marginBottom: 8, // sm: 8px
  },
  emptySubtext: {
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
    textAlign: 'center',
    marginBottom: 24, // lg: 24px
  },
  emptyButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12, // Card: 12px
    padding: 16, // md: 16px
    marginBottom: 16, // md: 16px
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // sm: 8px
  },
  groupName: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    flex: 1,
  },
  groupExpenseCount: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
  },
  groupDescription: {
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
    marginBottom: 12, // md: 12px (3 * 4px)
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8, // sm: 8px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  groupMembers: {
    fontSize: 14, // Body: 14px
    color: '#374151', // Gray-700
  },
  groupCreator: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
  },
});

