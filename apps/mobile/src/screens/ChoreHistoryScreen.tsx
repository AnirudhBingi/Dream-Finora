import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getChoreHistory, ChoreHistoryEntry } from '../api/choreApi';

interface ChoreHistoryScreenProps {
  choreId: string;
  onBack: () => void;
}

export function ChoreHistoryScreen({
  choreId,
  onBack,
}: ChoreHistoryScreenProps) {
  const { token } = useAuth();
  const [history, setHistory] = useState<ChoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [choreId, token]);

  async function loadHistory() {
    if (!token) return;

    try {
      setLoading(true);
      const historyData = await getChoreHistory(token, choreId);
      setHistory(historyData);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load history',
      );
    } finally {
      setLoading(false);
    }
  }

  function getActionIcon(action: string): string {
    switch (action) {
      case 'created':
        return 'add-circle';
      case 'updated':
        return 'edit';
      case 'assigned':
        return 'person-add';
      case 'unassigned':
        return 'person-remove';
      case 'completed':
        return 'check-circle';
      case 'deleted':
        return 'delete';
      default:
        return 'history';
    }
  }

  function getActionColor(action: string): string {
    switch (action) {
      case 'created':
        return '#10B981'; // Green
      case 'updated':
        return '#3B82F6'; // Blue
      case 'assigned':
        return '#8B5CF6'; // Purple
      case 'unassigned':
        return '#F59E0B'; // Amber
      case 'completed':
        return '#10B981'; // Green
      case 'deleted':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }

  function getActionText(action: string): string {
    switch (action) {
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'assigned':
        return 'Assigned';
      case 'unassigned':
        return 'Unassigned';
      case 'completed':
        return 'Completed';
      case 'deleted':
        return 'Deleted';
      default:
        return action;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getUserDisplayName(entry: ChoreHistoryEntry): string {
    return entry.user?.profile?.displayName || entry.user?.email || 'Unknown';
  }

  function renderChangeDetails(entry: ChoreHistoryEntry) {
    if (!entry.changes) return null;

    if (entry.action === 'updated' && entry.changes.before && entry.changes.after) {
      const before = entry.changes.before;
      const after = entry.changes.after;
      const changedFields = Object.keys(after);

      return (
        <View style={styles.changesContainer}>
          {changedFields.map((field) => (
            <View key={field} style={styles.changeItem}>
              <Text style={styles.changeLabel}>{field}:</Text>
              <View style={styles.changeValues}>
                <Text style={styles.changeBefore}>
                  {before[field] !== undefined ? String(before[field]) : 'N/A'} →
                </Text>
                <Text style={styles.changeAfter}>
                  {after[field] !== undefined ? String(after[field]) : 'N/A'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (entry.action === 'completed' && entry.pointsEarned) {
      return (
        <View style={styles.changesContainer}>
          <Text style={styles.changeText}>
            Earned {entry.pointsEarned} points
            {entry.onTime !== undefined && (
              <Text style={entry.onTime ? styles.onTime : styles.late}>
                {' '}({entry.onTime ? 'On time' : 'Late'})
              </Text>
            )}
          </Text>
        </View>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Task History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No history available</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {history.map((entry, index) => (
              <View key={entry.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineIcon,
                      { backgroundColor: getActionColor(entry.action) },
                    ]}
                  >
                    <MaterialIcons
                      name={getActionIcon(entry.action) as any}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  {index < history.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryAction}>
                      {getActionText(entry.action)}
                    </Text>
                    <Text style={styles.entryDate}>
                      {formatDate(entry.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.entryUser}>
                    by {getUserDisplayName(entry)}
                  </Text>
                  {entry.notes && (
                    <Text style={styles.entryNotes}>{entry.notes}</Text>
                  )}
                  {renderChangeDetails(entry)}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 60,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  timeline: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
    minHeight: 24,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  entryDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  entryUser: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  entryNotes: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  changesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  changeItem: {
    marginBottom: 8,
  },
  changeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  changeValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeBefore: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  changeAfter: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  changeText: {
    fontSize: 14,
    color: '#374151',
  },
  onTime: {
    color: '#10B981',
    fontWeight: '500',
  },
  late: {
    color: '#EF4444',
    fontWeight: '500',
  },
});

