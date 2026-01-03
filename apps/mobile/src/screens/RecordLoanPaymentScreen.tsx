import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { addLoanPayment, getLoanById, Loan } from '../api/financeApi';
import { DatePicker } from '../components/DatePicker';

interface RecordLoanPaymentScreenProps {
  loanId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function RecordLoanPaymentScreen({
  loanId,
  onBack,
  onSuccess,
}: RecordLoanPaymentScreenProps) {
  const { token } = useAuth();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [amount, setAmount] = useState('');
  const [principalPaid, setPrincipalPaid] = useState('');
  const [interestPaid, setInterestPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLoan();
  }, [token, loanId]);

  async function loadLoan() {
    if (!token) return;

    try {
      setLoading(true);
      const data = await getLoanById(token, loanId);
      setLoan(data);

      // Pre-fill fields based on EMI and remaining amount
      const today = new Date();
      setPaymentDate(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
          today.getDate(),
        ).padStart(2, '0')}`,
      );

      if (data.emi && data.remainingAmount > 0) {
        const monthlyRate = data.interestRate > 0 ? data.interestRate / 12 / 100 : 0;
        const estimatedInterest = data.remainingAmount * monthlyRate;
        const estimatedPrincipal = Math.max(0, data.emi - estimatedInterest);
        setAmount(data.emi.toFixed(2));
        setPrincipalPaid(estimatedPrincipal.toFixed(2));
        setInterestPaid(estimatedInterest.toFixed(2));
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load loan for payment',
      );
      onBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!token || !loan) return;

    const amountNum = parseFloat(amount);
    const principalNum = parseFloat(principalPaid);
    const interestNum = parseFloat(interestPaid);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    if (isNaN(principalNum) || principalNum < 0) {
      Alert.alert('Error', 'Please enter a valid principal amount');
      return;
    }

    if (isNaN(interestNum) || interestNum < 0) {
      Alert.alert('Error', 'Please enter a valid interest amount');
      return;
    }

    if (!paymentDate) {
      Alert.alert('Error', 'Please select a payment date');
      return;
    }

    try {
      setSaving(true);
      await addLoanPayment(token, loan.id, {
        amount: amountNum,
        principalPaid: principalNum,
        interestPaid: interestNum,
        paymentDate,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Payment recorded successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to record payment',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !loan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading loan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remainingAfterPayment =
    loan && !isNaN(parseFloat(principalPaid))
      ? Math.max(0, loan.remainingAmount - parseFloat(principalPaid))
      : loan.remainingAmount;

  const remainingMonthsAfterPayment =
    loan && loan.remainingMonths > 0 && remainingAfterPayment > 0
      ? Math.max(0, loan.remainingMonths - 1)
      : 0;

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
            <Text style={styles.title}>Record Payment</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{loan.name}</Text>
            <Text style={styles.summarySubtitle}>{loan.lender}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Amount *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Principal Portion *</Text>
                <TextInput
                  style={styles.input}
                  value={principalPaid}
                  onChangeText={setPrincipalPaid}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Interest Portion *</Text>
                <TextInput
                  style={styles.input}
                  value={interestPaid}
                  onChangeText={setInterestPaid}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={paymentDate}
                onChange={setPaymentDate}
                label="Payment Date *"
                placeholder="Select payment date"
                minimumDate={new Date(loan.startDate)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this payment"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Preview</Text>
              <Text style={styles.previewText}>
                Remaining amount after this payment:{' '}
                <Text style={styles.previewValue}>
                  {remainingAfterPayment.toFixed(2)}
                </Text>
              </Text>
              <Text style={styles.previewText}>
                Remaining months after this payment:{' '}
                <Text style={styles.previewValue}>{remainingMonthsAfterPayment}</Text>
              </Text>
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
                  <Text style={styles.saveButtonText}>Save Payment</Text>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  summary: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  summarySubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  previewCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  previewText: {
    fontSize: 13,
    color: '#1D4ED8',
  },
  previewValue: {
    fontWeight: '700',
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


