import React, { useEffect, useState } from 'react';
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
import {
  getGoalById,
  updateGoal,
  UpdateGoalDto,
  FinancialGoal,
} from '../api/financeApi';
import { MaterialIcons } from '@expo/vector-icons';
import { DatePicker } from '../components/DatePicker';
import { Icon } from '../components/Icon';

interface EditGoalScreenProps {
  goalId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function EditGoalScreen({
  goalId,
  onBack,
  onSuccess,
}: EditGoalScreenProps) {
  const { token } = useAuth();
  const [goal, setGoal] = useState<FinancialGoal | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState<'savings' | 'debt' | 'purchase' | 'investment'>('savings');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'active' | 'completed' | 'paused' | 'cancelled'>('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const categories: Array<{ value: 'savings' | 'debt' | 'purchase' | 'investment'; label: string }> = [
    { value: 'savings', label: 'Savings' },
    { value: 'debt', label: 'Debt' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'investment', label: 'Investment' },
  ];

  const priorities: Array<{ value: 'low' | 'medium' | 'high'; label: string }> = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const statuses: Array<{ value: 'active' | 'completed' | 'paused' | 'cancelled'; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    loadGoal();
  }, [token, goalId]);

  async function loadGoal() {
    if (!token) return;

    try {
      setLoading(true);
      const goalData = await getGoalById(token, goalId);
      setGoal(goalData);
      
      // Populate form fields
      setName(goalData.name);
      setTargetAmount(goalData.targetAmount.toString());
      setCurrentAmount(goalData.currentAmount.toString());
      setTargetDate(goalData.targetDate ? goalData.targetDate.split('T')[0] : '');
      setCategory(goalData.category);
      setPriority(goalData.priority);
      setStatus(goalData.status);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load goal');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!token) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }

    const targetAmountNum = parseFloat(targetAmount);
    if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    const currentAmountNum = parseFloat(currentAmount);
    if (isNaN(currentAmountNum) || currentAmountNum < 0) {
      Alert.alert('Error', 'Please enter a valid current amount');
      return;
    }

    try {
      setSaving(true);

      const goalData: UpdateGoalDto = {
        name: name.trim(),
        targetAmount: targetAmountNum,
        currentAmount: currentAmountNum,
        targetDate: targetDate || undefined,
        category,
        priority,
        status,
      };

      await updateGoal(token, goalId, goalData);
      Alert.alert('Success', 'Goal updated successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update goal',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading goal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Goal not found</Text>
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
            <Text style={styles.title}>Edit Goal</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Goal Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Emergency Fund"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Target Amount *</Text>
              <TextInput
                style={styles.input}
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Amount</Text>
              <TextInput
                style={styles.input}
                value={currentAmount}
                onChangeText={setCurrentAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      category === cat.value && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategory(cat.value)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={cat.label}
                      size={20}
                      color={category === cat.value ? '#fff' : '#374151'}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat.value && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.priorityScroll}
                contentContainerStyle={styles.priorityContainer}
              >
                {priorities.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.priorityChip,
                      priority === p.value && styles.priorityChipSelected,
                    ]}
                    onPress={() => setPriority(p.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        priority === p.value && styles.priorityChipTextSelected,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Status *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.statusScroll}
                contentContainerStyle={styles.statusContainer}
              >
                {statuses.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.statusChip,
                      status === s.value && styles.statusChipSelected,
                    ]}
                    onPress={() => setStatus(s.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        status === s.value && styles.statusChipTextSelected,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={targetDate}
                onChange={setTargetDate}
                label="Target Date (Optional)"
                placeholder="Select target date"
                minimumDate={new Date()}
              />
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
                <>
                  <MaterialIcons name="check" size={24} color="#fff" />
                  <Text style={styles.saveButtonText}>Update Goal</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
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
    minHeight: 48,
  },
  categoryScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  categoryContainer: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  priorityScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  priorityContainer: {
    gap: 8,
  },
  priorityChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  priorityChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  priorityChipTextSelected: {
    color: '#fff',
  },
  statusScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  statusContainer: {
    gap: 8,
  },
  statusChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statusChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusChipTextSelected: {
    color: '#fff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
    minHeight: 56,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

