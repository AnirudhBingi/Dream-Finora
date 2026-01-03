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
import { DatePicker } from '../components/DatePicker';
import { useAuth } from '../auth/authContext';
import { getChoreById, updateChore, Chore, UpdateChoreDto } from '../api/choreApi';
import { getGroupById, GroupMember } from '../api/groupApi';

interface EditChoreScreenProps {
  choreId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function EditChoreScreen({
  choreId,
  onBack,
  onSuccess,
}: EditChoreScreenProps) {
  const { token, user } = useAuth();
  const [chore, setChore] = useState<Chore | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('10');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  useEffect(() => {
    loadChore();
  }, [choreId, token]);

  async function loadChore() {
    if (!token) return;

    try {
      setLoading(true);
      const choreData = await getChoreById(token, choreId);
      setChore(choreData);
      setTitle(choreData.title);
      setDescription(choreData.description || '');
      setPoints(choreData.points.toString());
      setAssignedTo(choreData.assignedTo || '');
      setDueDate(choreData.dueDate ? new Date(choreData.dueDate).toISOString().split('T')[0] : '');

      // Load members if it's a group chore
      if (choreData.groupId) {
        try {
          const groupData = await getGroupById(token, choreData.groupId);
          setMembers(groupData.members || []);
        } catch (err) {
          console.error('Failed to load members:', err);
        }
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load chore',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    if (chore?.status === 'completed') {
      Alert.alert('Error', 'Cannot edit a completed chore');
      return;
    }

    try {
      setSaving(true);
      const data: UpdateChoreDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        points: parseInt(points, 10) || 10,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
      };

      await updateChore(token, choreId, data);
      
      Alert.alert('Success', 'Chore updated successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update chore',
      );
    } finally {
      setSaving(false);
    }
  }

  function getUserDisplayName(member: GroupMember['user']): string {
    return member.profile?.displayName || member.email;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading chore...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!chore) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Chore not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = chore.createdBy === user?.id || (chore.groupId && (members || []).some(m => m.userId === user?.id));

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>You don't have permission to edit this chore</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
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
            <Text style={styles.title}>Edit Task</Text>
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
            </View>

            {chore.groupId && members.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign To</Text>
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => setShowAssignMenu(!showAssignMenu)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.assignButtonText}>
                    {assignedTo
                      ? getUserDisplayName(members.find(m => m.userId === assignedTo)?.user || { email: '', profile: null })
                      : 'Unassigned'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
                </TouchableOpacity>

                {showAssignMenu && (
                  <View style={styles.assignMenu}>
                    <TouchableOpacity
                      style={styles.assignMenuItem}
                      onPress={() => {
                        setAssignedTo('');
                        setShowAssignMenu(false);
                      }}
                    >
                      <Text style={styles.assignMenuItemText}>Unassigned</Text>
                    </TouchableOpacity>
                    {members.map((member) => (
                      <TouchableOpacity
                        key={member?.user?.id}
                        style={styles.assignMenuItem}
                        onPress={() => {
                          setAssignedTo(member?.user?.id || '');
                          setShowAssignMenu(false);
                        }}
                      >
                        <Text style={styles.assignMenuItemText}>
                          {getUserDisplayName(member.user)}
                        </Text>
                        {assignedTo === member?.user?.id && (
                          <MaterialIcons name="check-circle" size={20} color="#2563EB" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                label="Due Date"
                placeholder="Select due date"
                minimumDate={new Date()}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pointsScroll: {
    marginTop: 8,
  },
  pointsContainer: {
    paddingRight: 24,
  },
  pointsChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  pointsChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  pointsChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  pointsChipTextSelected: {
    color: '#fff',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    backgroundColor: '#fff',
  },
  assignButtonText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  assignMenu: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assignMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  assignMenuItemText: {
    fontSize: 16,
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

