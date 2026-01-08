import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { DatePicker } from '../components/DatePicker';
import { ParticipantPicker, SelectedParticipant } from '../components/ParticipantPicker';
import { useAuth } from '../auth/authContext';
import { getChoreById, updateChore, Chore, UpdateChoreDto, calculateChorePoints, CalculatePointsResponse } from '../api/choreApi';
import { getGroupById, GroupMember } from '../api/groupApi';
import { getFriends, Friend } from '../api/friendApi';
import { Header, HeaderOption } from '../components/Header';
import { Icon } from '../components/Icon';
import { getChoreCategoryIcon, getChoreCategoryMaterialIcon } from '../utils/choreCategoryIcons';

interface EditChoreScreenProps {
  choreId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

const POINT_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// Expanded chore categories (same as CreateChoreScreen)
const CHORE_CATEGORIES = [
  // Cleaning
  'Bathroom Cleaning',
  'Kitchen Cleaning',
  'Vacuum',
  'Dusting',
  'Mopping',
  'Windows',
  'Deep Clean',
  
  // Cooking
  'Cooking',
  'Meal Prep',
  'Baking',
  'Grilling',
  
  // Shopping & Errands
  'Grocery Shopping',
  'Shopping',
  'Pickup/Delivery',
  'Post Office',
  'Bank',
  'Pharmacy',
  
  // Maintenance
  'Home Maintenance',
  'Plumbing',
  'Electrical',
  'Painting',
  'Carpentry',
  
  // Laundry
  'Laundry',
  'Folding',
  'Ironing',
  
  // Trash & Recycling
  'Trash & Recycling',
  'Compost',
  
  // Pet Care
  'Pet Care',
  'Dog Walk',
  'Pet Grooming',
  
  // Yard & Garden
  'Yard Work',
  'Mowing',
  'Gardening',
  'Snow Removal',
  'Raking',
  
  // Organization
  'Organization',
  'Packing',
  'Unpacking',
  
  // Childcare
  'Childcare',
  'School',
  
  // Car & Vehicle
  'Car Wash',
  'Car Maintenance',
  
  // Health & Fitness
  'Exercise',
  'Appointment',
  
  // Other
  'Other',
];

// Enhanced category keyword mappings for auto-suggestion (same as CreateChoreScreen)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Bathroom Cleaning': ['bathroom', 'toilet', 'shower', 'sink', 'mirror', 'bath', 'restroom'],
  'Kitchen Cleaning': ['kitchen', 'dishes', 'dishwasher', 'sink', 'counter', 'stove', 'oven', 'fridge', 'microwave'],
  'Vacuum': ['vacuum', 'vacuuming', 'carpet', 'rug', 'floor'],
  'Dusting': ['dust', 'dusting', 'shelves', 'furniture', 'surfaces'],
  'Mopping': ['mop', 'mopping', 'floor', 'tile', 'hardwood'],
  'Windows': ['window', 'windows', 'glass', 'clean windows'],
  'Deep Clean': ['deep clean', 'spring clean', 'thorough', 'detailed'],
  'Cooking': ['cook', 'cooking', 'meal', 'dinner', 'lunch', 'breakfast', 'recipe', 'prepare', 'food'],
  'Meal Prep': ['meal prep', 'prep', 'preparation', 'batch cooking'],
  'Baking': ['bake', 'baking', 'cake', 'bread', 'cookies', 'pastry'],
  'Grilling': ['grill', 'grilling', 'bbq', 'barbecue', 'outdoor cooking'],
  'Grocery Shopping': ['grocery', 'groceries', 'supermarket', 'food shopping'],
  'Shopping': ['shop', 'store', 'buy', 'purchase', 'mall', 'retail'],
  'Pickup/Delivery': ['pickup', 'delivery', 'pick up', 'drop off', 'package'],
  'Post Office': ['post office', 'mail', 'postal', 'package', 'letter'],
  'Bank': ['bank', 'banking', 'atm', 'deposit', 'withdrawal'],
  'Pharmacy': ['pharmacy', 'prescription', 'medicine', 'drugstore'],
  'Home Maintenance': ['maintenance', 'repair', 'fix', 'broken', 'install', 'replace'],
  'Plumbing': ['plumbing', 'plumber', 'pipe', 'faucet', 'leak', 'drain'],
  'Electrical': ['electrical', 'electric', 'wiring', 'outlet', 'switch', 'light'],
  'Painting': ['paint', 'painting', 'brush', 'wall', 'room'],
  'Carpentry': ['carpentry', 'wood', 'saw', 'drill', 'furniture', 'cabinet'],
  'Laundry': ['laundry', 'wash', 'washing', 'clothes', 'clothing'],
  'Folding': ['fold', 'folding', 'clothes', 'laundry'],
  'Ironing': ['iron', 'ironing', 'press', 'wrinkles'],
  'Trash & Recycling': ['trash', 'garbage', 'recycle', 'waste', 'bin', 'disposal', 'rubbish'],
  'Compost': ['compost', 'composting', 'organic waste'],
  'Pet Care': ['pet', 'animal', 'feed', 'feeding'],
  'Dog Walk': ['walk', 'dog walk', 'walking', 'dog', 'puppy'],
  'Pet Grooming': ['groom', 'grooming', 'bath', 'brush', 'pet bath'],
  'Yard Work': ['yard', 'outdoor', 'outside'],
  'Mowing': ['mow', 'mowing', 'lawn', 'grass', 'mower'],
  'Gardening': ['garden', 'gardening', 'plant', 'planting', 'flower', 'vegetable'],
  'Snow Removal': ['snow', 'shovel', 'snow removal', 'snow shoveling'],
  'Raking': ['rake', 'raking', 'leaves', 'leaf'],
  'Organization': ['organize', 'organization', 'sort', 'arrange', 'tidy', 'declutter'],
  'Packing': ['pack', 'packing', 'box', 'boxes', 'move'],
  'Unpacking': ['unpack', 'unpacking', 'unbox', 'unboxing'],
  'Childcare': ['childcare', 'babysitting', 'kids', 'children', 'child'],
  'School': ['school', 'homework', 'project', 'assignment'],
  'Car Wash': ['car wash', 'wash car', 'vehicle wash'],
  'Car Maintenance': ['car maintenance', 'vehicle maintenance', 'oil change', 'tire', 'car repair'],
  'Exercise': ['exercise', 'workout', 'gym', 'fitness', 'run', 'jog'],
  'Appointment': ['appointment', 'doctor', 'dentist', 'meeting'],
  'Other': ['other', 'misc', 'miscellaneous'],
};

