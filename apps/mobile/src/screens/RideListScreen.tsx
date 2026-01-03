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
import { getRides, Ride } from '../api/rideApi';

interface RideListScreenProps {
  onCreateRide: () => void;
  onViewRide: (rideId: string) => void;
  onBack: () => void;
  groupId?: string;
}

export function RideListScreen({
  onCreateRide,
  onViewRide,
  onBack,
  groupId,
}: RideListScreenProps) {
  const { token, user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRides();
  }, [token, groupId]);

  async function loadRides() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const ridesData = await getRides(token, groupId);
      setRides(ridesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getUserDisplayName(user: Ride['driver']): string {
    return user.profile?.displayName || user.email;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getTypeLabel(type: Ride['type']): string {
    return type === 'giveRide' ? 'Give Ride' : 'Rideshare';
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading rides...</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={loadRides} />
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
              onPress={onCreateRide}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonText}>+ New Ride</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadRides}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {rides.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No rides yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first ride to get started!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateRide}
              >
                <Text style={styles.emptyButtonText}>Create Ride</Text>
              </TouchableOpacity>
            </View>
          )}

          {rides.map((ride) => {
            const isDriver = ride.driverId === user?.id;
            const isParticipant = ride.participants.some((p) => p.userId === user?.id);
            const participantCount = ride.participants.length;

            return (
              <TouchableOpacity
                key={ride.id}
                style={styles.rideCard}
                onPress={() => onViewRide(ride.id)}
                activeOpacity={0.7}
              >
                <View style={styles.rideHeader}>
                  <View style={styles.rideTypeBadge}>
                    <Text style={styles.rideTypeText}>{getTypeLabel(ride.type)}</Text>
                  </View>
                  {isDriver && (
                    <View style={styles.driverBadge}>
                      <Text style={styles.driverBadgeText}>Driver</Text>
                    </View>
                  )}
                  {isParticipant && !isDriver && (
                    <View style={styles.participantBadge}>
                      <Text style={styles.participantBadgeText}>Joined</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.rideRoute}>
                  {ride.origin} → {ride.destination}
                </Text>

                <View style={styles.rideInfo}>
                  <Text style={styles.rideDate}>{formatDate(ride.date)}</Text>
                  <Text style={styles.rideCost}>${ride.totalCost.toFixed(2)}</Text>
                </View>

                <View style={styles.rideFooter}>
                  <Text style={styles.rideDriver}>
                    Driver: {getUserDisplayName(ride.driver)}
                  </Text>
                  <Text style={styles.rideParticipants}>
                    {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
  emptyContainer: {
    alignItems: 'center',
    padding: 32, // xl: 32px
    marginTop: 24, // lg: 24px
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
    fontSize: 18, // H4: 18px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
    marginBottom: 8, // sm: 8px
  },
  rideInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // md: 12px
  },
  rideDate: {
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
  },
  rideCost: {
    fontSize: 18, // H4: 18px
    fontWeight: '600', // Semi-bold
    color: '#2563EB', // Primary Blue
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12, // md: 12px
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Gray-200
  },
  rideDriver: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
  },
  rideParticipants: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
  },
});

