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
import { createChore, CreateChoreDto } from '../api/choreApi';
import { ParticipantPicker, SelectedParticipant } from '../components/ParticipantPicker';
import { DatePicker } from '../components/DatePicker';

interface CreateChoreScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  groupId?: string;
}

export function CreateChoreScreen({
  onBack,
  onSuccess,
  groupId: initialGroupId,
}: CreateChoreScreenProps) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('10');
  const [selectedParticipant, setSelectedParticipant] = useState<SelectedParticipant | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    try {
      setLoading(true);
      const data: CreateChoreDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        points: parseInt(points, 10) || 10,
        assignedTo: selectedParticipant?.userId || undefined,
        dueDate: dueDate || undefined,
      };

      console.log('[CreateChoreScreen] Creating chore:', {
        title: data.title,
        assignedTo: data.assignedTo,
        selectedParticipant: selectedParticipant ? { userId: selectedParticipant.userId, name: selectedParticipant.name } : null,
      });

      await createChore(token, data);
      
      console.log('[CreateChoreScreen] Chore created successfully');
      Alert.alert('Success', 'Chore created successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create task',
      );
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.title}>New Task</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Take out trash"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Points</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                style={styles.pointsScroll}
                contentContainerStyle={styles.pointsContainer}
                >
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pts) => (
                  <TouchableOpacity
                    key={pts}
                    style={[
                      styles.pointsChip,
                      points === pts.toString() && styles.pointsChipSelected,
                    ]}
                    onPress={() => setPoints(pts.toString())}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pointsChipText,
                        points === pts.toString() && styles.pointsChipTextSelected,
                        ]}
                      >
                      {pts}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              <Text style={styles.helperText}>
                Base points. Unassigned chores get +50% bonus.
                      </Text>
              </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assign To (Optional)</Text>
              <ParticipantPicker
                selectedParticipants={selectedParticipant ? [selectedParticipant] : []}
                onSelectionChange={(participants) => {
                  setSelectedParticipant(participants.length > 0 ? participants[0] : null);
                }}
                allowMultiple={false}
                showGroups={true}
              />
              <Text style={styles.helperText}>
                Leave unassigned for +50% bonus points
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                label="Due Date (Optional)"
                placeholder="Select due date"
                minimumDate={new Date()}
              />
            </View>
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
              <Text style={styles.submitButtonText}>Create Task</Text>
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
  textArea: {
    minHeight: 100,
    paddingTop: 12, // Button: 12px vertical
  },
  helperText: {
    fontSize: 12, // Small: 12px
    color: '#6B7280', // Gray-500
    marginTop: 4, // xs: 4px
  },
  pointsScroll: {
    marginTop: 8,
  },
  pointsContainer: {
    paddingRight: 16,
    gap: 8,
  },
  pointsChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minWidth: 60,
    alignItems: 'center',
  },
  pointsChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  pointsChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  pointsChipTextSelected: {
    color: '#FFFFFF',
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

