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
import { createRide, CreateRideDto } from '../api/rideApi';
import { getGroups, Group, getGroupById, GroupMember } from '../api/groupApi';

interface CreateRideScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  groupId?: string;
}

export function CreateRideScreen({
  onBack,
  onSuccess,
  groupId: initialGroupId,
}: CreateRideScreenProps) {
  const { token } = useAuth();
  const [type, setType] = useState<'giveRide' | 'rideshare'>('giveRide');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');
  const [chargePerMile, setChargePerMile] = useState('');
  const [chargePerRide, setChargePerRide] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(initialGroupId);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    if (token) {
      loadGroups();
    }
  }, [token]);

  useEffect(() => {
    if (selectedGroupId && token) {
      loadMembers(selectedGroupId);
    } else {
      setMembers([]);
    }
  }, [selectedGroupId, token]);

  async function loadGroups() {
    if (!token) return;

    try {
      setLoadingGroups(true);
      const groupsData = await getGroups(token);
      setGroups(groupsData);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoadingGroups(false);
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
      const data: CreateRideDto = {
        type,
        origin: origin.trim(),
        destination: destination.trim(),
        distance: distance ? parseFloat(distance) : undefined,
        chargePerMile: chargePerMile ? parseFloat(chargePerMile) : undefined,
        chargePerRide: chargePerRide ? parseFloat(chargePerRide) : undefined,
        groupId: selectedGroupId || undefined,
        passengerIds: selectedPassengerIds.length > 0 ? selectedPassengerIds : undefined,
      };

      await createRide(token, data);
      Alert.alert('Success', 'Ride created successfully! Expense automatically added.', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create ride',
      );
    } finally {
      setLoading(false);
    }
  }

  function getUserDisplayName(member: GroupMember): string {
    return member.user.profile?.displayName || member.user.email;
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
            <Text style={styles.title}>Create Ride</Text>
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

            {groups.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Group (Optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.groupScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.groupChip,
                      !selectedGroupId && styles.groupChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedGroupId(undefined);
                      setSelectedPassengerIds([]);
                    }}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        !selectedGroupId && styles.groupChipTextSelected,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {groups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.groupChip,
                        selectedGroupId === group.id && styles.groupChipSelected,
                      ]}
                      onPress={() => {
                        setSelectedGroupId(group.id);
                        setSelectedPassengerIds([]);
                      }}
                    >
                      <Text
                        style={[
                          styles.groupChipText,
                          selectedGroupId === group.id && styles.groupChipTextSelected,
                        ]}
                      >
                        {group.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {selectedGroupId && members.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Passengers (Optional)</Text>
                <Text style={styles.helperText}>
                  Select passengers to add now, or add them later
                </Text>
                <View style={styles.passengerList}>
                  {members.map((member) => (
                    <TouchableOpacity
                      key={member.user.id}
                      style={[
                        styles.passengerChip,
                        selectedPassengerIds.includes(member.user.id) &&
                          styles.passengerChipSelected,
                      ]}
                      onPress={() => togglePassenger(member.user.id)}
                    >
                      <Text
                        style={[
                          styles.passengerChipText,
                          selectedPassengerIds.includes(member.user.id) &&
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
              <Text style={styles.submitButtonText}>Create Ride</Text>
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
    marginBottom: 24, // lg: 24px
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
  title: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
  },
  placeholder: {
    width: 60, // Balance header
  },
  form: {
    marginBottom: 24, // lg: 24px
  },
  inputGroup: {
    marginBottom: 20, // md: 20px
  },
  label: {
    fontSize: 14, // Body: 14px
    fontWeight: '500', // Medium
    color: '#374151', // Gray-700
    marginBottom: 8, // sm: 8px
  },
  input: {
    backgroundColor: '#F9FAFB', // Gray-50
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 16, // md: 16px
    fontSize: 16, // Body: 16px
    color: '#111827', // Gray-900
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
    minHeight: 44, // Touch target
  },
  helperText: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
    marginTop: 4, // xs: 4px
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12, // md: 12px
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Gray-100
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 16, // md: 16px
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  typeButtonSelected: {
    backgroundColor: '#2563EB', // Primary Blue
    borderColor: '#2563EB', // Primary Blue
  },
  typeButtonText: {
    fontSize: 16, // Body: 16px
    color: '#374151', // Gray-700
    fontWeight: '500', // Medium
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  groupScroll: {
    marginTop: 8, // sm: 8px
  },
  groupChip: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 16, // md: 16px
    borderRadius: 8, // Button: 8px
    backgroundColor: '#F3F4F6', // Gray-100
    marginRight: 8, // sm: 8px
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  groupChipSelected: {
    backgroundColor: '#2563EB', // Primary Blue
    borderColor: '#2563EB', // Primary Blue
  },
  groupChipText: {
    fontSize: 14, // Body: 14px
    color: '#374151', // Gray-700
    fontWeight: '500', // Medium
  },
  groupChipTextSelected: {
    color: '#fff',
  },
  passengerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // sm: 8px
    marginTop: 8, // sm: 8px
  },
  passengerChip: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 16, // md: 16px
    borderRadius: 8, // Button: 8px
    backgroundColor: '#F3F4F6', // Gray-100
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200
  },
  passengerChipSelected: {
    backgroundColor: '#2563EB', // Primary Blue
    borderColor: '#2563EB', // Primary Blue
  },
  passengerChipText: {
    fontSize: 14, // Body: 14px
    color: '#374151', // Gray-700
    fontWeight: '500', // Medium
  },
  passengerChipTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24, // lg: 24px
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
});

