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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { createSettlement, CreateSettlementDto, getBalances, BalanceInfo } from '../api/expenseApi';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';

interface SettleUpScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  payeeId: string; // This is actually the friend's ID - we'll determine direction from balance
  amount: number;
  payeeName: string; // Friend's name
  groupId?: string; // Optional: group ID for group-specific settlements
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'money' },
  { id: 'venmo', label: 'Venmo', icon: 'account-balance-wallet' },
  { id: 'paypal', label: 'PayPal', icon: 'payments' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'account-balance' },
  { id: 'zelle', label: 'Zelle', icon: 'send' },
  { id: 'other', label: 'Other', icon: 'more-horiz' },
];

export function SettleUpScreen({ 
  onBack, 
  onSuccess, 
  payeeId, 
  amount, 
  payeeName,
  groupId,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: SettleUpScreenProps) {
  const { token, user } = useAuth();
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
    if (!token || !user) return;

    try {
      setLoading(true);
      const balancesData = await getBalances(token);
      setBalances(balancesData);
      
      // payeeId is the friend's ID - find their balance to determine direction
      // Find what friend owes user and what user owes friend
      const owedTo = balancesData.owedToUser.find(item => item?.user?.id === payeeId); // Friend owes user
      const owedBy = balancesData.owedByUser.find(item => item?.user?.id === payeeId); // User owes friend
      
      // Calculate net balance: positive = friend owes user, negative = user owes friend
      const netBalance = (owedTo?.amount || 0) - (owedBy?.amount || 0);
      const settleAmount = Math.abs(netBalance);
      
      console.log('[SettleUpScreen] Balance calculation:', {
        friendId: payeeId,
        friendName: payeeName,
        owedTo: owedTo?.amount || 0, // Friend owes user
        owedBy: owedBy?.amount || 0, // User owes friend
        netBalance,
        settleAmount,
        passedAmount: amount,
      });
      
      // Use the net balance amount, or fall back to the passed amount if net balance is 0
      // Round to 2 decimal places
      const roundedAmount = settleAmount > 0 
        ? Math.round(settleAmount * 100) / 100 
        : Math.round(Math.abs(amount) * 100) / 100;
      setSettlementAmount(roundedAmount.toFixed(2));
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

      // Determine the actual payer and payee based on balance direction
      // payeeId prop is the friend's ID - determine who pays and who receives
      const owedTo = balances?.owedToUser.find(item => item?.user?.id === payeeId); // Friend owes user
      const owedBy = balances?.owedByUser.find(item => item?.user?.id === payeeId); // User owes friend
      const netBalance = (owedTo?.amount || 0) - (owedBy?.amount || 0);
      const isUserReceiving = netBalance > 0;
      
      // If user is receiving: payer = friend, payee = user
      // If user is paying: payer = user, payee = friend
      const actualPayerId = isUserReceiving ? payeeId : (user?.id || '');
      const actualPayeeId = isUserReceiving ? (user?.id || '') : payeeId;
      
      const settlementData: CreateSettlementDto = {
        payeeId: actualPayeeId, // The person receiving payment (the one who is owed)
        payerId: actualPayerId, // The person paying (the one who owes)
        amount: amountNum,
        currency: 'USD',
        paymentMethod,
        notes: notes.trim() || undefined,
        groupId: groupId, // Optional: filter to only group-related splits
      };

      console.log('[SettleUpScreen] Creating settlement:', {
        friendId: payeeId,
        actualPayeeId,
        isUserReceiving,
        amount: amountNum,
        netBalance,
      });

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
    // Round to 2 decimal places before formatting
    const roundedAmount = Math.round(amount * 100) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundedAmount);
  }

  // Determine if user is paying or receiving based on actual balance data
  // payeeId is the friend's ID - check balance to determine direction
  const owedTo = balances?.owedToUser.find(item => item?.user?.id === payeeId); // Friend owes user
  const owedBy = balances?.owedByUser.find(item => item?.user?.id === payeeId); // User owes friend
  const netBalance = (owedTo?.amount || 0) - (owedBy?.amount || 0);
  
  // If netBalance > 0: friend owes user (user receives payment)
  // If netBalance < 0: user owes friend (user pays, friend receives)
  const isReceiving = netBalance > 0;
  const isPaying = netBalance < 0;
  
  // Determine the actual payee (person receiving payment)
  // If user is receiving: payeeId = user.id
  // If user is paying: payeeId = friend.id (already passed as payeeId)
  const actualPayeeId = isReceiving ? (user?.id || '') : payeeId;
  
  console.log('[SettleUpScreen] Direction check:', {
    friendId: payeeId,
    friendName: payeeName,
    owedTo: owedTo?.amount || 0,
    owedBy: owedBy?.amount || 0,
    netBalance,
    isReceiving,
    isPaying,
    actualPayeeId,
  });

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
      <Header
        title="Settle Up"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Hero Amount Input - Matching CreateExpenseScreen */}
          <View style={styles.heroSection}>
            <View style={styles.amountContainer}>
              <Text style={[
                styles.currencySymbolLarge,
                isReceiving ? styles.currencySymbolReceiving : styles.currencySymbolPaying
              ]}>$</Text>
              <TextInput
                style={[
                  styles.amountInput,
                  isReceiving ? styles.amountInputReceiving : styles.amountInputPaying
                ]}
                placeholder="0.00"
                value={settlementAmount}
                onChangeText={setSettlementAmount}
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
              />
            </View>
            <Text style={styles.helperText}>
              {isReceiving ? 'You are receiving' : 'You are paying'} {isReceiving ? 'from' : 'to'}{' '}
              <Text style={styles.helperTextHighlight}>{payeeName}</Text>
            </Text>
            <Text style={styles.helperSubText}>
              Enter the amount you {isReceiving ? 'received' : 'paid'}
            </Text>
          </View>

          {/* Payment Method Selection - Horizontal Scroll */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.paymentMethodsScroll}
              contentContainerStyle={styles.paymentMethodsContainer}
            >
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === method.id && styles.paymentMethodButtonSelected,
                  ]}
                  onPress={() => setPaymentMethod(method.id)}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={method.icon as any}
                    size={18}
                    color={paymentMethod === method.id ? '#FFFFFF' : '#6B7280'}
                  />
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
            </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 40,
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
  inputGroup: {
    marginBottom: 24,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroSection: {
    marginBottom: 32,
    alignItems: 'center',
    paddingTop: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  currencySymbolLarge: {
    fontSize: 56,
    fontWeight: '700',
    marginRight: 4,
    padding: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  currencySymbolReceiving: {
    color: '#10B981', // Green
  },
  currencySymbolPaying: {
    color: '#F97316', // Orange
  },
  amountInput: {
    fontSize: 56,
    fontWeight: '700',
    padding: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    margin: 0,
    textAlign: 'left',
    minWidth: 150,
    includeFontPadding: false,
  },
  amountInputReceiving: {
    color: '#10B981', // Green
  },
  amountInputPaying: {
    color: '#F97316', // Orange
  },
  helperText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginTop: 0,
    marginBottom: 4,
    textAlign: 'center',
  },
  helperTextHighlight: {
    fontWeight: '700',
    color: '#6366F1', // Indigo for highlighted name
  },
  helperSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 0,
    textAlign: 'center',
  },
  paymentMethodsScroll: {
    marginHorizontal: -16,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    minWidth: 120,
  },
  paymentMethodButtonSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    includeFontPadding: false,
  },
  paymentMethodTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 52,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  cancelButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
});

