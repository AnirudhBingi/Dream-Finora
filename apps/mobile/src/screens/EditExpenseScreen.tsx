import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Icon } from '../components/Icon';
import { normalizeCategoryName } from '../utils/categoryIcons';
import { pickImage } from '../utils/imagePicker';
import { useAuth } from '../auth/authContext';
import { updateExpense, getExpenseById, uploadReceipt, Expense, SplitType } from '../api/expenseApi';
import { getCategories, Categories, suggestCategory } from '../api/financeApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { CurrencyPicker, SUPPORTED_CURRENCIES } from '../components/CurrencyPicker';

interface EditExpenseScreenProps {
  expenseId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function EditExpenseScreen({ expenseId, onBack, onSuccess }: EditExpenseScreenProps) {
  const { token, user } = useAuth();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Categories | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [paidBy, setPaidBy] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    loadExpense();
    loadCategories();
  }, [expenseId, token]);

  // Auto-suggest category when description changes
  useEffect(() => {
    if (!description.trim() || !token) return;

    // Clear previous timeout
    if (categorySuggestTimeoutRef.current) {
      clearTimeout(categorySuggestTimeoutRef.current);
    }

    // Debounce category suggestion
    categorySuggestTimeoutRef.current = setTimeout(async () => {
      if (!token || !description.trim()) return;

      try {
        const result = await suggestCategory(token, description, 'expense');
        if (result.category) {
          setCategory(result.category);
          setIsAutoDetected(true);
          setTimeout(() => {
            scrollToCategory(result.category);
          }, 100);
        }
      } catch (err) {
        console.error('Failed to suggest category:', err);
      }
    }, 500);

    return () => {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
    };
  }, [description, token]);

  // Scroll to selected category
  function scrollToCategory(cat: string) {
    if (!categoryScrollViewRef.current || !categories?.expense.length) return;
    
    const categoryIndex = categories.expense.indexOf(cat);
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

  // Handle manual category selection
  function handleCategorySelect(cat: string) {
    setCategory(cat);
    setIsAutoDetected(false);
    scrollToCategory(cat);
  }

  async function loadCategories() {
    if (!token) return;

    try {
      setCategoriesLoading(true);
      const categoriesData = await getCategories(token);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function loadExpense() {
    if (!token || !expenseId) return;

    try {
      setLoading(true);
      const expenseData = await getExpenseById(token, expenseId);
      setExpense(expenseData);
      setDescription(expenseData.description);
      setAmount(expenseData.amount.toString());
      setCategory(expenseData.category || '');
      setSplitType(expenseData.splitType || 'EQUAL');
      setPaidBy(expenseData.paidBy || expenseData.createdBy);
      setCurrency(expenseData.currency || 'USD');
      if (expenseData.receiptUrl) {
        const receiptUrl = expenseData.receiptUrl.startsWith('http')
          ? expenseData.receiptUrl
          : `${getApiBaseUrl()}${expenseData.receiptUrl}`;
        setReceiptUri(receiptUrl);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load expense');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!token || !expense) return;

    const amountNum = parseFloat(amount);
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setSaving(true);

      // Prepare update data - only include fields that changed
      const updateData: any = {
        description: description.trim(),
        amount: amountNum,
        currency: currency,
        category: category.trim() || undefined,
        splitType: splitType,
        paidBy: paidBy,
      };

      // Update expense
      const updatedExpense = await updateExpense(token, expenseId, updateData);

      // Upload receipt if one was selected and it's a new file (local URI)
      if (receiptUri && receiptUri.startsWith('file://')) {
        try {
          await uploadReceipt(token, updatedExpense.id, receiptUri);
        } catch (err) {
          console.error('Failed to upload receipt:', err);
          // Don't fail the whole operation if receipt upload fails
          Alert.alert('Warning', 'Expense updated but receipt upload failed');
        }
      }

      Alert.alert('Success', 'Expense updated successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  }

  async function pickReceipt() {
    try {
      const uri = await pickImage({ aspect: [4, 3] });
      if (uri) {
        setReceiptUri(uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Expense not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Edit Expense</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Dinner, Groceries, Gas"
                value={description}
                onChangeText={setDescription}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.categoryLabelRow}>
                <Text style={styles.label}>Category</Text>
                {isAutoDetected && category && (
                  <View style={styles.autoDetectedBadge}>
                    <MaterialIcons name="auto-awesome" size={14} color="#10B981" />
                    <Text style={styles.autoDetectedText}>Auto-detected</Text>
                  </View>
                )}
              </View>
              {categoriesLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <ScrollView 
                  ref={categoryScrollViewRef}
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryContainer}
                >
                  {categories?.expense.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      ref={(ref) => {
                        if (ref) categoryChipRefs.current[cat] = ref;
                      }}
                      style={[
                        styles.categoryChip,
                        category === cat && styles.categoryChipSelected,
                        isAutoDetected && category === cat && styles.categoryChipAutoDetected,
                      ]}
                      onPress={() => handleCategorySelect(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                      {isAutoDetected && category === cat && (
                        <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountRow}>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>
                    {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$'}
                  </Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.currencyPickerContainer}>
                  <CurrencyPicker
                    selectedCurrency={currency}
                    onSelectCurrency={setCurrency}
                  />
                </View>
              </View>
            </View>

            {expense && parseFloat(amount) !== expense.amount && (
              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color="#2563EB" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  Note: Changing the amount will automatically recalculate splits proportionally and reset payment status for all participants.
                </Text>
              </View>
            )}
            {expense && parseFloat(amount) === expense.amount && expense.splits.length > 0 && (
              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color="#2563EB" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  Note: Editing splits will reset payment status for all participants.
                </Text>
              </View>
            )}

            {/* Split Type Selector */}
            {expense && expense.splits.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Split Type</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.splitTypeScroll}
                  contentContainerStyle={styles.splitTypeContainer}
                >
                  {(['EQUAL', 'CUSTOM', 'PERCENTAGE'] as SplitType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.splitTypeButton,
                        splitType === type && styles.splitTypeButtonSelected,
                      ]}
                      onPress={() => setSplitType(type)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={
                          type === 'EQUAL' ? 'equalizer' :
                          type === 'CUSTOM' ? 'edit' :
                          'percent'
                        }
                        size={20}
                        color={splitType === type ? '#FFFFFF' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.splitTypeButtonText,
                          splitType === type && styles.splitTypeButtonTextSelected,
                        ]}
                      >
                        {type === 'EQUAL' ? 'Equal' :
                         type === 'CUSTOM' ? 'Custom' :
                         'Percentage'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Who Paid Selector */}
            {expense && expense.splits.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Who Paid</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.whoPaidScroll}
                  contentContainerStyle={styles.whoPaidContainer}
                >
                  {[
                    { userId: expense.createdBy, name: expense?.createdByUser?.profile?.displayName || expense?.createdByUser?.email || 'You' },
                    ...expense.splits
                      .filter(split => split.userId !== expense.createdBy)
                      .map(split => ({
                        userId: split.userId,
                        name: split?.user?.profile?.displayName || split?.user?.email || 'Unknown',
                      })),
                  ].map((participant) => (
                    <TouchableOpacity
                      key={participant.userId}
                      style={[
                        styles.whoPaidButton,
                        paidBy === participant.userId && styles.whoPaidButtonSelected,
                      ]}
                      onPress={() => setPaidBy(participant.userId)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="payment"
                        size={18}
                        color={paidBy === participant.userId ? '#FFFFFF' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.whoPaidButtonText,
                          paidBy === participant.userId && styles.whoPaidButtonTextSelected,
                        ]}
                      >
                        {participant.userId === user?.id ? 'You' : participant.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Receipt (Optional)</Text>
              {receiptUri ? (
                <View style={styles.receiptContainer}>
                  <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
                  <View style={styles.receiptActions}>
                    <TouchableOpacity
                      style={styles.receiptButton}
                      onPress={pickReceipt}
                    >
                      <Text style={styles.receiptButtonText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.receiptButton, styles.removeButton]}
                      onPress={() => setReceiptUri(null)}
                    >
                      <Text style={[styles.receiptButtonText, styles.removeButtonText]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.receiptUploadButton}
                  onPress={pickReceipt}
                >
                  <MaterialIcons name="add-photo-alternate" size={24} color="#6B7280" />
                  <Text style={styles.receiptUploadButtonText}>Upload Receipt</Text>
                </TouchableOpacity>
              )}
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
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    margin: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    marginBottom: 4,
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
  amountRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  amountContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  currencyPickerContainer: {
    width: 100,
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
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
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
  },
  cancelButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
  receiptUploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    gap: 8,
  },
  receiptUploadButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 8,
  },
  receiptContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  receiptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  removeButtonText: {
    color: '#fff',
  },
  splitTypeScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  splitTypeContainer: {
    gap: 8,
  },
  splitTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
  },
  splitTypeButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  splitTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  splitTypeButtonTextSelected: {
    color: '#FFFFFF',
  },
  whoPaidScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  whoPaidContainer: {
    gap: 8,
  },
  whoPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
  },
  whoPaidButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  whoPaidButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  whoPaidButtonTextSelected: {
    color: '#FFFFFF',
  },
  categoryScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  categoryContainer: {
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryIcon: {
    marginRight: 0,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
});

