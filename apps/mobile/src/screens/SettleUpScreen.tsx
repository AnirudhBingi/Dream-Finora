import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/authContext';
import { createSettlement, CreateSettlementDto, getBalances, BalanceInfo } from '../api/expenseApi';

interface SettleUpScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  payeeId: string;
  amount: number;
  payeeName: string;
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'venmo', label: 'Venmo' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'other', label: 'Other' },
];

export function SettleUpScreen({ onBack, onSuccess, payeeId, amount, payeeName }: SettleUpScreenProps) {
  const { token } = useAuth();
  const [settlementAmount, setSettlementAmount] = useState(amount.toString());
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalances();
  }, [token]);

  async function loadBalances() {
    if (!token) return;

    try {
      setLoading(true);
      const balancesData = await getBalances(token);
      setBalances(balancesData);
      
      // Find the actual amount owed to/from this person
      const owedTo = balancesData.owedToUser.find(item => item.user.id === payeeId);
      const owedBy = balancesData.owedByUser.find(item => item.user.id === payeeId);
      
      if (owedTo) {
        setSettlementAmount(owedTo.amount.toString());
      } else if (owedBy) {
        setSettlementAmount(owedBy.amount.toString());
      }
    } catch (err) {
      console.error('Failed to load balances:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!token) return;

    const amountNum = parseFloat(settlementAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setSubmitting(true);

      const settlementData: CreateSettlementDto = {
        payeeId,
        amount: amountNum,
        currency: 'USD',
        paymentMethod,
        notes: notes.trim() || undefined,
      };

      await createSettlement(token, settlementData);

      Alert.alert('Success', 'Settlement recorded successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create settlement');
    } finally {
      setSubmitting(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Determine if user is paying or receiving
  const owedTo = balances?.owedToUser.find(item => item.user.id === payeeId);
  const owedBy = balances?.owedByUser.find(item => item.user.id === payeeId);
  const isReceiving = !!owedTo;
  const isPaying = !!owedBy;

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
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settle Up</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              {isReceiving ? 'You are receiving' : 'You are paying'}
            </Text>
            <Text style={[styles.summaryAmount, isReceiving ? styles.summaryPositive : styles.summaryNegative]}>
              {formatCurrency(parseFloat(settlementAmount) || 0)}
            </Text>
            <Text style={styles.summaryPerson}>
              {isReceiving ? 'from' : 'to'} {payeeName}
            </Text>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Settlement Amount</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={settlementAmount}
                onChangeText={setSettlementAmount}
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={styles.helperText}>
              Enter the amount you {isReceiving ? 'received' : 'paid'}
            </Text>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.paymentMethodsContainer}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === method.id && styles.paymentMethodButtonSelected,
                  ]}
                  onPress={() => setPaymentMethod(method.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === method.id && styles.paymentMethodTextSelected,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any notes about this settlement..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isReceiving ? 'Mark as Received' : 'Mark as Paid'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
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
    marginTop: 16,
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
  headerTitle: {
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
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryPositive: {
    color: '#10B981',
  },
  summaryNegative: {
    color: '#EF4444',
  },
  summaryPerson: {
    fontSize: 16,
    color: '#374151',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  paymentMethodButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  paymentMethodTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  cancelButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
});

