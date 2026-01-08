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
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { pickImage } from '../utils/imagePicker';
import { useAuth } from '../auth/authContext';
import { updateExpense, getExpenseById, uploadReceipt, Expense, SplitType } from '../api/expenseApi';
import { getCategories, Categories, suggestCategory } from '../api/financeApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { SUPPORTED_CURRENCIES } from '../components/CurrencyPicker';
import { Header } from '../components/Header';
import { getProfile } from '../api/profileApi';
import { getAvatarUrl } from '../utils/avatar';

interface EditExpenseScreenProps {
  expenseId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditExpenseScreen({ 
  expenseId, 
  onBack, 
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditExpenseScreenProps) {
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
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const amountInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadExpense();
    loadCategories();
  }, [expenseId, token]);

  // Load user's primary currency from profile (for consistency, though expense has its own currency)
  useEffect(() => {
    async function loadUserCurrency() {
      if (!token) return;
      try {
        const profile = await getProfile(token);
        // Use expense currency if available, otherwise profile currency
        if (expense && expense.currency) {
          setCurrency(expense.currency);
        } else if (profile?.primaryCurrency) {
          setCurrency(profile.primaryCurrency);
        }
      } catch (err) {
        console.error('Failed to load user currency:', err);
      }
    }
    if (expense) {
      loadUserCurrency();
    }
  }, [token, expense]);

