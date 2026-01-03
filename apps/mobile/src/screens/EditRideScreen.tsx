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
import { useAuth } from '../auth/authContext';
import { updateRide, getRideById, Ride, UpdateRideDto } from '../api/rideApi';
import { getGroups, Group, getGroupById, GroupMember } from '../api/groupApi';

interface EditRideScreenProps {
  rideId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function EditRideScreen({
  rideId,
  onBack,
  onSuccess,
}: EditRideScreenProps) {
  const { token } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [type, setType] = useState<'giveRide' | 'rideshare'>('giveRide');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');
  const [chargePerMile, setChargePerMile] = useState('');
  const [chargePerRide, setChargePerRide] = useState('');
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRide, setLoadingRide] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    if (token) {
      loadRide();
      loadGroups();
    }
  }, [token, rideId]);

  useEffect(() => {
    if (ride && token) {
      const groupId = ride.participants[0]?.user?.id ? undefined : undefined; // We'll need to get group from ride if available
      // For now, load members from any group the user is in
      if (groups.length > 0 && groups[0]?.id) {
        loadMembers(groups[0].id);
      }
    }
  }, [ride, groups, token]);

  async function loadRide() {
    if (!token) return;

    try {
      setLoadingRide(true);
      const rideData = await getRideById(token, rideId);
      setRide(rideData);
      setType(rideData.type);
      setOrigin(rideData.origin);
      setDestination(rideData.destination);
      setDistance(rideData.distance?.toString() || '');
      setChargePerMile(rideData.chargePerMile?.toString() || '');
      setChargePerRide(rideData.chargePerRide?.toString() || '');
      setSelectedPassengerIds(
        rideData.participants
          .filter((p) => !p.isDriver)
          .map((p) => p.userId),
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load ride',
      );
    } finally {
      setLoadingRide(false);
    }
  }

  async function loadGroups() {
    if (!token) return;

    try {
      const groupsData = await getGroups(token);
      setGroups(groupsData);
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }

  async function loadMembers(groupId: string) {
    if (!token) return;

    try {
      setLoadingMembers(true);
      const groupData = await getGroupById(token, groupId);
      setMembers(groupData.members || []);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoadingMembers(false);
    }
  }

  function togglePassenger(userId: string) {
    setSelectedPassengerIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  async function handleSubmit() {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Error', 'Please enter origin and destination');
      return;
    }

    if (!chargePerMile && !chargePerRide) {
      Alert.alert('Error', 'Please enter either charge per mile or charge per ride');
      return;
    }

    if (chargePerMile && !distance) {
      Alert.alert('Error', 'Please enter distance when using charge per mile');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    try {
      setLoading(true);
      const data: UpdateRideDto = {
        type,
        origin: origin.trim(),
        destination: destination.trim(),
        distance: distance ? parseFloat(distance) : undefined,
        chargePerMile: chargePerMile ? parseFloat(chargePerMile) : undefined,
        chargePerRide: chargePerRide ? parseFloat(chargePerRide) : undefined,
        passengerIds: selectedPassengerIds.length > 0 ? selectedPassengerIds : undefined,
      };

      await updateRide(token, rideId, data);
      Alert.alert('Success', 'Ride updated successfully! Expense automatically updated.', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update ride',
      );
    } finally {
      setLoading(false);
    }
  }

  function getUserDisplayName(member: GroupMember): string {
    return member?.user?.profile?.displayName || member?.user?.email || 'Unknown';
  }

  if (loadingRide) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading ride...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
            <Text style={styles.title}>Edit Ride</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ride Type *</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'giveRide' && styles.typeButtonSelected,
                  ]}
                  onPress={() => setType('giveRide')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === 'giveRide' && styles.typeButtonTextSelected,
                    ]}
                  >
                    Give Ride
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'rideshare' && styles.typeButtonSelected,
                  ]}
                  onPress={() => setType('rideshare')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === 'rideshare' && styles.typeButtonTextSelected,
                    ]}
                  >
                    Rideshare
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                {type === 'giveRide'
                  ? 'Driver charges passengers'
                  : 'Cost is split among all participants'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Origin *</Text>
              <TextInput
                style={styles.input}
                value={origin}
                onChangeText={setOrigin}
                placeholder="e.g., 123 Main St"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Destination *</Text>
              <TextInput
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g., 456 Oak Ave"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Distance (miles)</Text>
              <TextInput
                style={styles.input}
                value={distance}
                onChangeText={setDistance}
                placeholder="e.g., 10.5"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
              <Text style={styles.helperText}>
                Required if using charge per mile
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Charge Per Mile ($)</Text>
              <TextInput
                style={styles.input}
                value={chargePerMile}
                onChangeText={setChargePerMile}
                placeholder="e.g., 0.50"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Charge Per Ride ($)</Text>
              <TextInput
                style={styles.input}
                value={chargePerRide}
                onChangeText={setChargePerRide}
                placeholder="e.g., 10.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
              <Text style={styles.helperText}>
                Use either charge per mile or charge per ride
              </Text>
            </View>

            {groups.length > 0 && members.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Passengers</Text>
                <Text style={styles.helperText}>
                  Select passengers to update the ride
                </Text>
                <View style={styles.passengerList}>
                  {members.map((member) => (
                    <TouchableOpacity
                      key={member?.user?.id}
                      style={[
                        styles.passengerChip,
                        selectedPassengerIds.includes(member?.user?.id || '') &&
                          styles.passengerChipSelected,
                      ]}
                      onPress={() => togglePassenger(member?.user?.id || '')}
                    >
                      <Text
                        style={[
                          styles.passengerChipText,
                          selectedPassengerIds.includes(member?.user?.id || '') &&
                            styles.passengerChipTextSelected,
                        ]}
                      >
                        {getUserDisplayName(member)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Update Ride</Text>
            )}
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 60,
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
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 44,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  passengerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  passengerChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passengerChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  passengerChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  passengerChipTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

