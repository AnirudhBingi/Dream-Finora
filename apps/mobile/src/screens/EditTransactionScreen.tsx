import React, { useEffect, useState, useRef } from 'react';
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
  updateTransaction,
  deleteTransaction,
  getTransactionById,
  getCategories,
  suggestCategory,
  Categories,
  UpdateTransactionDto,
  FinanceTransaction,
} from '../api/financeApi';
import { getProfile, Profile } from '../api/profileApi';
import { MaterialIcons } from '@expo/vector-icons';
import { DatePicker } from '../components/DatePicker';
import { Icon } from '../components/Icon';
import { normalizeCategoryName } from '../utils/categoryIcons';
import { Header } from '../components/Header';

interface EditTransactionScreenProps {
  transactionId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditTransactionScreen({
  transactionId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditTransactionScreenProps) {
  const { token } = useAuth();
  const [transaction, setTransaction] = useState<FinanceTransaction | null>(null);
  const [categories, setCategories] = useState<Categories | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [context, setContext] = useState<'local' | 'home'>('local');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  // Income sources (common options)
  const incomeSources = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other Income'];

  // Get currency symbol based on context
  function getCurrencySymbol(): string {
    if (!profile) return '$';
    const currency = context === 'local'
      ? (profile.primaryCurrency || 'USD')
      : (profile.homeCountryCurrency || 'USD');

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

  useEffect(() => {
    loadTransaction();
    loadCategories();
    loadProfile();
  }, [transactionId, token]);

  async function loadProfile() {
    if (!token) return;
    try {
      const profileData = await getProfile(token);
      setProfile(profileData || null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setProfile(null);
    }
  }

  async function loadCategories() {
    if (!token) return;

    try {
      const categoriesData = await getCategories(token);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function loadTransaction() {
    if (!token || !transactionId) return;

    try {
      setLoading(true);
      const transactionData = await getTransactionById(token, transactionId);
      setTransaction(transactionData);
      setType(transactionData.type);
      setContext(transactionData.context);
      setAmount(transactionData.amount.toString());
      setSource(transactionData.source || '');
      setSelectedCategory(transactionData.category || '');
      setDescription(transactionData.description || '');
      if (transactionData.date) {
        setDate(new Date(transactionData.date).toISOString().split('T')[0]);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load transaction');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  // Auto-suggest category for expenses when description changes
  useEffect(() => {
    if (type === 'expense' && description.trim() && token && description !== transaction?.description) {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
      categorySuggestTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await suggestCategory(token, description, 'expense');
          if (result.category) {
            setSelectedCategory(result.category);
            setIsAutoDetected(true);
            setTimeout(() => {
              scrollToCategory(result.category);
            }, 100);
          }
        } catch (err) {
          console.error('Failed to suggest category:', err);
        }
      }, 500);
    }

    return () => {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
    };
  }, [description, type, token]);

  function scrollToCategory(category: string) {
    if (!categoryScrollViewRef.current || !availableCategories.length) return;

    const categoryIndex = availableCategories.indexOf(category);
    if (categoryIndex === -1) return;

    requestAnimationFrame(() => {
      if (!categoryScrollViewRef.current) return;
      const chipWidth = 140;
      const scrollPosition = categoryIndex * chipWidth;
      categoryScrollViewRef.current.scrollTo({
        x: Math.max(0, scrollPosition - 40),
        animated: true,
      });
    });
  }

  function handleCategorySelect(category: string) {
    setSelectedCategory(category);
    setIsAutoDetected(false);
    scrollToCategory(category);
  }

  async function handleSave() {
    if (!token || !transaction) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (type === 'income' && !source.trim()) {
      Alert.alert('Error', 'Please enter a source of income');
      return;
    }

    try {
      setSaving(true);

      const updateData: UpdateTransactionDto = {
        amount: amountNum,
        context,
        description: description.trim() || undefined,
        date: date || undefined,
      };

      if (type === 'income') {
        updateData.source = source.trim();
      } else {
        if (selectedCategory) {
          updateData.category = selectedCategory;
        }
      }

      await updateTransaction(token, transactionId, updateData);

      Alert.alert('Success', 'Transaction updated successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !transaction) return;

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteTransaction(token, transactionId);
              Alert.alert('Success', 'Transaction deleted successfully!', [
                { text: 'OK', onPress: onSuccess },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete transaction');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  const availableCategories = categories?.expense || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Edit Transaction"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Transaction not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Edit Transaction"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          <View style={styles.form}>
            {/* Type Display (read-only for editing) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeDisplay}>
                <Text style={styles.typeDisplayText}>
                  {type === 'income' ? 'Income' : 'Expense'}
                </Text>
              </View>
            </View>

            {/* Context Toggle */}
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

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Income: Source */}
            {type === 'income' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Source of Income *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.sourceSelector}>
                    {incomeSources.map((sourceOption) => (
                      <TouchableOpacity
                        key={sourceOption}
                        style={[
                          styles.sourceButton,
                          source === sourceOption && styles.sourceButtonActive,
                        ]}
                        onPress={() => setSource(sourceOption)}
                      >
                        <Text
                          style={[
                            styles.sourceButtonText,
                            source === sourceOption && styles.sourceButtonTextActive,
                          ]}
                        >
                          {sourceOption}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={[styles.input, styles.marginTop]}
                  placeholder="Or enter custom source..."
                  value={source}
                  onChangeText={setSource}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Expense: Category */}
            {type === 'expense' && (
              <View style={styles.inputGroup}>
                <View style={styles.categoryLabelRow}>
                  <Text style={styles.label}>Category</Text>
                  {isAutoDetected && selectedCategory && (
                    <View style={styles.autoDetectedBadge}>
                      <MaterialIcons name="auto-awesome" size={14} color="#10B981" />
                      <Text style={styles.autoDetectedText}>Auto-detected</Text>
                    </View>
                  )}
                </View>
                {availableCategories && availableCategories.length > 0 ? (
                  <ScrollView
                    ref={categoryScrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScrollView}
                  >
                    <View style={styles.categorySelector}>
                      {availableCategories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          ref={(ref) => {
                            if (ref) categoryChipRefs.current[category] = ref;
                          }}
                          style={[
                            styles.categoryButton,
                            selectedCategory === category && styles.categoryButtonActive,
                            isAutoDetected && selectedCategory === category && styles.categoryButtonAutoDetected,
                          ]}
                          onPress={() => handleCategorySelect(category)}
                        >
                          <Icon
                            name={normalizeCategoryName(category)}
                            size="sm"
                            color={selectedCategory === category ? '#fff' : '#6B7280'}
                            style={styles.categoryIcon}
                          />
                          <Text
                            style={[
                              styles.categoryButtonText,
                              selectedCategory === category && styles.categoryButtonTextActive,
                            ]}
                          >
                            {category}
                          </Text>
                          {isAutoDetected && selectedCategory === category && (
                            <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <Text style={styles.errorText}>No categories available</Text>
                )}
              </View>
            )}

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description{type === 'expense' ? ' (Auto-categorizes)' : ''}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={type === 'income' ? 'Add a note...' : 'e.g., Groceries at Walmart'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoCapitalize="sentences"
              />
            </View>

            {/* Date */}
            <View style={styles.inputGroup}>
              <DatePicker
                value={date}
                onChange={setDate}
                label="Date"
                placeholder="Select date"
              />
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
                    <Text style={styles.deleteButtonText}>Delete Transaction</Text>
                  </>
                )}
              </TouchableOpacity>
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
  typeDisplay: {
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  typeDisplayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
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
  marginTop: {
    marginTop: 8,
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
  sourceSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sourceButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  sourceButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  sourceButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  sourceButtonTextActive: {
    color: '#fff',
  },
  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autoDetectedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  categoryScrollView: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryButtonAutoDetected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    marginRight: 0,
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 2,
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
});