  // Auto-suggest category when description changes
  useEffect(() => {
    if (!description.trim() || !token) return;

    if (categorySuggestTimeoutRef.current) {
      clearTimeout(categorySuggestTimeoutRef.current);
    }

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

  function validateForm(): boolean {
    const newErrors: { description?: string; amount?: string } = {};
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!token || !expense) return;

    if (!validateForm()) {
      return;
    }

    const amountNum = parseFloat(amount);

    try {
      setSaving(true);

      const updateData: any = {
        description: description.trim(),
        amount: amountNum,
        currency: currency,
        category: category.trim() || undefined,
        splitType: splitType,
        paidBy: paidBy,
      };

      const updatedExpense = await updateExpense(token, expenseId, updateData);

      if (receiptUri && receiptUri.startsWith('file://')) {
        try {
          await uploadReceipt(token, updatedExpense.id, receiptUri);
        } catch (err) {
          console.error('Failed to upload receipt:', err);
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
        <Header
          title="Edit Expense"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Edit Expense"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Expense not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const allParticipants = expense.splits.map(split => ({
    userId: split.userId,
    name: split.user?.profile?.displayName || split.user?.email || 'Unknown',
    email: split.user?.email || '',
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Edit Expense"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Hero Amount Section */}
          <View style={styles.heroSection}>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbolLarge}>{currencySymbol}</Text>
              <TextInput
                ref={amountInputRef}
                style={[styles.amountInput, errors.amount && styles.amountInputError]}
                placeholder="0.00"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (errors.amount) {
                    setErrors(prev => ({ ...prev, amount: undefined }));
                  }
                }}
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
                onSubmitEditing={() => descriptionInputRef.current?.focus()}
              />
            </View>
            {errors.amount && (
              <Text style={styles.errorTextInline}>{errors.amount}</Text>
            )}
          </View>

          {/* Who Paid Section - Prominent placement */}
          {expense && expense.splits.length > 0 && (
            <View style={styles.whoPaidCard}>
              <Text style={styles.whoPaidCardTitle}>Who Paid</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.whoPaidScroll}
                contentContainerStyle={styles.whoPaidContainer}
              >
                {allParticipants.map((participant) => (
                  <TouchableOpacity
                    key={participant.userId}
                    style={[
                      styles.whoPaidButtonCompact,
                      paidBy === participant.userId && styles.whoPaidButtonCompactSelected,
                    ]}
                    onPress={() => setPaidBy(participant.userId)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="payment"
                      size={14}
                      color={paidBy === participant.userId ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.whoPaidButtonTextCompact,
                        paidBy === participant.userId && styles.whoPaidButtonTextCompactSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {participant.userId === user?.id ? 'You' : participant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description Section */}
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <MaterialIcons name="description" size={20} color="#6366F1" style={styles.inputIcon} />
              <TextInput
                ref={descriptionInputRef}
                style={styles.descriptionInput}
                placeholder="What was this for?"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (errors.description) {
                    setErrors(prev => ({ ...prev, description: undefined }));
                  }
                }}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            {errors.description && (
              <Text style={styles.errorTextInline}>{errors.description}</Text>
            )}
            
            {/* Category Chips */}
            {description.trim() && !categoriesLoading && categories && (
              <ScrollView 
                ref={categoryScrollViewRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
              >
                {categories.expense.map((cat) => (
                  <TouchableOpacity
                    key={cat}
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

          {/* Participants Display - Read-only since they're fixed */}
          {expense && expense.splits.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Participants</Text>
              <View style={styles.participantsList}>
                {expense.splits.map((split) => {
                  const avatarUrl = getAvatarUrl(split.user?.profile?.avatarUrl || null);
                  const participantName = split.user?.profile?.displayName || split.user?.email || 'Unknown';
                  const initials = participantName.charAt(0).toUpperCase();
                  const isYou = split.userId === user?.id;
                  return (
                    <View key={split.id} style={styles.participantRow}>
                      <View style={styles.participantInfo}>
                        <View style={styles.participantAvatar}>
                          {avatarUrl ? (
                            <Image 
                              source={{ uri: avatarUrl }} 
                              style={styles.participantAvatarImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.participantAvatarPlaceholder}>
                              <Text style={styles.participantAvatarText}>{initials}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.participantName}>
                          {isYou ? 'You' : participantName}
                        </Text>
                      </View>
                      <Text style={styles.participantAmount}>
                        {currencySymbol}{split.amount.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Info Boxes - Show consequences of changes */}
          {expense && parseFloat(amount) !== expense.amount && (
            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color="#6366F1" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Changing the amount will automatically recalculate splits proportionally and reset payment status for all participants.
              </Text>
            </View>
          )}
          {expense && parseFloat(amount) === expense.amount && expense.splits.length > 0 && (
            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color="#6366F1" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Editing this expense will reset payment status for all participants.
              </Text>
            </View>
          )}

          {/* Split Type - Only show if expense has splits */}
          {expense && expense.splits.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Split Type</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.splitTypeScroll}
                contentContainerStyle={styles.splitTypeRow}
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

          {/* Receipt Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Receipt (Optional)</Text>
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
                <MaterialIcons name="add-photo-alternate" size={24} color="#6366F1" />
                <Text style={styles.receiptUploadButtonText}>Upload Receipt</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom spacing for floating button */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[
            styles.fab,
            saving && styles.fabDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.fabText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating button
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
    marginTop: 16,
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
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  currencySymbolLarge: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111827',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111827',
    padding: 0,
    margin: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: 'left',
    includeFontPadding: false,
    textAlignVertical: 'center',
    minWidth: 80,
  },
  amountInputError: {
    color: '#EF4444',
  },
  errorTextInline: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  whoPaidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  whoPaidCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  whoPaidScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  whoPaidContainer: {
    gap: 8,
    paddingRight: 8,
  },
  whoPaidButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 36,
    maxWidth: 120,
  },
  whoPaidButtonCompactSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  whoPaidButtonTextCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    flexShrink: 1,
  },
  whoPaidButtonTextCompactSelected: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 14,
  },
  categoryScroll: {
    marginTop: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryContainer: {
    gap: 8,
    paddingRight: 16,
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
    minHeight: 40,
  },
  categoryChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  categoryChipAutoDetected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
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
  participantsList: {
    gap: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6366F1',
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
  },
  participantAvatarImage: {
    width: '100%',
    height: '100%',
  },
  participantAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  participantName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  participantAmount: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },
  splitTypeScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  splitTypeRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  splitTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 40,
    minWidth: 120,
  },
  splitTypeButtonSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  splitTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    includeFontPadding: false,
  },
  splitTypeButtonTextSelected: {
    color: '#FFFFFF',
  },
  receiptUploadButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    gap: 12,
    backgroundColor: '#F9FAFB',
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
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
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
  bottomSpacer: {
    height: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fab: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fabDisabled: {
    opacity: 0.5,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