// Auto-suggest category based on title and description
function suggestChoreCategory(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  
  let bestMatch: { category: string; score: number } | null = null;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category, score };
    }
  }
  
  return bestMatch && bestMatch.score >= 1 ? bestMatch.category : null;
}

export function EditChoreScreen({
  choreId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditChoreScreenProps) {
  const { token, user } = useAuth();
  const [chore, setChore] = useState<Chore | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [points, setPoints] = useState(10);
  const [calculatedPoints, setCalculatedPoints] = useState<number | null>(null);
  const [pointsExplanation, setPointsExplanation] = useState<string>('');
  const [pointsLoading, setPointsLoading] = useState(false);
  const [useManualPoints, setUseManualPoints] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'single' | 'multiple' | 'open'>('single');
  const [selectedParticipant, setSelectedParticipant] = useState<SelectedParticipant | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHoursBefore, setReminderHoursBefore] = useState<number | null>(24);
  // Recurring chore state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly' | 'custom' | null>(null);
  const [recurrenceConfig, setRecurrenceConfig] = useState<{
    daysOfWeek?: number[];
    interval?: number;
    dayOfMonth?: number;
    weekOfMonth?: number;
    dayOfWeek?: number;
  } | null>(null);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState<number | null>(null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'count'>('never');
  // Rotation state
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  // Header options for the options menu
  const headerOptions: HeaderOption[] = [];
  
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointsCalculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoDetectedRef = useRef(false);
  const categoryRef = useRef('');

  useEffect(() => {
    loadChore();
  }, [choreId, token]);

  async function loadChore() {
    if (!token) return;

    try {
      setLoading(true);
      const choreData = await getChoreById(token, choreId);
      setChore(choreData);
      setTitle(choreData.title);
      setDescription(choreData.description || '');
      setPoints(choreData.points);
      
      // Set category from chore data or auto-detect
      if (choreData.category) {
        setCategory(choreData.category);
        setIsAutoDetected(false); // User-set category
      } else {
        // Auto-detect category from existing title/description
        const suggestedCategory = suggestChoreCategory(choreData.title, choreData.description || '');
        if (suggestedCategory) {
          setCategory(suggestedCategory);
          setIsAutoDetected(true);
        }
      }

      // Set assigned participant if exists
      if (choreData.assignedTo && choreData.assignedToUser) {
        setSelectedParticipant({
          userId: choreData.assignedTo,
          type: choreData.groupId ? 'group-member' : 'friend',
          name: choreData.assignedToUser.profile?.displayName || choreData.assignedToUser.email || 'Unknown',
          email: choreData.assignedToUser.email || '',
        });
      }

      setDueDate(choreData.dueDate ? new Date(choreData.dueDate).toISOString().split('T')[0] : '');
      setReminderEnabled(choreData.reminderEnabled || false);
      setReminderHoursBefore(choreData.reminderHoursBefore || 24);
      // Load recurring data
      setIsRecurring(choreData.isRecurring || false);
      setRecurrencePattern(choreData.recurrencePattern || null);
      setRecurrenceConfig(choreData.recurrenceConfig || null);
      if (choreData.recurrenceEndDate) {
        setRecurrenceEndDate(new Date(choreData.recurrenceEndDate).toISOString().split('T')[0]);
        setRecurrenceEndType('date');
      } else if (choreData.recurrenceCount) {
        setRecurrenceCount(choreData.recurrenceCount);
        setRecurrenceEndType('count');
      } else {
        setRecurrenceEndType('never');
      }
      // Load rotation data
      setRotationEnabled(choreData.rotationEnabled || false);
      setUseManualPoints(false); // Default to auto-calculated
      
      // Set assignment type from chore data
      const choreAssignmentType = choreData.assignmentType || 'single';
      setAssignmentType(choreAssignmentType);
      
      // Set selected group or friend
      if (choreData.groupId) {
        setSelectedGroupId(choreData.groupId);
      } else if (choreData.friendId) {
        // Will load friends and set selected friend below
      }

      // Handle multiple assignments
      if (choreData.assignments && choreData.assignments.length > 0) {
        const assignmentParticipants: SelectedParticipant[] = choreData.assignments
          .filter(a => a.user)
          .map(a => ({
            userId: a.userId,
            type: choreData.groupId ? 'group-member' : 'friend',
            name: a.user.profile?.displayName || a.user.email || 'Unknown',
            email: a.user.email || '',
          }));
        setSelectedParticipants(assignmentParticipants);
        if (assignmentParticipants.length === 1) {
          setSelectedParticipant(assignmentParticipants[0]);
        }
      } else if (choreData.assignedTo && choreData.assignedToUser) {
        // Single assignment
        setSelectedParticipant({
          userId: choreData.assignedTo,
          type: choreData.groupId ? 'group-member' : 'friend',
          name: choreData.assignedToUser.profile?.displayName || choreData.assignedToUser.email || 'Unknown',
          email: choreData.assignedToUser.email || '',
        });
      }

      // Load members if it's a group chore
      if (choreData.groupId) {
        try {
          const groupData = await getGroupById(token, choreData.groupId);
          setMembers(groupData.members || []);
        } catch (err) {
          console.error('Failed to load members:', err);
        }
      }

      // Load friends if it's a friend chore or if no group
      if (choreData.friendId || !choreData.groupId) {
        try {
          setLoadingFriends(true);
          const friendsList = await getFriends(token);
          const acceptedFriends = friendsList.filter(f => f.status === 'accepted');
          setFriends(acceptedFriends);
          
          if (choreData.friendId) {
            const friend = acceptedFriends.find(f => f.friendId === choreData.friendId);
            if (friend) {
              setSelectedFriend(friend);
            }
          }
        } catch (err) {
          console.error('Failed to load friends:', err);
        } finally {
          setLoadingFriends(false);
        }
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load chore',
      );
    } finally {
      setLoading(false);
    }
  }

  // Auto-suggest category when title or description changes
  useEffect(() => {
    if ((!title.trim() && !description.trim()) || !token) return;

    if (categorySuggestTimeoutRef.current) {
      clearTimeout(categorySuggestTimeoutRef.current);
    }

    categorySuggestTimeoutRef.current = setTimeout(() => {
      if (!token || (!title.trim() && !description.trim())) return;

      try {
        const suggestedCategory = suggestChoreCategory(title, description);
        if (suggestedCategory && category !== suggestedCategory) {
          setCategory(suggestedCategory);
          setIsAutoDetected(true);
          setTimeout(() => {
            scrollToCategory(suggestedCategory);
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
  }, [title, description, token]);

  // Scroll to selected category chip (for grid layout)
  function scrollToCategory(cat: string) {
    if (!categoryScrollViewRef.current || !CHORE_CATEGORIES.length) return;
    
    const categoryIndex = CHORE_CATEGORIES.indexOf(cat);
    if (categoryIndex === -1) return;

    requestAnimationFrame(() => {
      if (!categoryScrollViewRef.current) return;
      // For grid layout: 3 columns, calculate row position
      const columnsPerRow = 3;
      const row = Math.floor(categoryIndex / columnsPerRow);
      const chipHeight = 80; // Approximate height of each chip
      const rowSpacing = 8;
      const scrollPosition = row * (chipHeight + rowSpacing);
      categoryScrollViewRef.current.scrollTo({
        y: Math.max(0, scrollPosition - 20),
        animated: true,
      });
    });
  }

  function handleCategorySelect(cat: string) {
    setCategory(cat);
    setIsAutoDetected(false);
  }

  // Auto-calculate points when title, description, or category changes (for editing)
  useEffect(() => {
    if (!token || !title.trim() || chore?.status === 'completed') {
      return;
    }

    if (pointsCalculationTimeoutRef.current) {
      clearTimeout(pointsCalculationTimeoutRef.current);
    }

    pointsCalculationTimeoutRef.current = setTimeout(async () => {
      if (!token || !title.trim() || chore?.status === 'completed') return;

      try {
        setPointsLoading(true);
        const result: CalculatePointsResponse = await calculateChorePoints(token, {
          category: category || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
        });
        setCalculatedPoints(result.points);
        setPointsExplanation(result.explanation);
        // Auto-update if using auto mode
        if (!useManualPoints) {
          setPoints(result.points);
        }
      } catch (err) {
        console.error('Failed to calculate points:', err);
      } finally {
        setPointsLoading(false);
      }
    }, 500);

    return () => {
      if (pointsCalculationTimeoutRef.current) {
        clearTimeout(pointsCalculationTimeoutRef.current);
      }
    };
  }, [title, description, category, token, useManualPoints, chore?.status]);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      titleInputRef.current?.focus();
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    if (chore?.status === 'completed') {
      Alert.alert('Error', 'Cannot edit a completed task');
      return;
    }

    try {
      setSaving(true);
      const data: UpdateChoreDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        // Send calculated points if using auto-calculation, otherwise send manual points
        points: useManualPoints ? points : undefined,
        assignedTo: selectedParticipant?.userId || undefined,
        dueDate: dueDate || undefined,
        reminderEnabled: reminderEnabled,
        reminderHoursBefore: (reminderEnabled && reminderHoursBefore && dueDate) ? reminderHoursBefore : undefined,
        // Recurring fields
        isRecurring: isRecurring,
        recurrencePattern: recurrencePattern || undefined,
        recurrenceConfig: recurrenceConfig || undefined,
        recurrenceEndDate: recurrenceEndType === 'date' ? (recurrenceEndDate || undefined) : undefined,
        recurrenceCount: recurrenceEndType === 'count' ? (recurrenceCount || undefined) : undefined,
        // Rotation fields
        rotationEnabled: rotationEnabled && selectedGroupId ? rotationEnabled : undefined,
        rotationType: rotationEnabled && selectedGroupId ? 'round-robin' : undefined,
      };

      await updateChore(token, choreId, data);
      
      Alert.alert('Success', 'Task updated successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update task',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Edit Task"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!chore) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Edit Task"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = chore.createdBy === user?.id || (chore.groupId && (members || []).some(m => m.userId === user?.id));

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Edit Task"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="lock-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>You don't have permission to edit this task</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPoints = useManualPoints ? points : (calculatedPoints || points);
  const bonusPoints = Math.round(currentPoints * 0.5);
  const totalPointsIfUnassigned = currentPoints + bonusPoints;
  
  // For multiple assignments, points are divided equally
  const pointsPerPerson = selectedParticipants.length > 0 
    ? Math.round(currentPoints / selectedParticipants.length)
    : currentPoints;
  const bonusPointsPerPerson = Math.round(pointsPerPerson * 0.5);
  const totalPointsPerPerson = pointsPerPerson + bonusPointsPerPerson;
  const canSubmit = title.trim().length > 0 && chore.status !== 'completed';
  const hasContent = title.trim() || description.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Edit Task"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        useOptionsMenu={true}
        options={headerOptions}
      />
      {chore.status === 'completed' && (
        <View style={styles.completedBanner}>
          <MaterialIcons name="check-circle" size={20} color="#10B981" />
          <Text style={styles.completedBannerText}>This task is completed and cannot be edited</Text>
        </View>
      )}
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Hero Title Section */}
          <View style={styles.heroSection}>
            <View style={styles.titleContainer}>
              {category ? (
                <MaterialIcons 
                  name={getChoreCategoryMaterialIcon(category) as any} 
                  size={32} 
                  color={isAutoDetected ? "#10B981" : "#6366F1"} 
                  style={styles.titleIcon} 
                />
              ) : (
                <MaterialIcons 
                  name="task" 
                  size={32} 
                  color="#9CA3AF" 
                  style={styles.titleIcon} 
                />
              )}
              <TextInput
                ref={titleInputRef}
                style={styles.titleInput}
                placeholder="What needs to be done?"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => descriptionInputRef.current?.focus()}
                editable={chore.status !== 'completed'}
              />
              {hasContent && chore.status !== 'completed' && (
                <TouchableOpacity
                  style={styles.categoryExpandButton}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={showCategoryPicker ? "expand-less" : "expand-more"} 
                    size={24} 
                    color="#6366F1" 
                  />
                </TouchableOpacity>
              )}
            </View>
            {category && hasContent && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{category}</Text>
                {isAutoDetected && (
                  <MaterialIcons name="auto-awesome" size={14} color="#10B981" style={styles.autoIcon} />
                )}
              </View>
            )}
          </View>

          {/* Description Section */}
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <MaterialIcons name="description" size={20} color="#6366F1" style={styles.inputIcon} />
              <TextInput
                ref={descriptionInputRef}
                style={styles.descriptionInput}
                placeholder="Add details (optional)"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                editable={chore.status !== 'completed'}
              />
            </View>
            
            {/* Category Grid - only shown when expanded */}
            {hasContent && showCategoryPicker && chore.status !== 'completed' && (
              <View style={styles.categorySection}>
                <Text style={styles.categoryLabel}>Select Category</Text>
                <ScrollView 
                  ref={categoryScrollViewRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryGrid}
                >
                  {CHORE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        category === cat && styles.categoryChipSelected,
                        isAutoDetected && category === cat && styles.categoryChipAutoDetected,
                      ]}
                      onPress={() => {
                        handleCategorySelect(cat);
                        setShowCategoryPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons 
                        name={getChoreCategoryMaterialIcon(cat) as any} 
                        size={20} 
                        color={category === cat ? '#FFFFFF' : '#6366F1'} 
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat && styles.categoryChipTextSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {cat}
                      </Text>
                      {category === cat && (
                        <View style={styles.checkIconContainer}>
                          <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Points Section - Auto-calculated or Manual */}
          {title.trim() && (
            <View style={styles.card}>
              <View style={styles.pointsHeader}>
                <Text style={styles.cardTitle}>Points</Text>
                <View style={styles.pointsHeaderActions}>
                  {pointsLoading && (
                    <ActivityIndicator size="small" color="#6366F1" style={styles.pointsLoading} />
                  )}
                  <TouchableOpacity
                    style={styles.manualToggle}
                    onPress={() => !chore || chore.status !== 'completed' ? setUseManualPoints(!useManualPoints) : undefined}
                    activeOpacity={chore?.status === 'completed' ? 1 : 0.7}
                    disabled={chore?.status === 'completed'}
                  >
                    <MaterialIcons
                      name={useManualPoints ? "edit" : "auto-awesome"}
                      size={18}
                      color={useManualPoints ? "#6366F1" : "#6B7280"}
                    />
                    <Text style={[styles.manualToggleText, useManualPoints && styles.manualToggleTextActive]}>
                      {useManualPoints ? "Manual" : "Auto"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {useManualPoints ? (
                // Manual Points Selection
                <View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pointsScroll}
                    contentContainerStyle={styles.pointsContainer}
                  >
                    {POINT_OPTIONS.map((pts) => (
                      <TouchableOpacity
                        key={pts}
                        style={[
                          styles.pointsChip,
                          points === pts && styles.pointsChipSelected,
                          chore?.status === 'completed' && styles.pointsChipDisabled,
                        ]}
                        onPress={() => {
                          if (chore?.status !== 'completed') {
                            setPoints(pts);
                          }
                        }}
                        activeOpacity={chore?.status === 'completed' ? 1 : 0.7}
                        disabled={chore?.status === 'completed'}
                      >
                        <MaterialIcons
                          name="stars"
                          size={18}
                          color={points === pts ? '#FFFFFF' : '#F59E0B'}
                          style={styles.pointsIcon}
                        />
                        <Text
                          style={[
                            styles.pointsChipText,
                            points === pts && styles.pointsChipTextSelected,
                            chore?.status === 'completed' && styles.pointsChipTextDisabled,
                          ]}
                        >
                          {pts}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Points Info */}
                  <View style={styles.pointsInfo}>
                    <View style={styles.pointsInfoRow}>
                      <Text style={styles.pointsInfoLabel}>Base points:</Text>
                      <View style={styles.pointsValueContainer}>
                        <MaterialIcons name="stars" size={16} color="#F59E0B" />
                        <Text style={styles.pointsValue}>{currentPoints}</Text>
                      </View>
                    </View>
                    {assignmentType === 'multiple' && selectedParticipants.length > 0 ? (
                      <View style={styles.pointsDistributionInfo}>
                        <MaterialIcons name="people" size={16} color="#6366F1" />
                        <Text style={styles.pointsDistributionText}>
                          {currentPoints} points ÷ {selectedParticipants.length} people = {pointsPerPerson} pts each
                        </Text>
                        {bonusPointsPerPerson > 0 && (
                          <Text style={styles.pointsDistributionSubtext}>
                            +{bonusPointsPerPerson} bonus each = {totalPointsPerPerson} total per person
                          </Text>
                        )}
                      </View>
                    ) : !selectedParticipant && selectedParticipants.length === 0 ? (
                      <View style={styles.bonusInfo}>
                        <MaterialIcons name="bolt" size={16} color="#10B981" />
                        <Text style={styles.bonusText}>
                          +{bonusPoints} bonus if unassigned = {totalPointsIfUnassigned} total
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                // Auto-calculated Points Display
                <View style={styles.autoPointsContainer}>
                  <View style={styles.autoPointsDisplay}>
                    <MaterialIcons name="stars" size={24} color="#F59E0B" />
                    <Text style={styles.autoPointsValue}>{points}</Text>
                    <Text style={styles.autoPointsLabel}>points</Text>
                  </View>
                  
                  {pointsExplanation && (
                    <View style={styles.pointsExplanationContainer}>
                      <MaterialIcons name="info-outline" size={16} color="#6B7280" />
                      <Text style={styles.pointsExplanationText}>{pointsExplanation}</Text>
                    </View>
                  )}
                  
                  {/* Points distribution info */}
                  {assignmentType === 'multiple' && selectedParticipants.length > 0 ? (
                    <View style={styles.pointsDistributionInfo}>
                      <MaterialIcons name="people" size={16} color="#6366F1" />
                      <Text style={styles.pointsDistributionText}>
                        {currentPoints} points ÷ {selectedParticipants.length} people = {pointsPerPerson} pts each
                      </Text>
                      {bonusPointsPerPerson > 0 && (
                        <Text style={styles.pointsDistributionSubtext}>
                          +{bonusPointsPerPerson} bonus each = {totalPointsPerPerson} total per person
                        </Text>
                      )}
                    </View>
                  ) : !selectedParticipant && selectedParticipants.length === 0 ? (
                    <View style={styles.bonusInfo}>
                      <MaterialIcons name="bolt" size={16} color="#10B981" />
                      <Text style={styles.bonusText}>
                        +{bonusPoints} bonus if unassigned = {totalPointsIfUnassigned} total
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          )}

          {/* Assignment Type Section */}
          {chore && chore.status !== 'completed' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Assignment Type</Text>
              <View style={styles.assignmentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.assignmentTypeOption,
                    assignmentType === 'open' && styles.assignmentTypeOptionSelected,
                  ]}
                  onPress={() => {
                    setAssignmentType('open');
                    setSelectedParticipant(null);
                    setSelectedParticipants([]);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="public"
                    size={20}
                    color={assignmentType === 'open' ? '#FFFFFF' : '#6366F1'}
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === 'open' && styles.assignmentTypeTextSelected,
                    ]}
                  >
                    Open
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.assignmentTypeOption,
                    assignmentType === 'single' && styles.assignmentTypeOptionSelected,
                  ]}
                  onPress={() => {
                    setAssignmentType('single');
                    setSelectedParticipants([]);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={assignmentType === 'single' ? '#FFFFFF' : '#6366F1'}
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === 'single' && styles.assignmentTypeTextSelected,
                    ]}
                  >
                    Single
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.assignmentTypeOption,
                    assignmentType === 'multiple' && styles.assignmentTypeOptionSelected,
                  ]}
                  onPress={() => {
                    setAssignmentType('multiple');
                    setSelectedParticipant(null);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="people"
                    size={20}
                    color={assignmentType === 'multiple' ? '#FFFFFF' : '#6366F1'}
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === 'multiple' && styles.assignmentTypeTextSelected,
                    ]}
                  >
                    Multiple
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Assign To Section */}
          {assignmentType !== 'open' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {assignmentType === 'multiple' ? 'Assign To (Multiple)' : 'Assign To'}
              </Text>
              {chore && chore.status === 'completed' ? (
                <View style={styles.readOnlyField}>
                  {assignmentType === 'multiple' && selectedParticipants.length > 0 ? (
                    <Text style={styles.readOnlyText}>
                      {selectedParticipants.map(p => p.name).join(', ')}
                    </Text>
                  ) : (
                    <Text style={styles.readOnlyText}>
                      {selectedParticipant 
                        ? selectedParticipant.name 
                        : 'Unassigned'}
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <ParticipantPicker
                    selectedParticipants={assignmentType === 'multiple' ? selectedParticipants : (selectedParticipant ? [selectedParticipant] : [])}
                    onSelectionChange={(participants) => {
                      if (assignmentType === 'multiple') {
                        setSelectedParticipants(participants);
                      } else {
                        setSelectedParticipant(participants.length > 0 ? participants[0] : null);
                      }
                    }}
                    allowMultiple={assignmentType === 'multiple'}
                    showGroups={true}
                    showFriends={!chore?.groupId && !selectedGroupId}
                    groupId={chore?.groupId || selectedGroupId}
                    initialGroupId={chore?.groupId || selectedGroupId || null}
                  />
                  {!selectedParticipant && selectedParticipants.length === 0 && (
                    <View style={styles.bonusHint}>
                      <MaterialIcons name="info-outline" size={16} color="#6366F1" />
                      <Text style={styles.bonusHintText}>
                        Leave unassigned to earn +50% bonus points
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Due Date Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Due Date</Text>
            <DatePicker
              value={dueDate}
              onChange={(date) => {
                setDueDate(date);
                // Auto-enable reminder when due date is set
                if (date && !reminderEnabled) {
                  setReminderEnabled(true);
                }
              }}
              label=""
              placeholder="Select due date (optional)"
              minimumDate={new Date()}
              disabled={chore.status === 'completed'}
            />
          </View>

          {/* Reminder Section - Only show if due date is set */}
          {dueDate && (
            <View style={styles.card}>
              <View style={styles.reminderHeader}>
                <Text style={styles.cardTitle}>Reminder</Text>
                <TouchableOpacity
                  style={styles.toggleSwitch}
                  onPress={() => !chore || chore.status !== 'completed' ? setReminderEnabled(!reminderEnabled) : undefined}
                  activeOpacity={0.7}
                  disabled={chore?.status === 'completed'}
                >
                  <View style={[styles.toggleTrack, reminderEnabled && styles.toggleTrackActive]}>
                    <View style={[styles.toggleThumb, reminderEnabled && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>
              
              {reminderEnabled && (
                <View style={styles.reminderOptions}>
                  <Text style={styles.reminderLabel}>Remind me</Text>
                  <View style={styles.reminderHoursContainer}>
                    {[1, 6, 12, 24, 48].map((hours) => (
                      <TouchableOpacity
                        key={hours}
                        style={[
                          styles.reminderHourChip,
                          reminderHoursBefore === hours && styles.reminderHourChipSelected,
                        ]}
                        onPress={() => !chore || chore.status !== 'completed' ? setReminderHoursBefore(hours) : undefined}
                        activeOpacity={0.7}
                        disabled={chore?.status === 'completed'}
                      >
                        <Text
                          style={[
                            styles.reminderHourText,
                            reminderHoursBefore === hours && styles.reminderHourTextSelected,
                          ]}
                        >
                          {hours}h
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.reminderHint}>
                    before due date
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Recurring Section - Only show if due date is set and chore is not completed */}
          {dueDate && chore && chore.status !== 'completed' && (
            <View style={styles.card}>
              <View style={styles.reminderHeader}>
                <View style={styles.recurringHeaderLeft}>
                  <MaterialIcons name="repeat" size={20} color="#6366F1" />
                  <Text style={styles.cardTitle}>Repeat</Text>
                </View>
                <TouchableOpacity
                  style={styles.toggleSwitch}
                  onPress={() => {
                    setIsRecurring(!isRecurring);
                    if (!isRecurring) {
                      setRecurrencePattern('daily');
                    } else {
                      setRecurrencePattern(null);
                      setRecurrenceConfig(null);
                      setRecurrenceEndDate('');
                      setRecurrenceCount(null);
                      setRecurrenceEndType('never');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toggleTrack, isRecurring && styles.toggleTrackActive]}>
                    <View style={[styles.toggleThumb, isRecurring && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>
              
              {isRecurring && (
                <View style={styles.recurringOptions}>
                  {/* Pattern Selection */}
                  <Text style={styles.recurringLabel}>Repeat every</Text>
                  <View style={styles.recurrencePatternContainer}>
                    {(['daily', 'weekly', 'monthly'] as const).map((pattern) => (
                      <TouchableOpacity
                        key={pattern}
                        style={[
                          styles.recurrencePatternChip,
                          recurrencePattern === pattern && styles.recurrencePatternChipSelected,
                        ]}
                        onPress={() => {
                          setRecurrencePattern(pattern);
                          setRecurrenceConfig(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.recurrencePatternText,
                            recurrencePattern === pattern && styles.recurrencePatternTextSelected,
                          ]}
                        >
                          {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Weekly: Days of week selection */}
                  {recurrencePattern === 'weekly' && (
                    <View style={styles.weeklyConfigContainer}>
                      <Text style={styles.recurringSubLabel}>On days</Text>
                      <View style={styles.daysOfWeekContainer}>
                        {[
                          { label: 'S', value: 0 },
                          { label: 'M', value: 1 },
                          { label: 'T', value: 2 },
                          { label: 'W', value: 3 },
                          { label: 'T', value: 4 },
                          { label: 'F', value: 5 },
                          { label: 'S', value: 6 },
                        ].map((day) => {
                          const isSelected = recurrenceConfig?.daysOfWeek?.includes(day.value) || false;
                          return (
                            <TouchableOpacity
                              key={day.value}
                              style={[
                                styles.dayOfWeekChip,
                                isSelected && styles.dayOfWeekChipSelected,
                              ]}
                              onPress={() => {
                                const currentDays = recurrenceConfig?.daysOfWeek || [];
                                const newDays = isSelected
                                  ? currentDays.filter(d => d !== day.value)
                                  : [...currentDays, day.value];
                                setRecurrenceConfig({
                                  ...recurrenceConfig,
                                  daysOfWeek: newDays.length > 0 ? newDays : undefined,
                                });
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.dayOfWeekText,
                                  isSelected && styles.dayOfWeekTextSelected,
                                ]}
                              >
                                {day.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* End Date or Count */}
                  <View style={styles.recurringEndContainer}>
                    <Text style={styles.recurringSubLabel}>End after</Text>
                    <View style={styles.recurringEndOptions}>
                      <TouchableOpacity
                        style={[
                          styles.recurringEndOption,
                          recurrenceEndType === 'never' && styles.recurringEndOptionSelected,
                        ]}
                        onPress={() => {
                          setRecurrenceEndType('never');
                          setRecurrenceEndDate('');
                          setRecurrenceCount(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.recurringEndOptionText,
                            recurrenceEndType === 'never' && styles.recurringEndOptionTextSelected,
                          ]}
                        >
                          Never
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.recurringEndOption,
                          recurrenceEndType === 'date' && styles.recurringEndOptionSelected,
                        ]}
                        onPress={() => {
                          setRecurrenceEndType('date');
                          setRecurrenceCount(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.recurringEndOptionText,
                            recurrenceEndType === 'date' && styles.recurringEndOptionTextSelected,
                          ]}
                        >
                          Date
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.recurringEndOption,
                          recurrenceEndType === 'count' && styles.recurringEndOptionSelected,
                        ]}
                        onPress={() => {
                          setRecurrenceEndType('count');
                          setRecurrenceEndDate('');
                          setRecurrenceCount(10);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.recurringEndOptionText,
                            recurrenceEndType === 'count' && styles.recurringEndOptionTextSelected,
                          ]}
                        >
                          Count
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* End Date Picker */}
                  {recurrenceEndType === 'date' && (
                    <View style={styles.recurringEndDateContainer}>
                      <DatePicker
                        value={recurrenceEndDate}
                        onChange={(date) => setRecurrenceEndDate(date)}
                        label=""
                        placeholder="Select end date"
                        minimumDate={dueDate ? new Date(dueDate) : new Date()}
                      />
                    </View>
                  )}

                  {/* Occurrence Count Input */}
                  {recurrenceEndType === 'count' && (
                    <View style={styles.recurringCountContainer}>
                      <TextInput
                        style={styles.recurringCountInput}
                        value={recurrenceCount?.toString() || ''}
                        onChangeText={(text) => {
                          const num = parseInt(text, 10);
                          setRecurrenceCount(isNaN(num) ? null : num);
                        }}
                        placeholder="Number of occurrences"
                        keyboardType="numeric"
                      />
                      <Text style={styles.recurringCountLabel}>occurrences</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Rotation Section - Only for group chores */}
          {selectedGroupId && !selectedFriend && (
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <MaterialIcons name="rotate-right" size={20} color="#6366F1" style={styles.inputIcon} />
                <View style={styles.inputRowContent}>
                  <Text style={styles.label}>Enable Rotation</Text>
                  <Text style={styles.helperText}>
                    Automatically rotate this task among group members
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setRotationEnabled(!rotationEnabled);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.toggleTrack, 
                    rotationEnabled && styles.toggleTrackActive,
                  ]}>
                    <View style={[
                      styles.toggleThumb, 
                      rotationEnabled && styles.toggleThumbActive,
                    ]} />
                  </View>
                </TouchableOpacity>
              </View>
              
              {rotationEnabled && (
                <View style={styles.hintContainer}>
                  <MaterialIcons name="info-outline" size={16} color="#6B7280" />
                  <Text style={styles.hintText}>
                    Tasks will automatically rotate among group members in order
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Bottom spacing for floating button */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {chore.status !== 'completed' && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[
              styles.fab,
              (!canSubmit || saving) && styles.fabDisabled,
            ]}
            onPress={handleSave}
            disabled={!canSubmit || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#FFFFFF" />
                <View style={styles.fabTextContainer}>
                  <Text style={styles.fabText}>Save Changes</Text>
                  {!selectedParticipant && (
                    <Text style={styles.fabSubtext}>
                      {totalPointsIfUnassigned} points
                    </Text>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '500',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  completedBannerText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
    position: 'relative',
  },
  titleIcon: {
    marginRight: 12,
  },
  categoryExpandButton: {
    marginLeft: 8,
    padding: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignSelf: 'center',
    gap: 6,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  autoIcon: {
    marginLeft: 2,
  },
  titleInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    padding: 0,
    margin: 0,
    textAlign: 'left',
    includeFontPadding: false,
    textAlignVertical: 'center',
    minHeight: 48,
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
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#F9FAFB',
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
    minHeight: 80,
    maxHeight: 120,
  },
  categorySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  autoDetectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  categoryScroll: {
    marginTop: 0,
    maxHeight: 300,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '31%', // 3 columns with gaps
    minHeight: 80,
    position: 'relative',
  },
  categoryChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  categoryChipAutoDetected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryChipDisabled: {
    opacity: 0.5,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  categoryChipTextDisabled: {
    color: '#9CA3AF',
  },
  checkIconContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pointsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointsLoading: {
    marginLeft: 8,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  manualToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  manualToggleTextActive: {
    color: '#6366F1',
  },
  autoPointsContainer: {
    alignItems: 'center',
  },
  assignmentTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  assignmentTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  assignmentTypeOptionSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  assignmentTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  assignmentTypeTextSelected: {
    color: '#FFFFFF',
  },
  calculatedPointsSuggestion: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  calculatedPointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  calculatedPointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  calculatedPointsExplanation: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  useCalculatedButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  useCalculatedButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  autoPointsDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  autoPointsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F59E0B',
  },
  autoPointsLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  pointsExplanationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    maxWidth: '100%',
  },
  pointsExplanationText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  manualOverrideButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignSelf: 'center',
  },
  manualOverrideButtonText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
  pointsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  pointsContainer: {
    gap: 8,
    paddingRight: 16,
  },
  pointsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
    gap: 6,
  },
  pointsChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  pointsChipDisabled: {
    opacity: 0.5,
  },
  pointsIcon: {
    marginRight: 2,
  },
  pointsChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  pointsChipTextSelected: {
    color: '#FFFFFF',
  },
  pointsChipTextDisabled: {
    color: '#9CA3AF',
  },
  pointsInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  pointsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  pointsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  bonusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  bonusText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  pointsDistributionInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  pointsDistributionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
    marginTop: 4,
  },
  pointsDistributionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  bonusHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  bonusHintText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
    flex: 1,
  },
  readOnlyField: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    minHeight: 52,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleSwitch: {
    padding: 4,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#6366F1',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  reminderOptions: {
    marginTop: 8,
  },
  reminderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  reminderHoursContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  reminderHourChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reminderHourChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  reminderHourText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  reminderHourTextSelected: {
    color: '#6366F1',
  },
  reminderHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Recurring styles
  recurringHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringOptions: {
    marginTop: 16,
    gap: 16,
  },
  recurringLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  recurringSubLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  recurrencePatternContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  recurrencePatternChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recurrencePatternChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  recurrencePatternText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  recurrencePatternTextSelected: {
    color: '#FFFFFF',
  },
  weeklyConfigContainer: {
    marginTop: 8,
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dayOfWeekChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOfWeekChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  dayOfWeekText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dayOfWeekTextSelected: {
    color: '#FFFFFF',
  },
  recurringEndContainer: {
    marginTop: 8,
  },
  recurringEndOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  recurringEndOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recurringEndOptionSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  recurringEndOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  recurringEndOptionTextSelected: {
    color: '#FFFFFF',
  },
  recurringEndDateContainer: {
    marginTop: 12,
  },
  recurringCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  recurringCountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#374151',
  },
  recurringCountLabel: {
    fontSize: 14,
    color: '#6B7280',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  fabTextContainer: {
    alignItems: 'center',
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
    opacity: 0.9,
    marginTop: 2,
  },
});
