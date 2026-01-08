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
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { pickImage } from '../utils/imagePicker';
import { useAuth } from '../auth/authContext';
import { createExpense, CreateExpenseDto, uploadReceipt, SplitType } from '../api/expenseApi';
import { getCategories, Categories, suggestCategory } from '../api/financeApi';
import { ParticipantPicker, SelectedParticipant } from '../components/ParticipantPicker';
import { SUPPORTED_CURRENCIES } from '../components/CurrencyPicker';
import { Header } from '../components/Header';
import { getAvatarUrl } from '../utils/avatar';
import { getGroupById, GroupMember } from '../api/groupApi';
import { getProfile } from '../api/profileApi';

interface CreateExpenseScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  groupId?: string;
  friendId?: string;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function CreateExpenseScreen({ 
  onBack, 
  onSuccess, 
  groupId,
  friendId: initialFriendId,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreateExpenseScreenProps) {
  const { token, user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Categories | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(groupId);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [paidBy, setPaidBy] = useState<string>('');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState<string>('USD');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const amountInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const advancedSectionRef = useRef<View>(null);

  // Set paidBy to current user when user is available
  useEffect(() => {
    if (user && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user, paidBy]);

  // Auto-focus amount input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Load user's primary currency from profile
  useEffect(() => {
    async function loadUserCurrency() {
      if (!token) return;
      try {
        const profile = await getProfile(token);
        if (profile?.primaryCurrency) {
          setCurrency(profile.primaryCurrency);
        }
      } catch (err) {
        console.error('Failed to load user currency:', err);
        // Keep default USD
      }
    }
    loadUserCurrency();
  }, [token]);

  // Load categories
  useEffect(() => {
    loadCategories();
  }, [token]);

  // Track previous group ID to detect group changes
  const previousGroupIdRef = useRef<string | undefined>(undefined);
  const hasInitializedRef = useRef(false);

  // Auto-select group members when a group is selected
  useEffect(() => {
    async function autoSelectGroupMembers() {
      if (!selectedGroupId || !token || !user) {
        // If group is deselected, remove all group members from selection
        if (!selectedGroupId && previousGroupIdRef.current) {
          setSelectedParticipants(prev => 
            prev.filter(p => p.type !== 'group-member')
          );
        }
        previousGroupIdRef.current = selectedGroupId;
        return;
      }

      // Auto-select on initial mount with groupId prop, or when group changes
      const isNewGroupSelection = previousGroupIdRef.current !== selectedGroupId;
      const isInitialSelection = !hasInitializedRef.current && selectedGroupId;
      
      if (isNewGroupSelection || isInitialSelection) {
        hasInitializedRef.current = true;
        try {
          const groupData = await getGroupById(token, selectedGroupId);
          const groupMembers = groupData.members || [];
          
          // Filter out current user and create SelectedParticipant objects
          const allGroupMembers: SelectedParticipant[] = groupMembers
            .filter((member: GroupMember) => member.userId !== user.id)
            .map((member: GroupMember) => ({
              userId: member.userId,
              type: 'group-member' as const,
              name: member.user?.profile?.displayName || member.user?.email || 'Unknown',
              email: member.user?.email || '',
            }));

          // When a new group is selected, replace all group members with all members from the new group
          // This ensures all members are selected initially
          const existingFriends = selectedParticipants.filter(p => p.type === 'friend');
          setSelectedParticipants([
            ...existingFriends,
            ...allGroupMembers,
          ]);
        } catch (err) {
          console.error('Failed to load group members for auto-selection:', err);
        }
      }
      
      previousGroupIdRef.current = selectedGroupId;
    }

    autoSelectGroupMembers();
  }, [selectedGroupId, token, user]);

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
        console.log('Category suggestion failed:', err);
      }
    }, 500);

    return () => {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
    };
  }, [description, token]);

  // Animate advanced section and scroll to it when opened
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showAdvanced ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Scroll to advanced section when opened
    if (showAdvanced && advancedSectionRef.current && scrollViewRef.current) {
      // Use a longer timeout to ensure the section is fully rendered and measured
      setTimeout(() => {
        if (advancedSectionRef.current && scrollViewRef.current) {
          advancedSectionRef.current.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, y - 40), // Offset for better visibility
                animated: true,
              });
            },
            () => {
              // Fallback: use measureInWindow
              advancedSectionRef.current?.measureInWindow((x, y, width, height) => {
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, y - 40),
                  animated: true,
                });
              });
            }
          );
        }
      }, 400); // Wait for animation to start and section to render
    }
  }, [showAdvanced]);

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
      setLoading(true);
      const categoriesData = await getCategories(token);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate split preview
  function getSplitPreview(): string {
    const amountNum = parseFloat(amount) || 0;
    const allParticipants = [
      { userId: user?.id || '', name: 'You', email: user?.email || '' },
      ...selectedParticipants,
    ];
    
    if (allParticipants.length === 0 || amountNum === 0) return '';
    
    if (splitType === 'EQUAL') {
      const splitAmount = amountNum / allParticipants.length;
      return `$${splitAmount.toFixed(2)} each (${allParticipants.length} ${allParticipants.length === 1 ? 'person' : 'people'})`;
    }
    
    return `Split ${allParticipants.length} ways`;
  }

  // Format amount with currency symbol
  function formatAmount(value: string): string {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function handleSave() {
    if (!token || !user) return;

    const amountNum = parseFloat(amount);
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      descriptionInputRef.current?.focus();
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      amountInputRef.current?.focus();
      return;
    }

    const allParticipants = [
      { userId: user.id, name: 'You', email: user.email },
      ...selectedParticipants,
    ];

    if (allParticipants.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
      return;
    }

    if (paidBy && !allParticipants.some(p => p.userId === paidBy)) {
      Alert.alert('Error', 'The person who paid must be a participant');
      return;
    }

    try {
      setSaving(true);

      let splits: { userId: string; amount: number; percentage?: number }[];

      if (splitType === 'CUSTOM') {
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
        const totalParticipants = allParticipants.length;
        const splitAmount = amountNum / totalParticipants;
        const roundedSplit = Math.round(splitAmount * 100) / 100;
        const remainder = amountNum - (roundedSplit * totalParticipants);
        
        splits = allParticipants.map((p, index) => ({
          userId: p.userId,
          amount: roundedSplit + (index === 0 ? remainder : 0),
        }));
      }

      const expenseData: CreateExpenseDto = {
        description: description.trim(),
        amount: amountNum,
        currency: currency,
        category: category.trim() || undefined,
        groupId: selectedGroupId,
        splits,
        paidBy: paidBy || user.id,
        splitType: splitType,
      };

      const expense = await createExpense(token, expenseData);
      
      if (receiptUri) {
        try {
          await uploadReceipt(token, expense.id, receiptUri);
        } catch (err) {
          console.error('Failed to upload receipt:', err);
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

  const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const allParticipants = [
    { userId: user?.id || '', name: 'You', email: user?.email || '' },
    ...selectedParticipants,
  ];
  const splitPreview = getSplitPreview();
  const canSubmit = amount && description.trim() && selectedParticipants.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Chop a bill"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView 
        ref={scrollViewRef}
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
                style={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
                onSubmitEditing={() => descriptionInputRef.current?.focus()}
              />
            </View>
          </View>

          {/* Who Paid Section - Moved here for visibility */}
          <View style={styles.whoPaidCard}>
            <Text style={styles.whoPaidCardTitle}>Who Paid</Text>
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
                    {participant.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

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
                onChangeText={setDescription}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            
            {/* Category Chips - appear when description is entered */}
            {description.trim() && !loading && categories && (
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

          {/* Split With Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Split with</Text>
            <ParticipantPicker
              selectedParticipants={selectedParticipants}
              onSelectionChange={(participants) => {
                setSelectedParticipants(participants);
                setCustomAmounts({});
                setPercentages({});
              }}
              allowMultiple={true}
              showGroups={true}
              initialGroupId={groupId}
              onGroupChange={(groupId) => {
                setSelectedGroupId(groupId || undefined);
              }}
            />
            
            {/* Split Preview */}
            {splitPreview && (
              <View style={styles.splitPreview}>
                <MaterialIcons name="info-outline" size={16} color="#6366F1" />
                <Text style={styles.splitPreviewText}>{splitPreview}</Text>
              </View>
            )}
          </View>

          {/* Advanced Options - Collapsible */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={showAdvanced ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color="#6366F1" 
            />
            <Text style={styles.advancedToggleText}>Advanced Options</Text>
          </TouchableOpacity>

          <Animated.View
            ref={advancedSectionRef}
            style={[
              styles.advancedSection,
              {
                maxHeight: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 2000],
                }),
                opacity: slideAnim,
              },
            ]}
          >
            {showAdvanced && (
              <>
                {/* Split Type */}
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

                {/* Custom Split Amounts */}
                {splitType === 'CUSTOM' && selectedParticipants.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Custom Amounts</Text>
                    <View style={styles.customSplitContainer}>
                      {allParticipants.map((participant) => {
                        const amountValue = customAmounts[participant.userId] || '';
                        const totalCustom = Object.values(customAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                        const totalAmount = parseFloat(amount) || 0;
                        const isValid = amountValue && Math.abs(totalCustom - totalAmount) <= 0.01;
                        
                        return (
                          <View key={participant.userId} style={styles.customSplitRow}>
                            <Text style={styles.customSplitLabel}>{participant.name}</Text>
                            <View style={[
                              styles.customSplitInputContainer,
                              amountValue && !isValid && styles.customSplitInputError,
                            ]}>
                              <Text style={styles.currencySymbolSmall}>{currencySymbol}</Text>
                              <TextInput
                                style={styles.customSplitInput}
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
                          {currencySymbol}{(parseFloat(amount) - Object.values(customAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Percentage Split */}
                {splitType === 'PERCENTAGE' && selectedParticipants.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Percentages</Text>
                    <View style={styles.percentageSplitContainer}>
                      {allParticipants.map((participant) => {
                        const percentageValue = percentages[participant.userId] || '';
                        const totalPercentage = Object.values(percentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                        const calculatedAmount = (parseFloat(amount) || 0) * parseFloat(percentageValue || '0') / 100;
                        const isValid = percentageValue && Math.abs(totalPercentage - 100) <= 0.01;
                        
                        return (
                          <View key={participant.userId} style={styles.percentageSplitRow}>
                            <Text style={styles.percentageSplitLabel}>{participant.name}</Text>
                            <View style={[
                              styles.percentageSplitInputContainer,
                              percentageValue && !isValid && styles.percentageSplitInputError,
                            ]}>
                              <TextInput
                                style={styles.percentageSplitInput}
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
                                {currencySymbol}{calculatedAmount.toFixed(2)}
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

                {/* Receipt */}
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
              </>
            )}
          </Animated.View>

          {/* Bottom spacing for floating button */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[
            styles.fab,
            !canSubmit && styles.fabDisabled,
            saving && styles.fabDisabled,
          ]}
          onPress={handleSave}
          disabled={!canSubmit || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.fabText}>Chop a bill</Text>
              {splitPreview && (
                <Text style={styles.fabSubtext}>{splitPreview}</Text>
              )}
            </>
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
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    fontSize: 14,
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
  splitPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  splitPreviewText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  advancedSection: {
    overflow: 'hidden',
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
  // Legacy styles (kept for backward compatibility)
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
    backgroundColor: '#6366F1',
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
  bottomSpacer: {
    height: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
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
  fabSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    opacity: 0.9,
  },
});
