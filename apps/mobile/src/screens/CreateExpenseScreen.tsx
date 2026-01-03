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
import { pickImage } from '../utils/imagePicker';
import { useAuth } from '../auth/authContext';
import { createExpense, CreateExpenseDto, uploadReceipt, SplitType } from '../api/expenseApi';
import { getCategories, Categories, suggestCategory } from '../api/financeApi';
import { ParticipantPicker, SelectedParticipant } from '../components/ParticipantPicker';
import { CurrencyPicker, SUPPORTED_CURRENCIES } from '../components/CurrencyPicker';
import { Icon } from '../components/Icon';
import { normalizeCategoryName } from '../utils/categoryIcons';

interface CreateExpenseScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  groupId?: string;
}

export function CreateExpenseScreen({ onBack, onSuccess, groupId }: CreateExpenseScreenProps) {
  const { token, user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Categories | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [paidBy, setPaidBy] = useState<string>(''); // Will be set to user.id when user is available
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState<string>('USD');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  // Set paidBy to current user when user is available
  useEffect(() => {
    if (user && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user, paidBy]);

  // Load categories
  useEffect(() => {
    loadCategories();
  }, [token]);

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
          // Scroll to the selected category after a short delay
          setTimeout(() => {
            scrollToCategory(result.category);
          }, 100);
        }
      } catch (err) {
        // Silently fail - category suggestion is optional
        console.log('Category suggestion failed:', err);
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
      setLoading(true);
      const categoriesData = await getCategories(token);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!token || !user) return;

    const amountNum = parseFloat(amount);
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Get all participants (current user + selected participants)
    const allParticipants = [
      { userId: user.id, name: 'You', email: user.email },
      ...selectedParticipants,
    ];

    if (allParticipants.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
      return;
    }

    // Validate paidBy is a participant
    if (paidBy && !allParticipants.some(p => p.userId === paidBy)) {
      Alert.alert('Error', 'The person who paid must be a participant');
      return;
    }

    try {
      setSaving(true);

      let splits: { userId: string; amount: number; percentage?: number }[];

      if (splitType === 'CUSTOM') {
        // Custom split - use custom amounts
        const totalCustomAmount = allParticipants.reduce((sum, p) => {
          const customAmount = parseFloat(customAmounts[p.userId] || '0');
          return sum + customAmount;
        }, 0);

        if (Math.abs(totalCustomAmount - amountNum) > 0.01) {
          Alert.alert('Error', `Custom amounts (${totalCustomAmount.toFixed(2)}) must equal total amount (${amountNum.toFixed(2)})`);
          setSaving(false);
          return;
        }

        splits = allParticipants.map(p => ({
          userId: p.userId,
          amount: parseFloat(customAmounts[p.userId] || '0'),
        }));
      } else if (splitType === 'PERCENTAGE') {
        // Percentage split - calculate amounts from percentages
        const totalPercentage = allParticipants.reduce((sum, p) => {
          const percentage = parseFloat(percentages[p.userId] || '0');
          return sum + percentage;
        }, 0);

        if (Math.abs(totalPercentage - 100) > 0.01) {
          Alert.alert('Error', `Percentages (${totalPercentage.toFixed(1)}%) must equal 100%`);
          setSaving(false);
          return;
        }

        splits = allParticipants.map(p => {
          const percentage = parseFloat(percentages[p.userId] || '0');
          return {
            userId: p.userId,
            amount: (amountNum * percentage) / 100,
            percentage: percentage,
          };
        });
      } else {
        // EQUAL split - split equally among all participants
        const totalParticipants = allParticipants.length;
        const splitAmount = amountNum / totalParticipants;
        const roundedSplit = Math.round(splitAmount * 100) / 100;
        const remainder = amountNum - (roundedSplit * totalParticipants);
        
        splits = allParticipants.map((p, index) => ({
          userId: p.userId,
          amount: roundedSplit + (index === 0 ? remainder : 0), // Add remainder to first participant
        }));
      }

      const expenseData: CreateExpenseDto = {
        description: description.trim(),
        amount: amountNum,
        currency: currency,
        category: category.trim() || undefined,
        groupId: groupId,
        splits,
        paidBy: paidBy || user.id,
        splitType: splitType,
      };

      console.log('[CreateExpenseScreen] Sending expense data:', {
        description: expenseData.description,
        amount: expenseData.amount,
        splitType: expenseData.splitType,
        paidBy: expenseData.paidBy,
        splits: expenseData.splits.map(s => ({ userId: s.userId, amount: s.amount, percentage: s.percentage })),
      });

      const expense = await createExpense(token, expenseData);
      
      console.log('[CreateExpenseScreen] Expense created successfully:', expense.id);

      // Upload receipt if one was selected
      if (receiptUri) {
        try {
          await uploadReceipt(token, expense.id, receiptUri);
        } catch (err) {
          console.error('Failed to upload receipt:', err);
          // Don't fail the whole operation if receipt upload fails
          Alert.alert('Warning', 'Expense created but receipt upload failed');
        }
      }

      Alert.alert('Success', 'Billchop created successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create billchop');
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
            <Text style={styles.headerTitle}>Chop a bill</Text>
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
              {loading ? (
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Split With</Text>
              <ParticipantPicker
                selectedParticipants={selectedParticipants}
                onSelectionChange={(participants) => {
                  setSelectedParticipants(participants);
                  // Reset custom amounts and percentages when participants change
                  setCustomAmounts({});
                  setPercentages({});
                }}
                allowMultiple={true}
                showGroups={true}
              />
            </View>

            {/* Split Type Selector */}
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

            {/* Who Paid Selector */}
            {selectedParticipants.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Who Paid</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.whoPaidScroll}
                  contentContainerStyle={styles.whoPaidContainer}
                >
                  {[
                    { userId: user?.id || '', name: 'You', email: user?.email || '' },
                    ...selectedParticipants,
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
                        {participant.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Custom Split Amounts */}
            {splitType === 'CUSTOM' && selectedParticipants.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Custom Amounts</Text>
                <View style={styles.customSplitContainer}>
                  {[
                    { userId: user?.id || '', name: 'You', email: user?.email || '' },
                    ...selectedParticipants,
                  ].map((participant) => {
                    const amountValue = customAmounts[participant.userId] || '';
                    const amountNum = parseFloat(amountValue) || 0;
                    const totalAmount = parseFloat(amount) || 0;
                    const totalCustom = Object.values(customAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                    const remaining = totalAmount - totalCustom;
                    const isValid = amountValue && Math.abs(totalCustom - totalAmount) <= 0.01;
                    
                    return (
                      <View key={participant.userId} style={styles.customSplitRow}>
                        <Text style={styles.customSplitLabel}>{participant.name}</Text>
                        <View style={styles.customSplitInputContainer}>
                          <Text style={styles.currencySymbolSmall}>
                            {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$'}
                          </Text>
                          <TextInput
                            style={[
                              styles.customSplitInput,
                              amountValue && !isValid && styles.customSplitInputError,
                            ]}
                            placeholder="0.00"
                            value={amountValue}
                            onChangeText={(text) => {
                              setCustomAmounts(prev => ({
                                ...prev,
                                [participant.userId]: text,
                              }));
                            }}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.remainingAmountContainer}>
                    <Text style={styles.remainingAmountLabel}>Remaining:</Text>
                    <Text style={[
                      styles.remainingAmount,
                      Math.abs(parseFloat(amount) - Object.values(customAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)) <= 0.01
                        ? styles.remainingAmountValid
                        : styles.remainingAmountError
                    ]}>
                      ${(parseFloat(amount) - Object.values(customAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Percentage Split Inputs */}
            {splitType === 'PERCENTAGE' && selectedParticipants.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Percentages</Text>
                <View style={styles.percentageSplitContainer}>
                  {[
                    { userId: user?.id || '', name: 'You', email: user?.email || '' },
                    ...selectedParticipants,
                  ].map((participant) => {
                    const percentageValue = percentages[participant.userId] || '';
                    const percentageNum = parseFloat(percentageValue) || 0;
                    const totalPercentage = Object.values(percentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                    const calculatedAmount = (parseFloat(amount) || 0) * percentageNum / 100;
                    const isValid = percentageValue && Math.abs(totalPercentage - 100) <= 0.01;
                    
                    return (
                      <View key={participant.userId} style={styles.percentageSplitRow}>
                        <Text style={styles.percentageSplitLabel}>{participant.name}</Text>
                        <View style={styles.percentageSplitInputContainer}>
                          <TextInput
                            style={[
                              styles.percentageSplitInput,
                              percentageValue && !isValid && styles.percentageSplitInputError,
                            ]}
                            placeholder="0"
                            value={percentageValue}
                            onChangeText={(text) => {
                              setPercentages(prev => ({
                                ...prev,
                                [participant.userId]: text,
                              }));
                            }}
                            keyboardType="decimal-pad"
                          />
                          <Text style={styles.percentageSymbol}>%</Text>
                        </View>
                        {percentageValue && (
                          <Text style={styles.calculatedAmount}>
                            ${calculatedAmount.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                  <View style={styles.totalPercentageContainer}>
                    <Text style={styles.totalPercentageLabel}>Total:</Text>
                    <Text style={[
                      styles.totalPercentage,
                      Math.abs(Object.values(percentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - 100) <= 0.01
                        ? styles.totalPercentageValid
                        : styles.totalPercentageError
                    ]}>
                      {Object.values(percentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Info Box */}
              {selectedParticipants.length > 0 && (
              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color="#2563EB" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  {splitType === 'EQUAL' && `This expense will be split equally among you and ${selectedParticipants.length} other${selectedParticipants.length !== 1 ? 's' : ''}.`}
                  {splitType === 'CUSTOM' && 'Enter custom amounts for each participant. The total must equal the expense amount.'}
                  {splitType === 'PERCENTAGE' && 'Enter percentages for each participant. The total must equal 100%.'}
                </Text>
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
              accessibilityRole="button"
              accessibilityLabel="Chop a bill"
              accessibilityHint="Creates the expense and splits it among selected participants"
              accessibilityState={{ disabled: saving }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" accessible={false} />
              ) : (
                <Text style={styles.saveButtonText}>Chop a bill</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Cancels expense creation and returns to previous screen"
            >
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
    paddingBottom: 24, // lg: 24px
  },
  content: {
    paddingHorizontal: 24, // lg: 24px
    // No paddingTop - SafeAreaView handles top spacing
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16, // md: 16px - Visual spacing from top
    marginBottom: 24, // lg: 24px
  },
  backButton: {
    paddingVertical: 8, // sm: 8px
    paddingHorizontal: 4, // xs: 4px
    minHeight: 44, // Touch target
  },
  backButtonText: {
    fontSize: 16, // Body: 16px
    color: '#2563EB', // Primary Blue
    fontWeight: '500', // Medium
  },
  headerTitle: {
    fontSize: 24, // H2: 24px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
  },
  placeholder: {
    width: 60, // Match back button width
  },
  form: {
    marginTop: 8, // sm: 8px
  },
  inputGroup: {
    marginBottom: 24, // lg: 24px
  },
  label: {
    fontSize: 12, // Labels: 12px
    fontWeight: '500', // Medium
    color: '#374151', // Gray-700
    marginBottom: 4, // xs: 4px
    textTransform: 'uppercase', // Labels: Uppercase
    letterSpacing: 0.5, // Labels: Letter-spacing: 0.5px
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB', // Gray-300
    borderRadius: 8, // Input: 8px
    padding: 12, // md: 12px (3 * 4px)
    paddingHorizontal: 16, // md: 16px
    fontSize: 16, // Input: 16px (prevents zoom on iOS)
    color: '#111827', // Gray-900
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
    borderColor: '#D1D5DB', // Gray-300
    borderRadius: 8, // Input: 8px
    paddingHorizontal: 16, // md: 16px
  },
  currencyPickerContainer: {
    width: 100,
  },
  currencySymbol: {
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#374151', // Gray-700
    marginRight: 8, // sm: 8px
  },
  amountInput: {
    flex: 1,
    padding: 12, // md: 12px (3 * 4px)
    fontSize: 20, // H3: 20px
    fontWeight: '600', // Semi-bold
    color: '#111827', // Gray-900
  },
  infoBox: {
    backgroundColor: '#F3F4F6', // Gray-100
    borderRadius: 8, // Button: 8px
    padding: 16, // md: 16px
    marginBottom: 24, // lg: 24px
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12, // md: 12px
  },
  infoIcon: {
    marginTop: 2, // Small offset for alignment
  },
  infoText: {
    flex: 1,
    fontSize: 14, // Body: 14px
    color: '#6B7280', // Gray-500
    lineHeight: 21, // 1.5 line-height
  },
  saveButton: {
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12, // md: 12px (3 * 4px)
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 24, // Button: 24px horizontal
    minHeight: 44, // Button: 44px touch target
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB', // Primary Blue
  },
  cancelButtonText: {
    color: '#2563EB', // Primary Blue
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  receiptUploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB', // Gray-300
    borderStyle: 'dashed',
    borderRadius: 8, // Button: 8px
    padding: 24, // lg: 24px
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    gap: 8, // sm: 8px
  },
  receiptUploadButtonText: {
    fontSize: 16, // Body: 16px
    color: '#6B7280', // Gray-500
    fontWeight: '500', // Medium
    marginTop: 8, // sm: 8px
  },
  receiptContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB', // Gray-300
    borderRadius: 8, // Button: 8px
    padding: 12, // md: 12px
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8, // Button: 8px
    marginBottom: 12, // md: 12px
    resizeMode: 'contain',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 12, // md: 12px
  },
  receiptButton: {
    flex: 1,
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 8, // Button: 8px
    paddingVertical: 12, // Button: 12px vertical
    paddingHorizontal: 16, // md: 16px
    alignItems: 'center',
    minHeight: 44, // Button: 44px touch target
  },
  receiptButtonText: {
    color: '#fff',
    fontSize: 16, // Button: 16px
    fontWeight: '500', // Medium
  },
  removeButton: {
    backgroundColor: '#EF4444', // Red-500
  },
  removeButtonText: {
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
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipAutoDetected: {
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
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 2,
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
  customSplitContainer: {
    gap: 12,
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customSplitLabel: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  customSplitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    flex: 1,
    maxWidth: 150,
  },
  currencySymbolSmall: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginRight: 4,
  },
  customSplitInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: '#111827',
  },
  customSplitInputError: {
    borderColor: '#EF4444',
  },
  remainingAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  remainingAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  remainingAmountValid: {
    color: '#10B981',
  },
  remainingAmountError: {
    color: '#EF4444',
  },
  percentageSplitContainer: {
    gap: 12,
  },
  percentageSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  percentageSplitLabel: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  percentageSplitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 4,
    flex: 1,
    maxWidth: 150,
  },
  percentageSplitInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: '#111827',
  },
  percentageSplitInputError: {
    borderColor: '#EF4444',
  },
  percentageSymbol: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  calculatedAmount: {
    fontSize: 14,
    color: '#6B7280',
    minWidth: 80,
    textAlign: 'right',
  },
  totalPercentageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalPercentageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalPercentageValid: {
    color: '#10B981',
  },
  totalPercentageError: {
    color: '#EF4444',
  },
});

