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
  createTransaction,
  getCategories,
  suggestCategory,
  Categories,
  CreateTransactionDto,
} from '../api/financeApi';
import { MaterialIcons } from '@expo/vector-icons';
import { DatePicker } from '../components/DatePicker';
import { Icon } from '../components/Icon';
import { normalizeCategoryName } from '../utils/categoryIcons';

interface AddTransactionScreenProps {
  context?: 'local' | 'home'; // Optional: pre-select context
  initialType?: 'income' | 'expense'; // Optional: pre-select type
  onBack: () => void;
  onSuccess: () => void;
}

export function AddTransactionScreen({
  context: initialContext,
  initialType,
  onBack,
  onSuccess,
}: AddTransactionScreenProps) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Categories | null>(null);
  const [type, setType] = useState<'income' | 'expense'>(initialType || 'expense');
  const [context, setContext] = useState<'local' | 'home'>(initialContext || 'local');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(''); // For income
  const [selectedCategory, setSelectedCategory] = useState(''); // For expense
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  // Income sources (common options)
  const incomeSources = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other Income'];

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    // Clear category when switching type
    setSelectedCategory('');
    setSource('');
  }, [type]);

  async function loadData() {
    if (!token) return;

    try {
      setLoading(true);
      const categoriesData = await getCategories(token);
      setCategories(categoriesData);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!token) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (type === 'income' && !source.trim()) {
      Alert.alert('Error', 'Please enter a source of income');
      return;
    }

    // For expense, category is optional (auto-populated from description)
    // But we can still require it if user wants to be explicit
    if (type === 'expense' && !selectedCategory && !description.trim()) {
      Alert.alert('Error', 'Please enter a description or select a category');
      return;
    }

    try {
      setSaving(true);

      const transactionData: CreateTransactionDto = {
        type,
        amount: amountNum,
        context,
        description: description.trim() || undefined,
        date: date || undefined, // Defaults to today if empty
      };

      // Add type-specific fields
      if (type === 'income') {
        transactionData.source = source.trim();
      } else {
        // For expense, include category if selected (backend will auto-populate if not provided)
        if (selectedCategory) {
          transactionData.category = selectedCategory;
        }
      }

      await createTransaction(token, transactionData);

      Alert.alert('Success', 'Transaction added successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add transaction');
    } finally {
      setSaving(false);
    }
  }

  // Auto-suggest category for expenses when description changes
  useEffect(() => {
    if (type === 'expense' && description.trim() && token) {
      // Clear previous timeout
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
      // Set new timeout to debounce API calls
      categorySuggestTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await suggestCategory(token, description, 'expense');
          if (result.category) {
            setSelectedCategory(result.category);
            setIsAutoDetected(true);
            // Scroll to the selected category after a short delay to ensure it's rendered
            setTimeout(() => {
              scrollToCategory(result.category);
            }, 100);
          }
        } catch (err) {
          // Silently fail - user can still manually select category
          console.error('Failed to suggest category:', err);
        }
      }, 500); // Wait 500ms after user stops typing
    }

    return () => {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
    };
  }, [description, type, token]);

  // Scroll to selected category
  function scrollToCategory(category: string) {
    if (!categoryScrollViewRef.current || !availableCategories.length) return;
    
    const categoryIndex = availableCategories.indexOf(category);
    if (categoryIndex === -1) return;

    // Use requestAnimationFrame to ensure the view is rendered
    requestAnimationFrame(() => {
      if (!categoryScrollViewRef.current) return;
      
      // Try to measure the chip if ref exists
      const chipRef = categoryChipRefs.current[category];
      if (chipRef && chipRef.measure) {
        chipRef.measure((x, y, width, height, pageX, pageY) => {
          if (categoryScrollViewRef.current) {
            categoryScrollViewRef.current.scrollTo({
              x: Math.max(0, pageX - 40), // Offset to show some context
              animated: true,
            });
          }
        });
      } else {
        // Fallback: Calculate approximate position (each chip is ~140px wide + 8px gap)
        const chipWidth = 140;
        const scrollPosition = categoryIndex * chipWidth;
        categoryScrollViewRef.current.scrollTo({
          x: Math.max(0, scrollPosition - 40), // Offset to show some context
          animated: true,
        });
      }
    });
  }

  // Handle manual category selection
  function handleCategorySelect(category: string) {
    setSelectedCategory(category);
    setIsAutoDetected(false);
    scrollToCategory(category);
  }

  const availableCategories = categories?.expense || [];

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
            <Text style={styles.headerTitle}>New Transaction</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            {/* Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'income' && styles.typeButtonActive,
                ]}
                onPress={() => {
                  setType('income');
                  setSelectedCategory('');
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'expense' && styles.typeButtonActive,
                ]}
                onPress={() => {
                  setType('expense');
                  setSource('');
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
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
                <Text style={styles.currencySymbol}>$</Text>
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
                {/* Custom source input */}
                <TextInput
                  style={[styles.input, styles.marginTop]}
                  placeholder="Or enter custom source..."
                  value={source}
                  onChangeText={setSource}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Expense: Category (auto-populated from description) */}
            {type === 'expense' && (
              <View style={styles.inputGroup}>
                <View style={styles.categoryLabelRow}>
                  <Text style={styles.label}>
                    Category
                  </Text>
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
                      {availableCategories.map((category, index) => (
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
                <Text style={styles.saveButtonText}>Add Transaction</Text>
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
  form: {
    marginTop: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#fff',
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontStyle: 'italic',
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
});
