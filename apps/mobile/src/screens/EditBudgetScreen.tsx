import React, { useEffect, useState, useRef } from 'react';
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
import { useAuth } from '../auth/authContext';
import {
  getBudgetById,
  updateBudget,
  getCategories,
  suggestCategory,
  UpdateBudgetDto,
  Budget,
  Categories,
} from '../api/financeApi';
import { MaterialIcons } from '@expo/vector-icons';
import { Icon } from '../components/Icon';
import { normalizeCategoryName } from '../utils/categoryIcons';
import { DatePicker } from '../components/DatePicker';

interface EditBudgetScreenProps {
  budgetId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function EditBudgetScreen({
  budgetId,
  onBack,
  onSuccess,
}: EditBudgetScreenProps) {
  const { token } = useAuth();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<Categories | null>(null);
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('80');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  const periods: Array<{ value: 'weekly' | 'monthly' | 'yearly'; label: string }> = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  useEffect(() => {
    loadBudget();
  }, [token, budgetId]);

  // Auto-suggest category when budget name changes
  useEffect(() => {
    if (!name.trim() || !token) return;

    // Clear previous timeout
    if (categorySuggestTimeoutRef.current) {
      clearTimeout(categorySuggestTimeoutRef.current);
    }

    // Debounce category suggestion
    categorySuggestTimeoutRef.current = setTimeout(async () => {
      if (!token || !name.trim()) return;

      try {
        const result = await suggestCategory(token, name, 'expense');
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

    return () => {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
    };
  }, [name, token]);

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
    setSelectedCategory(cat);
    setIsAutoDetected(false);
    scrollToCategory(cat);
  }

  async function loadBudget() {
    if (!token) return;

    try {
      setLoading(true);
      const budgetData = await getBudgetById(token, budgetId);
      setBudget(budgetData);
      
      const categoriesData = await getCategories(token);
      setCategories(categoriesData);
      
      // Populate form fields
      setName(budgetData.name);
      setSelectedCategory(budgetData.category || '');
      setAmount(budgetData.amount.toString());
      setPeriod(budgetData.period as 'weekly' | 'monthly' | 'yearly');
      setStartDate(budgetData.startDate.split('T')[0]);
      setEndDate(budgetData.endDate ? budgetData.endDate.split('T')[0] : '');
      setWarningThreshold(budgetData.warningThreshold.toString());
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load budget');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!token) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a budget name');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const thresholdNum = parseFloat(warningThreshold);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      Alert.alert('Error', 'Warning threshold must be between 0 and 100');
      return;
    }

    try {
      setSaving(true);

      const budgetData: UpdateBudgetDto = {
        name: name.trim(),
        category: selectedCategory || undefined,
        amount: amountNum,
        period,
        startDate,
        endDate: endDate || undefined,
        warningThreshold: thresholdNum,
      };

      await updateBudget(token, budgetId, budgetData);
      Alert.alert('Success', 'Budget updated successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update budget',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading budget...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!budget) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Budget not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Edit Budget</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Budget Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Monthly Groceries"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.categoryLabelRow}>
                <Text style={styles.label}>Category (Optional)</Text>
                {isAutoDetected && selectedCategory && (
                  <View style={styles.autoDetectedBadge}>
                    <MaterialIcons name="auto-awesome" size={14} color="#10B981" />
                    <Text style={styles.autoDetectedText}>Auto-detected</Text>
                  </View>
                )}
              </View>
              <ScrollView
                ref={categoryScrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !selectedCategory && styles.categoryChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory('');
                    setIsAutoDetected(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      !selectedCategory && styles.categoryChipTextSelected,
                    ]}
                  >
                    All Categories
                  </Text>
                </TouchableOpacity>
                {categories?.expense.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    ref={(ref) => {
                      if (ref) categoryChipRefs.current[cat] = ref;
                    }}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipSelected,
                      isAutoDetected && selectedCategory === cat && styles.categoryChipAutoDetected,
                    ]}
                    onPress={() => handleCategorySelect(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                    {isAutoDetected && selectedCategory === cat && (
                      <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Period *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.periodScroll}
                contentContainerStyle={styles.periodContainer}
              >
                {periods.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.periodChip,
                      period === p.value && styles.periodChipSelected,
                    ]}
                    onPress={() => setPeriod(p.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        period === p.value && styles.periodChipTextSelected,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                label="Start Date *"
                placeholder="Select start date"
                minimumDate={new Date()}
              />
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                label="End Date (Optional)"
                placeholder="Select end date"
                minimumDate={startDate ? new Date(startDate) : undefined}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Warning Threshold (%)</Text>
              <TextInput
                style={styles.input}
                value={warningThreshold}
                onChangeText={setWarningThreshold}
                placeholder="80"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                Get a warning when spending reaches this percentage of budget
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
                  <Text style={styles.saveButtonText}>Update Budget</Text>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
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
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
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
    color: '#374151',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 2,
  },
  periodScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  periodContainer: {
    gap: 8,
  },
  periodChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  periodChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  periodChipTextSelected: {
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

