import React, { useEffect, useState } from 'react';
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
import {
  updateAccount,
  deleteAccount,
  getAccountById,
  FinanceAccount,
  UpdateAccountDto,
} from '../api/financeApi';
import { MaterialIcons } from '@expo/vector-icons';
import { CurrencyPicker, SUPPORTED_CURRENCIES } from '../components/CurrencyPicker';
import { Header } from '../components/Header';

interface EditAccountScreenProps {
  accountId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditAccountScreen({
  accountId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditAccountScreenProps) {
  const { token } = useAuth();
  const [account, setAccount] = useState<FinanceAccount | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [originalCurrency, setOriginalCurrency] = useState('USD');
  const [context, setContext] = useState<'local' | 'home'>('local');
  const [accountType, setAccountType] = useState('checking');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCurrencyWarning, setShowCurrencyWarning] = useState(false);

  const accountTypes = ['checking', 'savings', 'cash', 'investment', 'other'];

  useEffect(() => {
    loadAccount();
  }, [accountId, token]);

  async function loadAccount() {
    if (!token || !accountId) return;

    try {
      setLoading(true);
      const accountData = await getAccountById(token, accountId);
      setAccount(accountData);
      setName(accountData.name);
      setCurrency(accountData.currency || 'USD');
      setOriginalCurrency(accountData.currency || 'USD');
      setContext(accountData.context || 'local');
      setAccountType(accountData.accountType || 'checking');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load account');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Show warning if currency is different from original
    if (currency !== originalCurrency && account && account.balance !== 0) {
      setShowCurrencyWarning(true);
    } else {
      setShowCurrencyWarning(false);
    }
  }, [currency, originalCurrency, account]);

  async function handleSave() {
    if (!token || !account) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    // Warn about currency conversion if currency changed and balance is not zero
    if (currency !== originalCurrency && account.balance !== 0) {
      Alert.alert(
        'Currency Change',
        `Changing currency from ${originalCurrency} to ${currency} will convert your balance of ${formatCurrency(account.balance, originalCurrency)} to the new currency using current exchange rates. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              await performUpdate();
            },
          },
        ],
      );
    } else {
      await performUpdate();
    }
  }

  async function performUpdate() {
    if (!token || !account) return;

    try {
      setSaving(true);

      const updateData: UpdateAccountDto = {
        name: name.trim(),
        currency: currency,
        context: context,
        accountType: accountType,
      };

      await updateAccount(token, accountId, updateData);

      Alert.alert('Success', 'Account updated successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !account) return;

    // Check if account has transactions
    if (account.transactions && account.transactions.length > 0) {
      Alert.alert(
        'Cannot Delete Account',
        `This account has ${account.transactions.length} transaction(s). Please delete or move transactions before deleting the account.`,
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteAccount(token, accountId);
              Alert.alert('Success', 'Account deleted successfully!', [
                { text: 'OK', onPress: onSuccess },
              ]);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
              Alert.alert('Error', errorMessage);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  function formatCurrency(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Edit Account"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Account not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Edit Account"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          <View style={styles.form}>
            {/* Account Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Main Account, Savings, Cash"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Currency */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Currency</Text>
              <CurrencyPicker
                selectedCurrency={currency}
                onSelectCurrency={setCurrency}
              />
              {showCurrencyWarning && (
                <View style={styles.warningBox}>
                  <MaterialIcons name="warning" size={20} color="#F59E0B" />
                  <Text style={styles.warningText}>
                    Changing currency will convert your balance from {originalCurrency} to {currency} using current exchange rates.
                  </Text>
                </View>
              )}
            </View>

            {/* Context */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Context</Text>
              <View style={styles.contextSelector}>
                <TouchableOpacity
                  style={[
                    styles.contextButton,
                    context === 'local' && styles.contextButtonActive,
                  ]}
                  onPress={() => setContext('local')}
                >
                  <MaterialIcons
                    name="location-on"
                    size={20}
                    color={context === 'local' ? '#fff' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.contextButtonText,
                      context === 'local' && styles.contextButtonTextActive,
                    ]}
                  >
                    Local
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contextButton,
                    context === 'home' && styles.contextButtonActive,
                  ]}
                  onPress={() => setContext('home')}
                >
                  <MaterialIcons
                    name="home"
                    size={20}
                    color={context === 'home' ? '#fff' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.contextButtonText,
                      context === 'home' && styles.contextButtonTextActive,
                    ]}
                  >
                    Home Country
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.accountTypeSelector}>
                  {accountTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.accountTypeButton,
                        accountType === type && styles.accountTypeButtonActive,
                      ]}
                      onPress={() => setAccountType(type)}
                    >
                      <Text
                        style={[
                          styles.accountTypeButtonText,
                          accountType === type && styles.accountTypeButtonTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Current Balance (read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Balance</Text>
              <View style={styles.balanceDisplay}>
                <Text style={styles.balanceAmount}>
                  {formatCurrency(account.balance, currency)}
                </Text>
              </View>
              <Text style={styles.helperText}>
                Balance is calculated from transactions. Editing transactions will update this balance.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="delete-outline" size={20} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                  </>
                )}
              </TouchableOpacity>
              {account.transactions && account.transactions.length > 0 && (
                <Text style={styles.deleteHelperText}>
                  This account has {account.transactions.length} transaction(s). Delete or move them first.
                </Text>
              )}
            </View>
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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  form: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  contextSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  contextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    gap: 8,
  },
  contextButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  contextButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  contextButtonTextActive: {
    color: '#fff',
  },
  accountTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  accountTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  accountTypeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  accountTypeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  accountTypeButtonTextActive: {
    color: '#fff',
  },
  balanceDisplay: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '600',
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
    marginBottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
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
    marginBottom: 24,
  },
  cancelButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
  dangerZone: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteHelperText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
});

