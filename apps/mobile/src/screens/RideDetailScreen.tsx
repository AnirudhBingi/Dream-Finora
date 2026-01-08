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
import { getRideById, joinRide, deleteRide, getRideHistory, Ride, RideParticipant, RideHistoryEntry } from '../api/rideApi';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { Header, HeaderOption } from '../components/Header';

interface RideDetailScreenProps {
  rideId: string;
  onBack: () => void;
  onRefresh: () => void;
  onNavigateToEdit?: (rideId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function RideDetailScreen({
  rideId,
  onBack,
  onRefresh,
  onNavigateToEdit,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: RideDetailScreenProps) {
  const { token, user } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [history, setHistory] = useState<RideHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadRide();
  }, [rideId, token]);

  async function loadRide() {
    if (!token) return;

    try {
      setLoading(true);
      const rideData = await getRideById(token, rideId);
      setRide(rideData);
    } catch (err) {
      // Error will be handled by error state
      console.error('Failed to load ride:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    if (!token) return;

    try {
      setLoadingHistory(true);
      const historyData = await getRideHistory(token, rideId);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleDelete() {
    if (!token) return;

    Alert.alert(
      'Delete Ride',
      'Are you sure you want to delete this ride? This will also remove the associated expense. All participants will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteRide(token, rideId);
              Alert.alert('Success', 'Ride deleted successfully', [
                { text: 'OK', onPress: () => {
                  onRefresh();
                  onBack();
                }},
              ]);
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete ride',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  function handleEdit() {
    if (onNavigateToEdit) {
      onNavigateToEdit(rideId);
    }
  }

  async function handleJoin() {
    if (!token) return;

    Alert.alert(
      'Join Ride',
      'Are you sure you want to join this ride? The expense will be updated automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            try {
              setActionLoading(true);
              await joinRide(token, rideId);
              Alert.alert('Success', 'You have joined the ride!', [
                { text: 'OK', onPress: () => {
                  loadRide();
                  onRefresh();
                }},
              ]);
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to join ride',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  function getUserDisplayName(user: Ride['driver'] | RideParticipant['user'] | undefined | null): string {
    if (!user) return 'Unknown';
    return user.profile?.displayName || user.email || 'Unknown';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getTypeLabel(type: Ride['type']): string {
    return type === 'giveRide' ? 'Give Ride' : 'Rideshare';
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Ride Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Ride Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message="Ride not found" onRetry={loadRide} />
      </SafeAreaView>
    );
  }

  const isDriver = ride.driverId === user?.id;
  const isParticipant = (ride.participants || []).some((p) => p.userId === user?.id);
  const canJoin = !isDriver && !isParticipant;
  const passengers = (ride.participants || []).filter((p) => !p.isDriver);

  // Prepare header options menu
  const headerOptions: HeaderOption[] = [];
  if (isDriver) {
    if (onNavigateToEdit) {
      headerOptions.push({
        label: 'Edit',
        icon: 'edit',
        onPress: () => onNavigateToEdit(ride.id),
      });
    }
    headerOptions.push({
      label: 'Delete',
      icon: 'delete',
      onPress: handleDelete,
      danger: true,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Ride Details"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        useOptionsMenu={true}
        options={headerOptions}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {isDriver && (
            <TouchableOpacity
              style={styles.historyToggleButton}
              onPress={() => setShowHistory(!showHistory)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="history" size={20} color="#2563EB" />
              <Text style={styles.historyToggleText}>
                {showHistory ? 'Hide History' : 'Show History'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.rideCard}>
            <View style={styles.rideHeader}>
              <View style={styles.rideTypeBadge}>
                <Text style={styles.rideTypeText}>{getTypeLabel(ride.type)}</Text>
              </View>
              {isDriver && (
                <View style={styles.driverBadge}>
                  <Text style={styles.driverBadgeText}>You are the driver</Text>
                </View>
              )}
              {isParticipant && !isDriver && (
                <View style={styles.participantBadge}>
                  <Text style={styles.participantBadgeText}>You are a passenger</Text>
                </View>
              )}
            </View>

            <Text style={styles.rideRoute}>
              {ride.origin} → {ride.destination}
            </Text>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{formatDate(ride.date)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Driver:</Text>
                <Text style={styles.infoValue}>{getUserDisplayName(ride.driver)}</Text>
              </View>

              {ride.distance && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Distance:</Text>
                  <Text style={styles.infoValue}>{ride.distance.toFixed(1)} miles</Text>
                </View>
              )}

              {ride.chargePerMile && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Charge per mile:</Text>
                  <Text style={styles.infoValue}>${ride.chargePerMile.toFixed(2)}</Text>
                </View>
              )}

              {ride.chargePerRide && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Charge per ride:</Text>
                  <Text style={styles.infoValue}>${ride.chargePerRide.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total cost:</Text>
                <Text style={styles.infoValue}>${ride.totalCost.toFixed(2)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cost per person:</Text>
                <Text style={styles.infoValue}>
                  ${(ride.totalCost / (ride.type === 'rideshare' ? ride.participants.length : passengers.length)).toFixed(2)}
                </Text>
              </View>

              {ride.expenseId && (
                <View style={styles.expenseLink}>
                  <Text style={styles.expenseLinkText}>
                    ✓ Expense automatically created and added to expense splitting
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.participantsSection}>
              <Text style={styles.participantsTitle}>
                Participants ({ride.participants.length})
              </Text>
              <View style={styles.participantItem}>
                <Text style={styles.participantName}>
                  {getUserDisplayName(ride.driver)} (Driver)
                </Text>
              </View>
              {passengers.map((participant) => (
                <View key={participant.id} style={styles.participantItem}>
                  <Text style={styles.participantName}>
                    {getUserDisplayName(participant.user)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {canJoin && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoin}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinButtonText}>Join Ride</Text>
              )}
            </TouchableOpacity>
          )}

          {/* History Section */}
          {showHistory && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Ride History</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (history.length === 0) {
                      loadHistory();
                    }
                    setShowHistory(true);
                  }}
                >
                  <MaterialIcons name="refresh" size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>
              {loadingHistory ? (
                <View style={styles.historyLoading}>
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              ) : history.length === 0 ? (
                <Text style={styles.historyEmpty}>No history available</Text>
              ) : (
                <View style={styles.historyList}>
                  {history.map((entry, index) => (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyItemContent}>
                        <Text style={styles.historyItemDescription}>
                          {entry.description}
                        </Text>
                        <Text style={styles.historyItemTime}>
                          {formatDate(entry.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
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
    paddingBottom: 24, // lg: 24px
  },
  content: {
    paddingHorizontal: 24, // lg: 24px
    // No paddingTop - SafeAreaView handles top spacing
  },
  headerActionButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  historyToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
  },
  historyToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // lg: 24px
  },
  errorText: {
    fontSize: 16, // Body: 16px
    color: '#EF4444', // Red-500
    marginBottom: 16, // md: 16px
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12, // Card: 12px
    padding: 16, // md: 16px
    marginBottom: 16, // md: 16px
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12, // md: 12px
    gap: 8, // sm: 8px
  },
  rideTypeBadge: {
    backgroundColor: '#3B82F6', // Blue-500
    paddingVertical: 4, // xs: 4px
    paddingHorizontal: 8, // sm: 8px
    borderRadius: 4, // xs: 4px
  },
  rideTypeText: {
    fontSize: 12, // Small: 12px
    color: '#fff',
    fontWeight: '500', // Medium
  },
  driverBadge: {
    backgroundColor: '#10B981', // Green-500
    paddingVertical: 4, // xs: 4px
    paddingHorizontal: 8, // sm: 8px
    borderRadius: 4, // xs: 4px
  },
  driverBadgeText: {
    fontSize: 12, // Small: 12px
    color: '#fff',
    fontWeight: '500', // Medium
  },
  participantBadge: {
    backgroundColor: '#F59E0B', // Amber-500
    paddingVertical: 4, // xs: 4px
    paddingHorizontal: 8, // sm: 8px
    borderRadius: 4, // xs: 4px
  },
  participantBadgeText: {
    fontSize: 12, // Small: 12px
    color: '#fff',
    fontWeight: '500', // Medium
  },
  rideRoute: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginBottom: 16, // md: 16px
  },
  infoSection: {
    paddingTop: 16, // md: 16px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12, // md: 12px
  },
  infoLabel: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
    fontWeight: '500', // Medium
  },
  infoValue: {
    fontSize: 14, // Body: 14px
    color: '#111827', // Gray-900
    fontWeight: '500', // Medium
  },
  expenseLink: {
    marginTop: 16, // md: 16px
    padding: 12, // md: 12px
    backgroundColor: '#F0FDF4', // Green-50
    borderRadius: 8, // Button: 8px
  },
  expenseLinkText: {
    fontSize: 14, // Body: 14px
    color: '#10B981', // Green-500
    fontWeight: '500', // Medium
  },
  participantsSection: {
    marginTop: 16, // md: 16px
    paddingTop: 16, // md: 16px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  participantsTitle: {
    fontSize: 16, // Body: 16px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginBottom: 12, // md: 12px
  },
  participantItem: {
    paddingVertical: 8, // sm: 8px
  },
  participantName: {
    fontSize: 14, // Body: 14px
    color: '#374151', // Gray-700
  },
  joinButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  historySection: {
    marginTop: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  historyLoading: {
    padding: 16,
    alignItems: 'center',
  },
  historyEmpty: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 16,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyItemDescription: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginRight: 12,
  },
  historyItemTime: {
    fontSize: 12,
    color: '#6B7280',
  },
});

