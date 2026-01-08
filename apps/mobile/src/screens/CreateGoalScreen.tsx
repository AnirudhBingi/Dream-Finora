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
  createGoal,
  CreateGoalDto,
} from '../api/financeApi';
import { MaterialIcons } from '@expo/vector-icons';
import { DatePicker } from '../components/DatePicker';
import { Icon } from '../components/Icon';

interface CreateGoalScreenProps {
  context: 'local' | 'home';
  prefill?: { name: string; targetAmount: number; category: 'savings' | 'debt' | 'purchase' | 'investment' };
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateGoalScreen({
  context,
  prefill,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreateGoalScreenProps) {
  const { token } = useAuth();
  const [name, setName] = useState(prefill?.name || '');
  const [targetAmount, setTargetAmount] = useState(prefill?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState<'savings' | 'debt' | 'purchase' | 'investment'>(prefill?.category || 'savings');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
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

      const goalData: CreateGoalDto = {
        name: name.trim(),
        targetAmount: targetAmountNum,
        currentAmount: currentAmountNum,
        targetDate: targetDate || undefined,
        category,
        priority,
        context,
      };

      await createGoal(token, goalData);
      Alert.alert('Success', 'Goal created successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create goal',
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
          <Text style={styles.loadingText}>Loading...</Text>
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
              <Text style={styles.helpText}>Starting amount (default: 0)</Text>
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
                  <Text style={styles.saveButtonText}>Create Goal</Text>
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
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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

