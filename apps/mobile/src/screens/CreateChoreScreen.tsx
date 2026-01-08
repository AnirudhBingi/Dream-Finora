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
import { useAuth } from '../auth/authContext';
import { createChore, CreateChoreDto, calculateChorePoints, CalculatePointsResponse } from '../api/choreApi';
import { ParticipantPicker, SelectedParticipant } from '../components/ParticipantPicker';
import { DatePicker } from '../components/DatePicker';
import { Header, HeaderOption } from '../components/Header';
import { Icon } from '../components/Icon';
import { getChoreCategoryIcon, getChoreCategoryMaterialIcon } from '../utils/choreCategoryIcons';
import { getFriends, Friend } from '../api/friendApi';
import { getGroupById, GroupMember } from '../api/groupApi';

interface CreateChoreScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  groupId?: string;
  friendId?: string;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

const POINT_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// Chore categories
// Expanded chore categories with more specific options
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

// Enhanced category keyword mappings for auto-suggestion
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

export function CreateChoreScreen({
  onBack,
  onSuccess,
  groupId: initialGroupId,
  friendId: initialFriendId,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreateChoreScreenProps) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [points, setPoints] = useState(20); // Will be auto-calculated
  const [pointsExplanation, setPointsExplanation] = useState<string>('');
  const [pointsLoading, setPointsLoading] = useState(false);
  const [useManualPoints, setUseManualPoints] = useState(false); // Toggle for manual points
  const [assignmentType, setAssignmentType] = useState<'single' | 'multiple' | 'open'>('open');
  const [selectedParticipant, setSelectedParticipant] = useState<SelectedParticipant | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(initialGroupId);
  const [dueDate, setDueDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHoursBefore, setReminderHoursBefore] = useState<number | null>(24); // Default 24 hours
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
  const [loading, setLoading] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointsCalculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoDetectedRef = useRef(false);
  const categoryRef = useRef('');

  // Auto-focus title input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Load friends (for friend-to-friend chores)
  useEffect(() => {
    if (!token) return;

    async function loadFriends() {
      try {
        setLoadingFriends(true);
        const friendsList = await getFriends(token);
        const acceptedFriends = friendsList.filter(f => f.status === 'accepted');
        setFriends(acceptedFriends);
        
        // Auto-select friend if initialFriendId is provided
        if (initialFriendId && !selectedFriend) {
          const friend = acceptedFriends.find(f => f.friendId === initialFriendId);
          if (friend) {
            setSelectedFriend(friend);
            // Auto-select friend in participants if assignment type allows
            if (assignmentType === 'multiple') {
              setSelectedParticipants([{
                userId: friend.friendId,
                type: 'friend',
                name: friend.friend.profile?.displayName || friend.friend.email || 'Unknown',
                email: friend.friend.email || '',
              }]);
            } else if (assignmentType === 'single') {
              setSelectedParticipant({
                userId: friend.friendId,
                type: 'friend',
                name: friend.friend.profile?.displayName || friend.friend.email || 'Unknown',
                email: friend.friend.email || '',
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load friends:', err);
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    }

    loadFriends();
  }, [token, initialFriendId]);

  // Auto-select group members when a group is selected
  const previousGroupIdRef = useRef<string | undefined>(undefined);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    async function autoSelectGroupMembers() {
      if (!selectedGroupId || !token || !user) {
        // If group is deselected, remove all group members from selection
        if (!selectedGroupId && previousGroupIdRef.current) {
          setSelectedParticipants(prev => 
            prev.filter(p => p.type !== 'group-member')
          );
          if (selectedParticipant?.type === 'group-member') {
            setSelectedParticipant(null);
          }
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
            .filter((member: GroupMember) => member.userId !== user?.id)
            .map((member: GroupMember) => ({
              userId: member.userId,
              type: 'group-member' as const,
              name: member.user?.profile?.displayName || member.user?.email || 'Unknown',
              email: member.user?.email || '',
            }));

          // When a new group is selected, replace all group members with all members from the new group
          // This ensures all members are selected initially
          const existingFriends = selectedParticipants.filter(p => p.type === 'friend');
          if (assignmentType === 'multiple') {
            setSelectedParticipants([
              ...existingFriends,
              ...allGroupMembers,
            ]);
          } else if (assignmentType === 'single' && allGroupMembers.length > 0) {
            // For single assignment, select the first member
            setSelectedParticipant(allGroupMembers[0]);
          }
        } catch (err) {
          console.error('Failed to load group members for auto-selection:', err);
        }
      }
      
      previousGroupIdRef.current = selectedGroupId;
    }

    autoSelectGroupMembers();
  }, [selectedGroupId, token, user, assignmentType]);

  // Update refs when state changes
  useEffect(() => {
    isAutoDetectedRef.current = isAutoDetected;
  }, [isAutoDetected]);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  // Auto-suggest category when title or description changes
  useEffect(() => {
    if ((!title.trim() && !description.trim()) || !token) {
      // Clear category if input is empty and was auto-detected
      if (!title.trim() && !description.trim() && isAutoDetectedRef.current) {
        setCategory('');
        setIsAutoDetected(false);
      }
      return;
    }

    if (categorySuggestTimeoutRef.current) {
      clearTimeout(categorySuggestTimeoutRef.current);
    }

    categorySuggestTimeoutRef.current = setTimeout(() => {
      if (!token || (!title.trim() && !description.trim())) return;

      try {
        const suggestedCategory = suggestChoreCategory(title, description);
        if (suggestedCategory) {
          // Only auto-set if category is empty or was auto-detected
          if (!categoryRef.current || isAutoDetectedRef.current) {
            setCategory(suggestedCategory);
            setIsAutoDetected(true);
          }
        } else {
          // Clear if no suggestion and was auto-detected
          if (isAutoDetectedRef.current) {
            setCategory('');
            setIsAutoDetected(false);
          }
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
    scrollToCategory(cat);
  }

  // Auto-calculate points when title, description, or category changes
  useEffect(() => {
    if (!token || (!title.trim() && !description.trim())) {
      setPoints(20);
      setPointsExplanation('');
      return;
    }

    if (pointsCalculationTimeoutRef.current) {
      clearTimeout(pointsCalculationTimeoutRef.current);
    }

    pointsCalculationTimeoutRef.current = setTimeout(async () => {
      if (!token || (!title.trim() && !description.trim())) return;

      try {
        setPointsLoading(true);
        const result: CalculatePointsResponse = await calculateChorePoints(token, {
          category: category || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
        });
        setPoints(result.points);
        setPointsExplanation(result.explanation);
      } catch (err) {
        console.error('Failed to calculate points:', err);
        // Fallback to default
        setPoints(20);
        setPointsExplanation('Standard task');
      } finally {
        setPointsLoading(false);
      }
    }, 500);

    return () => {
      if (pointsCalculationTimeoutRef.current) {
        clearTimeout(pointsCalculationTimeoutRef.current);
      }
    };
  }, [title, description, category, token]);

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      titleInputRef.current?.focus();
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    try {
      setLoading(true);
      const data: CreateChoreDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        // Send points only if manual mode is enabled, otherwise backend auto-calculates
        points: useManualPoints ? points : undefined,
        groupId: selectedGroupId || undefined,
        friendId: selectedFriend?.friendId || undefined,
        assignmentType: assignmentType,
        assignedTo: assignmentType === 'single' && selectedParticipant ? selectedParticipant.userId : undefined,
        assignedToMultiple: assignmentType === 'multiple' && selectedParticipants.length > 0 
          ? selectedParticipants.map(p => p.userId) 
          : undefined,
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

      await createChore(token, data);
      
      Alert.alert('Success', 'Task created successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create task',
      );
    } finally {
      setLoading(false);
    }
  }

  // Calculate points distribution
  const currentPoints = points; // Points are auto-calculated and stored in points state
  const bonusPoints = Math.round(currentPoints * 0.5);
  const totalPointsIfUnassigned = currentPoints + bonusPoints;
  
  // For multiple assignments, points are divided equally
  const pointsPerPerson = selectedParticipants.length > 0 
    ? Math.round(currentPoints / selectedParticipants.length)
    : currentPoints;
  const bonusPointsPerPerson = Math.round(pointsPerPerson * 0.5);
  const totalPointsPerPerson = pointsPerPerson + bonusPointsPerPerson;
  const canSubmit = title.trim().length > 0;
  const hasContent = title.trim() || description.trim();

  // Header options for the options menu
  const headerOptions: HeaderOption[] = [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="New Task"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        useOptionsMenu={true}
        options={headerOptions}
      />
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Section 1: Basic Info */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>1</Text>
              </View>
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle}>Basic Info</Text>
              </View>
            </View>

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
              />
              {hasContent && (
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

            {/* Description */}
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
              />
            </View>
            
            {/* Category Grid - only shown when expanded */}
            {hasContent && showCategoryPicker && (
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

          {/* Points Section - Inline with Basic Info when title is entered */}
          {title.trim() && (
            <View style={styles.pointsInlineCard}>
              <View style={styles.pointsInlineHeader}>
                <MaterialIcons name="stars" size={20} color="#F59E0B" />
                <Text style={styles.pointsInlineLabel}>Points</Text>
                {pointsLoading && (
                  <ActivityIndicator size="small" color="#6366F1" style={styles.pointsLoadingInline} />
                )}
              </View>
              <View style={styles.pointsInlineContent}>
                <Text style={styles.pointsInlineValue}>{currentPoints}</Text>
                <Text style={styles.pointsInlineUnit}>points</Text>
                </View>
                {pointsExplanation && (
                <Text style={styles.pointsInlineExplanation}>{pointsExplanation}</Text>
                )}
                {/* Points distribution info */}
              {rotationEnabled && selectedGroupId && selectedParticipants.length > 0 && (
                <View style={styles.pointsDistributionInline}>
                  <MaterialIcons name="rotate-right" size={14} color="#78350F" />
                  <Text style={styles.pointsDistributionInlineText}>
                    Rotation: Each person gets {currentPoints} full points when it's their turn
                    {selectedParticipants.length > 1 && ` (${selectedParticipants.length} members)`}
                  </Text>
                </View>
              )}
              {!rotationEnabled && assignmentType === 'multiple' && selectedParticipants.length > 0 && (
                <View style={styles.pointsDistributionInline}>
                  <MaterialIcons name="people" size={14} color="#78350F" />
                  <Text style={styles.pointsDistributionInlineText}>
                    {currentPoints} ÷ {selectedParticipants.length} = {pointsPerPerson} each
                    {bonusPointsPerPerson > 0 && ` (+${bonusPointsPerPerson} bonus)`}
                    </Text>
                  </View>
              )}
              {assignmentType === 'open' && !selectedParticipant && selectedParticipants.length === 0 && !rotationEnabled && (
                <View style={styles.pointsDistributionInline}>
                  <MaterialIcons name="bolt" size={14} color="#78350F" />
                  <Text style={styles.pointsDistributionInlineText}>
                      +{bonusPoints} bonus if unassigned = {totalPointsIfUnassigned} total
                    </Text>
                  </View>
              )}
            </View>
          )}

          {/* Section 2: Assignment */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>2</Text>
              </View>
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle}>Assignment</Text>
                <Text style={styles.sectionSubtitle}>Who should do this task?</Text>
              </View>
            </View>
            
            {/* Assignment Type */}
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

            {/* Assign To Section - Always show Select Members */}
            <View style={styles.assignmentSubsection}>
              <Text style={styles.assignmentSubsectionLabel}>
                {assignmentType === 'multiple' ? 'Select Members' : 'Select Member'}
              </Text>
              <ParticipantPicker
                selectedParticipants={
                  assignmentType === 'multiple' 
                    ? selectedParticipants 
                    : selectedParticipant ? [selectedParticipant] : []
                }
                onSelectionChange={(participants) => {
                  if (assignmentType === 'multiple') {
                    setSelectedParticipants(participants);
                  } else {
                    setSelectedParticipant(participants.length > 0 ? participants[0] : null);
                  }
                }}
                allowMultiple={assignmentType === 'multiple'}
                showGroups={true}
                showFriends={!selectedGroupId}
                groupId={selectedGroupId}
                initialGroupId={selectedGroupId || null}
                onGroupChange={(groupId) => {
                  setSelectedGroupId(groupId || undefined);
                  // Clear participants when group changes
                  if (groupId) {
                    setSelectedParticipant(null);
                    setSelectedParticipants([]);
                    setSelectedFriend(null);
                  }
                }}
              />
              {assignmentType === 'open' && (
                <View style={styles.bonusHint}>
                  <MaterialIcons name="info-outline" size={16} color="#6366F1" />
                  <Text style={styles.bonusHintText}>
                    Leave unassigned to earn +50% bonus points
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Section 3: Schedule */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>3</Text>
              </View>
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                <Text style={styles.sectionSubtitle}>When should this be done?</Text>
              </View>
            </View>

            {/* Due Date */}
            <View style={styles.scheduleItem}>
              <MaterialIcons name="event" size={20} color="#6366F1" style={styles.scheduleIcon} />
              <View style={styles.scheduleItemContent}>
                <View style={styles.dueDateRow}>
                  <Text style={styles.scheduleItemLabel}>Due Date</Text>
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
            />
                </View>
              </View>
          </View>

            {/* Reminder */}
            <View style={styles.scheduleItem}>
              <MaterialIcons name="notifications" size={20} color="#6366F1" style={styles.scheduleIcon} />
              <View style={styles.scheduleItemContent}>
                <View style={styles.scheduleItemHeader}>
                  <Text style={styles.scheduleItemLabel}>Reminder</Text>
              <TouchableOpacity
                style={styles.toggleSwitch}
                onPress={() => {
                  if (!dueDate) {
                    Alert.alert('Set Due Date', 'Please set a due date first to enable reminders');
                    return;
                  }
                  setReminderEnabled(!reminderEnabled);
                }}
                activeOpacity={0.7}
                disabled={!dueDate}
              >
                <View style={[
                  styles.toggleTrack, 
                  reminderEnabled && dueDate && styles.toggleTrackActive,
                  !dueDate && styles.toggleTrackDisabled
                ]}>
                  <View style={[
                    styles.toggleThumb, 
                    reminderEnabled && dueDate && styles.toggleThumbActive,
                    !dueDate && styles.toggleThumbDisabled
                  ]} />
                </View>
              </TouchableOpacity>
            </View>
            
            {!dueDate && (
                  <Text style={styles.scheduleItemHint}>Set a due date to enable reminders</Text>
            )}
            
            {reminderEnabled && dueDate && (
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
                      onPress={() => setReminderHoursBefore(hours)}
                      activeOpacity={0.7}
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
                </View>

            {/* Recurring */}
            <View style={styles.scheduleItem}>
              <MaterialIcons name="repeat" size={20} color="#6366F1" style={styles.scheduleIcon} />
              <View style={styles.scheduleItemContent}>
                <View style={styles.scheduleItemHeader}>
                  <Text style={styles.scheduleItemLabel}>Repeat</Text>
                <TouchableOpacity
                  style={styles.toggleSwitch}
                  onPress={() => {
                    if (!dueDate) {
                      Alert.alert('Set Due Date', 'Please set a due date first to enable recurring tasks');
                      return;
                    }
                    setIsRecurring(!isRecurring);
                    if (!isRecurring) {
                      // Set default to daily when enabling
                      setRecurrencePattern('daily');
                    } else {
                      // Clear when disabling
                      setRecurrencePattern(null);
                      setRecurrenceConfig(null);
                      setRecurrenceEndDate('');
                      setRecurrenceCount(null);
                      setRecurrenceEndType('never');
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={!dueDate}
                >
                  <View style={[
                    styles.toggleTrack, 
                    isRecurring && dueDate && styles.toggleTrackActive,
                    !dueDate && styles.toggleTrackDisabled
                  ]}>
                    <View style={[
                      styles.toggleThumb, 
                      isRecurring && dueDate && styles.toggleThumbActive,
                      !dueDate && styles.toggleThumbDisabled
                    ]} />
                  </View>
                </TouchableOpacity>
              </View>
              
              {!dueDate && (
                  <Text style={styles.scheduleItemHint}>Set a due date to enable recurring tasks</Text>
              )}
              
              {isRecurring && dueDate && (
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
                          // Reset config when changing pattern
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
                          setRecurrenceCount(10); // Default to 10 occurrences
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
            </View>

            {/* Rotation - Only for recurring group chores */}
            {selectedGroupId && !selectedFriend && isRecurring && (
              <View style={styles.scheduleItem}>
                <MaterialIcons name="rotate-right" size={20} color="#6366F1" style={styles.scheduleIcon} />
                <View style={styles.scheduleItemContent}>
                  <View style={styles.scheduleItemHeader}>
                    <View>
                      <Text style={styles.scheduleItemLabel}>Rotation</Text>
                      <Text style={styles.scheduleItemSubtext}>
                        Automatically rotate among group members
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
                    <Text style={styles.scheduleItemHint}>
                      Each occurrence will be assigned to the next person in rotation
                    </Text>
                  )}
                </View>
              </View>
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
            (!canSubmit || loading) && styles.fabDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="add-task" size={20} color="#FFFFFF" />
              <View style={styles.fabTextContainer}>
                <Text style={styles.fabText}>Create Task</Text>
                {assignmentType === 'open' && (
                  <Text style={styles.fabSubtext}>
                    {totalPointsIfUnassigned} points
                  </Text>
                )}
                {assignmentType === 'multiple' && selectedParticipants.length > 0 && (
                  <Text style={styles.fabSubtext}>
                    {selectedParticipants.length} assignee{selectedParticipants.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
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
  progressContainer: {
    marginBottom: 24,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  pointsInlineCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pointsInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pointsInlineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  pointsLoadingInline: {
    marginLeft: 'auto',
  },
  pointsInlineContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  pointsInlineValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#92400E',
  },
  pointsInlineUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#92400E',
  },
  pointsInlineExplanation: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pointsDistributionInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  pointsDistributionInlineText: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '500',
  },
  assignmentSubsection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  assignmentSubsectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  categorySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  scheduleIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  scheduleItemContent: {
    flex: 1,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scheduleItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  scheduleItemSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  scheduleItemHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  autoPointsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginBottom: 8,
    maxWidth: '100%',
  },
  pointsExplanationText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
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
  assignmentTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  assignmentTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    color: '#374151',
  },
  assignmentTypeTextSelected: {
    color: '#FFFFFF',
  },
  friendScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  friendChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  friendChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  friendChipTextSelected: {
    color: '#FFFFFF',
  },
  loadingIndicator: {
    marginVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 16,
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
  toggleTrackDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  toggleThumbDisabled: {
    backgroundColor: '#9CA3AF',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
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
});
