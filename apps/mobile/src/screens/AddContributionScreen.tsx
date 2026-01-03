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
import { addContribution, getGoalById, FinancialGoal } from '../api/financeApi';
import { MaterialIcons } from '@expo/vector-icons';
import { DatePicker } from '../components/DatePicker';
import { getProfile, Profile } from '../api/profileApi';
import { getCurrencySymbol } from '../utils/currency';

interface AddContributionScreenProps {
  goalId?: string; // Optional - if provided, pre-fills the goal
  suggestedAmount?: number; // Optional - suggested amount from advisor
  context?: 'local' | 'home'; // Optional - will be derived from goal if not provided
  onBack: () => void;
  onSuccess: () => void;
}

export function AddContributionScreen({
  goalId,
  suggestedAmount,
  context,
  onBack,
  onSuccess,
}: AddContributionScreenProps) {
  const { token } = useAuth();
  const [goal, setGoal] = useState<FinancialGoal | null>(null);
  const [amount, setAmount] = useState(suggestedAmount ? suggestedAmount.toString() : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (goalId && token) {
      loadGoal();
    }
    loadProfile();
  }, [token, goalId]);

  async function loadProfile() {
    if (!token) return;
    try {
      const profileData = await getProfile(token);
      setProfile(profileData);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }

  async function loadGoal() {
    if (!token || !goalId) return;

    try {
      setLoading(true);
      const goalData = await getGoalById(token, goalId);
      setGoal(goalData);
      // If no suggested amount, suggest remaining amount needed
      if (!suggestedAmount && goalData.targetAmount > goalData.currentAmount) {
        const remaining = goalData.targetAmount - goalData.currentAmount;
        setAmount(remaining.toString());
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load goal');
    } finally {
      setLoading(false);
    }
  }

  function getCurrentCurrency(): string {
    if (!profile) return 'USD';
    // Use context from prop, or derive from goal, or default to 'local'
    const currentContext = context || goal?.context || 'local';
    return currentContext === 'local' ? profile.primaryCurrency || 'USD' : profile.homeCountryCurrency || 'USD';
  }

  function formatCurrency(amount: number): string {
    const currency = getCurrentCurrency();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  async function handleSubmit() {
    if (!token) return;

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!goalId) {
      Alert.alert('Error', 'Please select a goal');
      return;
    }

    try {
      setSaving(true);
      await addContribution(token, goalId, {
        amount: amountNum,
        date: date,
        notes: notes || undefined,
      });
      Alert.alert('Success', 'Contribution added successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add contribution');
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Contribution</Text>
          <View style={styles.headerSpacer} />
        </View>

        {goal && (
          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>{goal.name}</Text>
            <View style={styles.goalProgress}>
              <Text style={styles.goalProgressText}>
                {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
              </Text>
              <Text style={styles.goalProgressPercent}>
                {((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)}%
              </Text>
            </View>
            {goal.targetAmount > goal.currentAmount && (
              <Text style={styles.goalRemaining}>
                {formatCurrency(goal.targetAmount - goal.currentAmount)} remaining
              </Text>
            )}
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount {getCurrencySymbol(getCurrentCurrency())}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              autoFocus
            />
            {suggestedAmount && (
              <TouchableOpacity
                onPress={() => setAmount(suggestedAmount.toString())}
                style={styles.suggestedButton}
              >
                <Text style={styles.suggestedButtonText}>
                  Use suggested: {formatCurrency(suggestedAmount)}
                </Text>
              </TouchableOpacity>
            )}
            {goal && goal.targetAmount > goal.currentAmount && (
              <TouchableOpacity
                onPress={() => setAmount((goal.targetAmount - goal.currentAmount).toString())}
                style={styles.suggestedButton}
              >
                <Text style={styles.suggestedButtonText}>
                  Add remaining: {formatCurrency(goal.targetAmount - goal.currentAmount)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <DatePicker
              value={date}
              onChange={setDate}
              maximumDate={new Date().toISOString().split('T')[0]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note about this contribution"
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving || !goalId}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Contribution</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  goalInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  goalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  goalProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalProgressText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  goalProgressPercent: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  goalRemaining: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  suggestedButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  suggestedButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

