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
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { CreateLoanDto, createLoan } from '../api/financeApi';
import { getProfile, Profile } from '../api/profileApi';
import { DatePicker } from '../components/DatePicker';

interface CreateLoanScreenProps {
  context: 'local' | 'home';
  onBack: () => void;
  onSuccess: () => void;
}

type PaymentFrequency = 'monthly' | 'quarterly' | 'yearly';

export function CreateLoanScreen({
  context,
  onBack,
  onSuccess,
}: CreateLoanScreenProps) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanTerm, setLoanTerm] = useState('');
  const [emi, setEmi] = useState('');
  const [startDate, setStartDate] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfile();
  }, [token]);

  async function loadProfile() {
    if (!token) return;
    try {
      const profileData = await getProfile(token);
      setProfile(profileData);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }

  // Get currency symbol based on context
  function getCurrencySymbol(): string {
    if (!profile) return '$';
    const currency = context === 'local' 
      ? (profile.primaryCurrency || 'USD')
      : (profile.homeCountryCurrency || 'USD');
    
    // Common currency symbols
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'JPY': '¥',
      'CNY': '¥',
      'AUD': 'A$',
      'CAD': 'C$',
      'CHF': 'CHF',
      'SGD': 'S$',
    };
    
    return currencySymbols[currency] || currency;
  }

  // Auto-calculate EMI when principal, interest rate, or term changes
  useEffect(() => {
    const principal = parseFloat(principalAmount);
    const rateAnnual = parseFloat(interestRate);
    const termMonths = parseInt(loanTerm, 10);

    if (
      !isNaN(principal) &&
      principal > 0 &&
      !isNaN(rateAnnual) &&
      rateAnnual >= 0 &&
      !isNaN(termMonths) &&
      termMonths > 0
    ) {
      const monthlyRate = rateAnnual / 12 / 100;
      let emiValue: number;

      if (monthlyRate === 0) {
        emiValue = principal / termMonths;
      } else {
        const factor = Math.pow(1 + monthlyRate, termMonths);
        emiValue = (principal * monthlyRate * factor) / (factor - 1);
      }

      setEmi(emiValue.toFixed(2));
    } else {
      setEmi('');
    }
  }, [principalAmount, interestRate, loanTerm]);

  async function handleSave() {
    if (!token) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a loan name');
      return;
    }

    if (!lender.trim()) {
      Alert.alert('Error', 'Please enter a lender name');
      return;
    }

    const principalNum = parseFloat(principalAmount);
    if (isNaN(principalNum) || principalNum <= 0) {
      Alert.alert('Error', 'Please enter a valid principal amount');
      return;
    }

    const rateNum = parseFloat(interestRate);
    if (isNaN(rateNum) || rateNum < 0) {
      Alert.alert('Error', 'Please enter a valid interest rate');
      return;
    }

    const termNum = parseInt(loanTerm, 10);
    if (isNaN(termNum) || termNum <= 0) {
      Alert.alert('Error', 'Please enter a valid loan term in months');
      return;
    }

    const emiNum = parseFloat(emi);
    if (isNaN(emiNum) || emiNum <= 0) {
      Alert.alert('Error', 'EMI could not be calculated. Please check the inputs.');
      return;
    }

    if (!startDate) {
      Alert.alert('Error', 'Please select a start date');
      return;
    }

    if (!nextPaymentDate) {
      Alert.alert('Error', 'Please select a next payment date');
      return;
    }

    try {
      setSaving(true);

      const loanData: CreateLoanDto = {
        name: name.trim(),
        lender: lender.trim(),
        principalAmount: principalNum,
        remainingAmount: principalNum,
        interestRate: rateNum,
        emi: emiNum,
        loanTerm: termNum,
        remainingMonths: termNum,
        startDate,
        nextPaymentDate,
        paymentFrequency,
        context,
      };

      await createLoan(token, loanData);

      Alert.alert('Success', 'Loan created successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create loan',
      );
    } finally {
      setSaving(false);
    }
  }

  const today = new Date();

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
            <Text style={styles.title}>New Loan</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Loan Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Home Loan, Car Loan"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lender *</Text>
              <TextInput
                style={styles.input}
                value={lender}
                onChangeText={setLender}
                placeholder="e.g., Bank of America"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Principal Amount *</Text>
              <TextInput
                style={styles.input}
                value={principalAmount}
                onChangeText={setPrincipalAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Interest Rate (Annual, %) *</Text>
                <TextInput
                  style={styles.input}
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="e.g., 6.5"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Loan Term (Months) *</Text>
                <TextInput
                  style={styles.input}
                  value={loanTerm}
                  onChangeText={setLoanTerm}
                  placeholder="e.g., 60"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Calculated EMI</Text>
              <View style={styles.readonlyField}>
                <Text style={emi ? styles.readonlyText : styles.placeholderText}>
                  {emi ? `${getCurrencySymbol()}${emi}` : 'Enter principal, rate, and term to calculate'}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                label="Start Date *"
                placeholder="Select start date"
                minimumDate={today}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Frequency *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.frequencyScroll}
                contentContainerStyle={styles.frequencyContainer}
              >
                {(['monthly', 'quarterly', 'yearly'] as PaymentFrequency[]).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyChip,
                      paymentFrequency === freq && styles.frequencyChipSelected,
                    ]}
                    onPress={() => setPaymentFrequency(freq)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.frequencyChipText,
                        paymentFrequency === freq && styles.frequencyChipTextSelected,
                      ]}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={nextPaymentDate}
                onChange={setNextPaymentDate}
                label="Next Payment Date *"
                placeholder="Select next payment date"
                minimumDate={startDate ? new Date(startDate) : today}
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
                  <Text style={styles.saveButtonText}>Create Loan</Text>
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
  form: {
    gap: 20,
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
  readonlyField: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
  },
  readonlyText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  frequencyScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  frequencyContainer: {
    gap: 8,
  },
  frequencyChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  frequencyChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  frequencyChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  frequencyChipTextSelected: {
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


