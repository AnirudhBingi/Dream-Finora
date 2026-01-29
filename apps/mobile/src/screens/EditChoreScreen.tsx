import React, { useState, useEffect, useRef, useMemo } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { DatePicker } from "../components/DatePicker";
import {
  ParticipantPicker,
  SelectedParticipant,
} from "../components/ParticipantPicker";
import { useAuth } from "../auth/authContext";
import {
  getChoreById,
  updateChore,
  Chore,
  UpdateChoreDto,
  calculateChorePoints,
  CalculatePointsResponse,
  ChoreAssignment,
} from "../api/choreApi";
import { getGroupById, GroupMember } from "../api/groupApi";
import { getFriends, Friend } from "../api/friendApi";
import { Header, HeaderOption } from "../components/Header";
import { Icon } from "../components/Icon";
import {
  getChoreCategoryIcon,
  getChoreCategoryMaterialIcon,
} from "../utils/choreCategoryIcons";
import { useTheme } from "../theme";
import { useDataFetch } from "../hooks/useDataFetch";

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
  "Bathroom Cleaning",
  "Kitchen Cleaning",
  "Vacuum",
  "Dusting",
  "Mopping",
  "Windows",
  "Deep Clean",

  // Cooking
  "Cooking",
  "Meal Prep",
  "Baking",
  "Grilling",

  // Shopping & Errands
  "Grocery Shopping",
  "Shopping",
  "Pickup/Delivery",
  "Post Office",
  "Bank",
  "Pharmacy",

  // Maintenance
  "Home Maintenance",
  "Plumbing",
  "Electrical",
  "Painting",
  "Carpentry",

  // Laundry
  "Laundry",
  "Folding",
  "Ironing",

  // Trash & Recycling
  "Trash & Recycling",
  "Compost",

  // Pet Care
  "Pet Care",
  "Dog Walk",
  "Pet Grooming",

  // Yard & Garden
  "Yard Work",
  "Mowing",
  "Gardening",
  "Snow Removal",
  "Raking",

  // Organization
  "Organization",
  "Packing",
  "Unpacking",

  // Childcare
  "Childcare",
  "School",

  // Car & Vehicle
  "Car Wash",
  "Car Maintenance",

  // Health & Fitness
  "Exercise",
  "Appointment",

  // Other
  "Other",
];

// Enhanced category keyword mappings for auto-suggestion (same as CreateChoreScreen)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Bathroom Cleaning": [
    "bathroom",
    "toilet",
    "shower",
    "sink",
    "mirror",
    "bath",
    "restroom",
  ],
  "Kitchen Cleaning": [
    "kitchen",
    "dishes",
    "dishwasher",
    "sink",
    "counter",
    "stove",
    "oven",
    "fridge",
    "microwave",
  ],
  Vacuum: ["vacuum", "vacuuming", "carpet", "rug", "floor"],
  Dusting: ["dust", "dusting", "shelves", "furniture", "surfaces"],
  Mopping: ["mop", "mopping", "floor", "tile", "hardwood"],
  Windows: ["window", "windows", "glass", "clean windows"],
  "Deep Clean": ["deep clean", "spring clean", "thorough", "detailed"],
  Cooking: [
    "cook",
    "cooking",
    "meal",
    "dinner",
    "lunch",
    "breakfast",
    "recipe",
    "prepare",
    "food",
  ],
  "Meal Prep": ["meal prep", "prep", "preparation", "batch cooking"],
  Baking: ["bake", "baking", "cake", "bread", "cookies", "pastry"],
  Grilling: ["grill", "grilling", "bbq", "barbecue", "outdoor cooking"],
  "Grocery Shopping": ["grocery", "groceries", "supermarket", "food shopping"],
  Shopping: ["shop", "store", "buy", "purchase", "mall", "retail"],
  "Pickup/Delivery": ["pickup", "delivery", "pick up", "drop off", "package"],
  "Post Office": ["post office", "mail", "postal", "package", "letter"],
  Bank: ["bank", "banking", "atm", "deposit", "withdrawal"],
  Pharmacy: ["pharmacy", "prescription", "medicine", "drugstore"],
  "Home Maintenance": [
    "maintenance",
    "repair",
    "fix",
    "broken",
    "install",
    "replace",
  ],
  Plumbing: ["plumbing", "plumber", "pipe", "faucet", "leak", "drain"],
  Electrical: ["electrical", "electric", "wiring", "outlet", "switch", "light"],
  Painting: ["paint", "painting", "brush", "wall", "room"],
  Carpentry: ["carpentry", "wood", "saw", "drill", "furniture", "cabinet"],
  Laundry: ["laundry", "wash", "washing", "clothes", "clothing"],
  Folding: ["fold", "folding", "clothes", "laundry"],
  Ironing: ["iron", "ironing", "press", "wrinkles"],
  "Trash & Recycling": [
    "trash",
    "garbage",
    "recycle",
    "waste",
    "bin",
    "disposal",
    "rubbish",
  ],
  Compost: ["compost", "composting", "organic waste"],
  "Pet Care": ["pet", "animal", "feed", "feeding"],
  "Dog Walk": ["walk", "dog walk", "walking", "dog", "puppy"],
  "Pet Grooming": ["groom", "grooming", "bath", "brush", "pet bath"],
  "Yard Work": ["yard", "outdoor", "outside"],
  Mowing: ["mow", "mowing", "lawn", "grass", "mower"],
  Gardening: [
    "garden",
    "gardening",
    "plant",
    "planting",
    "flower",
    "vegetable",
  ],
  "Snow Removal": ["snow", "shovel", "snow removal", "snow shoveling"],
  Raking: ["rake", "raking", "leaves", "leaf"],
  Organization: [
    "organize",
    "organization",
    "sort",
    "arrange",
    "tidy",
    "declutter",
  ],
  Packing: ["pack", "packing", "box", "boxes", "move"],
  Unpacking: ["unpack", "unpacking", "unbox", "unboxing"],
  Childcare: ["childcare", "babysitting", "kids", "children", "child"],
  School: ["school", "homework", "project", "assignment"],
  "Car Wash": ["car wash", "wash car", "vehicle wash"],
  "Car Maintenance": [
    "car maintenance",
    "vehicle maintenance",
    "oil change",
    "tire",
    "car repair",
  ],
  Exercise: ["exercise", "workout", "gym", "fitness", "run", "jog"],
  Appointment: ["appointment", "doctor", "dentist", "meeting"],
  Other: ["other", "misc", "miscellaneous"],
};

// Auto-suggest category based on title and description
function suggestChoreCategory(
  title: string,
  description: string,
): string | null {
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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [points, setPoints] = useState(10);
  const [calculatedPoints, setCalculatedPoints] = useState<number | null>(null);
  const [pointsExplanation, setPointsExplanation] = useState<string>("");
  const [pointsLoading, setPointsLoading] = useState(false);
  const [useManualPoints, setUseManualPoints] = useState(false);
  const [assignmentType, setAssignmentType] = useState<
    "single" | "multiple" | "open"
  >("single");
  const [selectedParticipant, setSelectedParticipant] =
    useState<SelectedParticipant | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<
    SelectedParticipant[]
  >([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHoursBefore, setReminderHoursBefore] = useState<number | null>(
    24,
  );
  // Recurring chore state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<
    "daily" | "weekly" | "monthly" | "custom" | null
  >(null);
  const [recurrenceConfig, setRecurrenceConfig] = useState<{
    daysOfWeek?: number[];
    interval?: number;
    dayOfMonth?: number;
    weekOfMonth?: number;
    dayOfWeek?: number;
  } | null>(null);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceCount, setRecurrenceCount] = useState<number | null>(null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<
    "never" | "date" | "count"
  >("never");
  // Rotation state
  const [rotationEnabled, setRotationEnabled] = useState(false);
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
  const categorySuggestTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pointsCalculationTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isAutoDetectedRef = useRef(false);
  const categoryRef = useRef("");

  const {
    data: chore,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<Chore>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getChoreById(token, choreId);
    },
    immediate: true,
    deps: [token, choreId],
    transform: (data: Chore) => {
      setTitle(data.title);
      setDescription(data.description || "");
      setPoints(data.points);

      // Set category from chore data or auto-detect
      if (data.category) {
        setCategory(data.category);
        setIsAutoDetected(false); // User-set category
      } else {
        // Auto-detect category from existing title/description
        const suggestedCategory = suggestChoreCategory(
          data.title,
          data.description || "",
        );
        if (suggestedCategory) {
          setCategory(suggestedCategory);
          setIsAutoDetected(true);
        }
      }

      // Set assigned participant if exists
      if (data.assignedTo && data.assignedToUser) {
        setSelectedParticipant({
          userId: data.assignedTo,
          type: data.groupId ? "group-member" : "friend",
          name:
            data.assignedToUser.profile?.displayName ||
            data.assignedToUser.email ||
            "Unknown",
          email: data.assignedToUser.email || "",
        });
      }

      setDueDate(
        data.dueDate ? new Date(data.dueDate).toISOString().split("T")[0] : "",
      );
      setReminderEnabled(data.reminderEnabled || false);
      setReminderHoursBefore(data.reminderHoursBefore || 24);
      // Load recurring data
      setIsRecurring(data.isRecurring || false);
      setRecurrencePattern(data.recurrencePattern || null);
      setRecurrenceConfig(data.recurrenceConfig || null);
      if (data.recurrenceEndDate) {
        setRecurrenceEndDate(
          new Date(data.recurrenceEndDate).toISOString().split("T")[0],
        );
        setRecurrenceEndType("date");
      } else if (data.recurrenceCount) {
        setRecurrenceCount(data.recurrenceCount);
        setRecurrenceEndType("count");
      } else {
        setRecurrenceEndType("never");
      }
      // Load rotation data
      setRotationEnabled(data.rotationEnabled || false);
      setUseManualPoints(false); // Default to auto-calculated

      // Set assignment type from chore data
      const choreAssignmentType = data.assignmentType || "single";
      setAssignmentType(choreAssignmentType);

      // Set selected group or friend
      if (data.groupId) {
        setSelectedGroupId(data.groupId);
      } else if (data.friendId) {
        // Will load friends and set selected friend below
      }

      // Handle multiple assignments
      if (data.assignments && data.assignments.length > 0) {
        const assignmentParticipants: SelectedParticipant[] = data.assignments
          .filter((a: ChoreAssignment) => a.user)
          .map((a: ChoreAssignment) => ({
            userId: a.userId,
            type: data.groupId ? "group-member" : "friend",
            name: a.user?.profile?.displayName || a.user?.email || "Unknown",
            email: a.user?.email || "",
          }));
        setSelectedParticipants(assignmentParticipants);
        if (assignmentParticipants.length === 1) {
          setSelectedParticipant(assignmentParticipants[0]);
        }
      } else if (data.assignedTo && data.assignedToUser) {
        // Single assignment
        setSelectedParticipant({
          userId: data.assignedTo,
          type: data.groupId ? "group-member" : "friend",
          name:
            data.assignedToUser.profile?.displayName ||
            data.assignedToUser.email ||
            "Unknown",
          email: data.assignedToUser.email || "",
        });
      }

      // Load members if it's a group chore
      if (data.groupId && token) {
        getGroupById(token, data.groupId)
          .then((groupData) => {
            setMembers(groupData.members || []);
          })
          .catch((err) => {
            console.error("Failed to load members:", err);
          });
      }

      // Load friends if it's a friend chore or if no group
      if ((data.friendId || !data.groupId) && token) {
        setLoadingFriends(true);
        getFriends(token)
          .then((friendsList) => {
            const acceptedFriends = friendsList.filter(
              (f) => f.status === "accepted",
            );
            setFriends(acceptedFriends);

            if (data.friendId) {
              const friend = acceptedFriends.find(
                (f) => f.friendId === data.friendId,
              );
              if (friend) {
                setSelectedFriend(friend);
              }
            }
          })
          .catch((err) => {
            console.error("Failed to load friends:", err);
          })
          .finally(() => {
            setLoadingFriends(false);
          });
      }

      return data;
    },
  });

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error || "Failed to load chore");
      onBack();
    }
  }, [error]);

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
        console.log("Category suggestion failed:", err);
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
    if (!token || !title.trim() || chore?.status === "completed") {
      return;
    }

    if (pointsCalculationTimeoutRef.current) {
      clearTimeout(pointsCalculationTimeoutRef.current);
    }

    pointsCalculationTimeoutRef.current = setTimeout(async () => {
      if (!token || !title.trim() || chore?.status === "completed") return;

      try {
        setPointsLoading(true);
        const result: CalculatePointsResponse = await calculateChorePoints(
          token,
          {
            category: category || undefined,
            title: title.trim(),
            description: description.trim() || undefined,
          },
        );
        setCalculatedPoints(result.points);
        setPointsExplanation(result.explanation);
        // Auto-update if using auto mode
        if (!useManualPoints) {
          setPoints(result.points);
        }
      } catch (err) {
        console.error("Failed to calculate points:", err);
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
      Alert.alert("Error", "Please enter a task title");
      titleInputRef.current?.focus();
      return;
    }

    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    if (chore?.status === "completed") {
      Alert.alert("Error", "Cannot edit a completed task");
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
        reminderHoursBefore:
          reminderEnabled && reminderHoursBefore && dueDate
            ? reminderHoursBefore
            : undefined,
        // Recurring fields
        isRecurring: isRecurring,
        recurrencePattern: recurrencePattern || undefined,
        recurrenceConfig: recurrenceConfig || undefined,
        recurrenceEndDate:
          recurrenceEndType === "date"
            ? recurrenceEndDate || undefined
            : undefined,
        recurrenceCount:
          recurrenceEndType === "count"
            ? recurrenceCount || undefined
            : undefined,
        // Rotation fields
        rotationEnabled:
          rotationEnabled && selectedGroupId ? rotationEnabled : undefined,
        rotationType:
          rotationEnabled && selectedGroupId ? "round-robin" : undefined,
      };

      await updateChore(token, choreId, data);

      Alert.alert("Success", "Task updated successfully!", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update task",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!chore) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit =
    chore.createdBy === user?.id ||
    (chore.groupId && (members || []).some((m) => m.userId === user?.id));

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
          <MaterialIcons
            name="lock-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>
            You don't have permission to edit this task
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPoints = useManualPoints ? points : calculatedPoints || points;
  const bonusPoints = Math.round(currentPoints * 0.5);
  const totalPointsIfUnassigned = currentPoints + bonusPoints;

  // For multiple assignments, points are divided equally
  const pointsPerPerson =
    selectedParticipants.length > 0
      ? Math.round(currentPoints / selectedParticipants.length)
      : currentPoints;
  const bonusPointsPerPerson = Math.round(pointsPerPerson * 0.5);
  const totalPointsPerPerson = pointsPerPerson + bonusPointsPerPerson;
  const canSubmit = title.trim().length > 0 && chore.status !== "completed";
  const hasContent = title.trim() || description.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Task"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        useOptionsMenu={true}
        options={headerOptions}
      />
      {chore.status === "completed" && (
        <View style={styles.completedBanner}>
          <MaterialIcons
            name="check-circle"
            size={20}
            color={theme.colors.success}
          />
          <Text style={styles.completedBannerText}>
            This task is completed and cannot be edited
          </Text>
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
                  color={
                    isAutoDetected ? theme.colors.success : theme.colors.primary
                  }
                  style={styles.titleIcon}
                />
              ) : (
                <MaterialIcons
                  name="task"
                  size={32}
                  color={theme.colors.textTertiary}
                  style={styles.titleIcon}
                />
              )}
              <TextInput
                ref={titleInputRef}
                style={styles.titleInput}
                placeholder="What needs to be done?"
                placeholderTextColor={theme.colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => descriptionInputRef.current?.focus()}
                editable={chore.status !== "completed"}
              />
              {hasContent && chore.status !== "completed" && (
                <TouchableOpacity
                  style={styles.categoryExpandButton}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={showCategoryPicker ? "expand-less" : "expand-more"}
                    size={24}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
            {category && hasContent && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{category}</Text>
                {isAutoDetected && (
                  <MaterialIcons
                    name="auto-awesome"
                    size={14}
                    color={theme.colors.success}
                    style={styles.autoIcon}
                  />
                )}
              </View>
            )}
          </View>

          {/* Description Section */}
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <MaterialIcons
                name="description"
                size={20}
                color={theme.colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                ref={descriptionInputRef}
                style={styles.descriptionInput}
                placeholder="Add details (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                editable={chore.status !== "completed"}
              />
            </View>

            {/* Category Grid - only shown when expanded */}
            {hasContent &&
              showCategoryPicker &&
              chore.status !== "completed" && (
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
                          isAutoDetected &&
                            category === cat &&
                            styles.categoryChipAutoDetected,
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
                          color={
                            category === cat
                              ? theme.colors.white
                              : theme.colors.primary
                          }
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
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color={theme.colors.white}
                            />
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
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                      style={styles.pointsLoading}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.manualToggle}
                    onPress={() =>
                      !chore || chore.status !== "completed"
                        ? setUseManualPoints(!useManualPoints)
                        : undefined
                    }
                    activeOpacity={chore?.status === "completed" ? 1 : 0.7}
                    disabled={chore?.status === "completed"}
                  >
                    <MaterialIcons
                      name={useManualPoints ? "edit" : "auto-awesome"}
                      size={18}
                      color={
                        useManualPoints
                          ? theme.colors.primary
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.manualToggleText,
                        useManualPoints && styles.manualToggleTextActive,
                      ]}
                    >
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
                          chore?.status === "completed" &&
                            styles.pointsChipDisabled,
                        ]}
                        onPress={() => {
                          if (chore?.status !== "completed") {
                            setPoints(pts);
                          }
                        }}
                        activeOpacity={chore?.status === "completed" ? 1 : 0.7}
                        disabled={chore?.status === "completed"}
                      >
                        <MaterialIcons
                          name="stars"
                          size={18}
                          color={
                            points === pts
                              ? theme.colors.white
                              : theme.colors.warning
                          }
                          style={styles.pointsIcon}
                        />
                        <Text
                          style={[
                            styles.pointsChipText,
                            points === pts && styles.pointsChipTextSelected,
                            chore?.status === "completed" &&
                              styles.pointsChipTextDisabled,
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
                        <MaterialIcons
                          name="stars"
                          size={16}
                          color={theme.colors.warning}
                        />
                        <Text style={styles.pointsValue}>{currentPoints}</Text>
                      </View>
                    </View>
                    {assignmentType === "multiple" &&
                    selectedParticipants.length > 0 ? (
                      <View style={styles.pointsDistributionInfo}>
                        <MaterialIcons
                          name="people"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.pointsDistributionText}>
                          {currentPoints} points ÷ {selectedParticipants.length}{" "}
                          people = {pointsPerPerson} pts each
                        </Text>
                        {bonusPointsPerPerson > 0 && (
                          <Text style={styles.pointsDistributionSubtext}>
                            +{bonusPointsPerPerson} bonus each ={" "}
                            {totalPointsPerPerson} total per person
                          </Text>
                        )}
                      </View>
                    ) : !selectedParticipant &&
                      selectedParticipants.length === 0 ? (
                      <View style={styles.bonusInfo}>
                        <MaterialIcons
                          name="bolt"
                          size={16}
                          color={theme.colors.success}
                        />
                        <Text style={styles.bonusText}>
                          +{bonusPoints} bonus if unassigned ={" "}
                          {totalPointsIfUnassigned} total
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                // Auto-calculated Points Display
                <View style={styles.autoPointsContainer}>
                  <View style={styles.autoPointsDisplay}>
                    <MaterialIcons
                      name="stars"
                      size={24}
                      color={theme.colors.warning}
                    />
                    <Text style={styles.autoPointsValue}>{points}</Text>
                    <Text style={styles.autoPointsLabel}>points</Text>
                  </View>

                  {pointsExplanation && (
                    <View style={styles.pointsExplanationContainer}>
                      <MaterialIcons
                        name="info-outline"
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.pointsExplanationText}>
                        {pointsExplanation}
                      </Text>
                    </View>
                  )}

                  {/* Points distribution info */}
                  {assignmentType === "multiple" &&
                  selectedParticipants.length > 0 ? (
                    <View style={styles.pointsDistributionInfo}>
                      <MaterialIcons
                        name="people"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.pointsDistributionText}>
                        {currentPoints} points ÷ {selectedParticipants.length}{" "}
                        people = {pointsPerPerson} pts each
                      </Text>
                      {bonusPointsPerPerson > 0 && (
                        <Text style={styles.pointsDistributionSubtext}>
                          +{bonusPointsPerPerson} bonus each ={" "}
                          {totalPointsPerPerson} total per person
                        </Text>
                      )}
                    </View>
                  ) : !selectedParticipant &&
                    selectedParticipants.length === 0 ? (
                    <View style={styles.bonusInfo}>
                      <MaterialIcons
                        name="bolt"
                        size={16}
                        color={theme.colors.success}
                      />
                      <Text style={styles.bonusText}>
                        +{bonusPoints} bonus if unassigned ={" "}
                        {totalPointsIfUnassigned} total
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          )}

          {/* Assignment Type Section */}
          {chore && chore.status !== "completed" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Assignment Type</Text>
              <View style={styles.assignmentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.assignmentTypeOption,
                    assignmentType === "open" &&
                      styles.assignmentTypeOptionSelected,
                  ]}
                  onPress={() => {
                    setAssignmentType("open");
                    setSelectedParticipant(null);
                    setSelectedParticipants([]);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="public"
                    size={20}
                    color={
                      assignmentType === "open"
                        ? theme.colors.white
                        : theme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === "open" &&
                        styles.assignmentTypeTextSelected,
                    ]}
                  >
                    Open
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.assignmentTypeOption,
                    assignmentType === "single" &&
                      styles.assignmentTypeOptionSelected,
                  ]}
                  onPress={() => {
                    setAssignmentType("single");
                    setSelectedParticipants([]);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={
                      assignmentType === "single"
                        ? theme.colors.white
                        : theme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === "single" &&
                        styles.assignmentTypeTextSelected,
                    ]}
                  >
                    Single
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.assignmentTypeOption,
                    assignmentType === "multiple" &&
                      styles.assignmentTypeOptionSelected,
                  ]}
                  onPress={() => {
                    setAssignmentType("multiple");
                    setSelectedParticipant(null);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="people"
                    size={20}
                    color={
                      assignmentType === "multiple"
                        ? theme.colors.white
                        : theme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === "multiple" &&
                        styles.assignmentTypeTextSelected,
                    ]}
                  >
                    Multiple
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Assign To Section */}
          {assignmentType !== "open" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {assignmentType === "multiple"
                  ? "Assign To (Multiple)"
                  : "Assign To"}
              </Text>
              {chore && chore.status === "completed" ? (
                <View style={styles.readOnlyField}>
                  {assignmentType === "multiple" &&
                  selectedParticipants.length > 0 ? (
                    <Text style={styles.readOnlyText}>
                      {selectedParticipants.map((p) => p.name).join(", ")}
                    </Text>
                  ) : (
                    <Text style={styles.readOnlyText}>
                      {selectedParticipant
                        ? selectedParticipant.name
                        : "Unassigned"}
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <ParticipantPicker
                    selectedParticipants={
                      assignmentType === "multiple"
                        ? selectedParticipants
                        : selectedParticipant
                          ? [selectedParticipant]
                          : []
                    }
                    onSelectionChange={(participants) => {
                      if (assignmentType === "multiple") {
                        setSelectedParticipants(participants);
                      } else {
                        setSelectedParticipant(
                          participants.length > 0 ? participants[0] : null,
                        );
                      }
                    }}
                    allowMultiple={assignmentType === "multiple"}
                    showGroups={true}
                    showFriends={!chore?.groupId && !selectedGroupId}
                    groupId={chore?.groupId || selectedGroupId}
                    initialGroupId={chore?.groupId || selectedGroupId || null}
                  />
                  {!selectedParticipant &&
                    selectedParticipants.length === 0 && (
                      <View style={styles.bonusHint}>
                        <MaterialIcons
                          name="info-outline"
                          size={16}
                          color={theme.colors.primary}
                        />
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
              disabled={chore.status === "completed"}
            />
          </View>

          {/* Reminder Section - Only show if due date is set */}
          {dueDate && (
            <View style={styles.card}>
              <View style={styles.reminderHeader}>
                <Text style={styles.cardTitle}>Reminder</Text>
                <TouchableOpacity
                  style={styles.toggleSwitch}
                  onPress={() =>
                    !chore || chore.status !== "completed"
                      ? setReminderEnabled(!reminderEnabled)
                      : undefined
                  }
                  activeOpacity={0.7}
                  disabled={chore?.status === "completed"}
                >
                  <View
                    style={[
                      styles.toggleTrack,
                      reminderEnabled && styles.toggleTrackActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        reminderEnabled && styles.toggleThumbActive,
                      ]}
                    />
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
                          reminderHoursBefore === hours &&
                            styles.reminderHourChipSelected,
                        ]}
                        onPress={() =>
                          !chore || chore.status !== "completed"
                            ? setReminderHoursBefore(hours)
                            : undefined
                        }
                        activeOpacity={0.7}
                        disabled={chore?.status === "completed"}
                      >
                        <Text
                          style={[
                            styles.reminderHourText,
                            reminderHoursBefore === hours &&
                              styles.reminderHourTextSelected,
                          ]}
                        >
                          {hours}h
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.reminderHint}>before due date</Text>
                </View>
              )}
            </View>
          )}

          {/* Recurring Section - Only show if due date is set and chore is not completed */}
          {dueDate && chore && chore.status !== "completed" && (
            <View style={styles.card}>
              <View style={styles.reminderHeader}>
                <View style={styles.recurringHeaderLeft}>
                  <MaterialIcons
                    name="repeat"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.cardTitle}>Repeat</Text>
                </View>
                <TouchableOpacity
                  style={styles.toggleSwitch}
                  onPress={() => {
                    setIsRecurring(!isRecurring);
                    if (!isRecurring) {
                      setRecurrencePattern("daily");
                    } else {
                      setRecurrencePattern(null);
                      setRecurrenceConfig(null);
                      setRecurrenceEndDate("");
                      setRecurrenceCount(null);
                      setRecurrenceEndType("never");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.toggleTrack,
                      isRecurring && styles.toggleTrackActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        isRecurring && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {isRecurring && (
                <View style={styles.recurringOptions}>
                  {/* Pattern Selection */}
                  <Text style={styles.recurringLabel}>Repeat every</Text>
                  <View style={styles.recurrencePatternContainer}>
                    {(["daily", "weekly", "monthly"] as const).map(
                      (pattern) => (
                        <TouchableOpacity
                          key={pattern}
                          style={[
                            styles.recurrencePatternChip,
                            recurrencePattern === pattern &&
                              styles.recurrencePatternChipSelected,
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
                              recurrencePattern === pattern &&
                                styles.recurrencePatternTextSelected,
                            ]}
                          >
                            {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>

                  {/* Weekly: Days of week selection */}
                  {recurrencePattern === "weekly" && (
                    <View style={styles.weeklyConfigContainer}>
                      <Text style={styles.recurringSubLabel}>On days</Text>
                      <View style={styles.daysOfWeekContainer}>
                        {[
                          { label: "S", value: 0 },
                          { label: "M", value: 1 },
                          { label: "T", value: 2 },
                          { label: "W", value: 3 },
                          { label: "T", value: 4 },
                          { label: "F", value: 5 },
                          { label: "S", value: 6 },
                        ].map((day) => {
                          const isSelected =
                            recurrenceConfig?.daysOfWeek?.includes(day.value) ||
                            false;
                          return (
                            <TouchableOpacity
                              key={day.value}
                              style={[
                                styles.dayOfWeekChip,
                                isSelected && styles.dayOfWeekChipSelected,
                              ]}
                              onPress={() => {
                                const currentDays =
                                  recurrenceConfig?.daysOfWeek || [];
                                const newDays = isSelected
                                  ? currentDays.filter((d) => d !== day.value)
                                  : [...currentDays, day.value];
                                setRecurrenceConfig({
                                  ...recurrenceConfig,
                                  daysOfWeek:
                                    newDays.length > 0 ? newDays : undefined,
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
                          recurrenceEndType === "never" &&
                            styles.recurringEndOptionSelected,
                        ]}
                        onPress={() => {
                          setRecurrenceEndType("never");
                          setRecurrenceEndDate("");
                          setRecurrenceCount(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.recurringEndOptionText,
                            recurrenceEndType === "never" &&
                              styles.recurringEndOptionTextSelected,
                          ]}
                        >
                          Never
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.recurringEndOption,
                          recurrenceEndType === "date" &&
                            styles.recurringEndOptionSelected,
                        ]}
                        onPress={() => {
                          setRecurrenceEndType("date");
                          setRecurrenceCount(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.recurringEndOptionText,
                            recurrenceEndType === "date" &&
                              styles.recurringEndOptionTextSelected,
                          ]}
                        >
                          Date
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.recurringEndOption,
                          recurrenceEndType === "count" &&
                            styles.recurringEndOptionSelected,
                        ]}
                        onPress={() => {
                          setRecurrenceEndType("count");
                          setRecurrenceEndDate("");
                          setRecurrenceCount(10);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.recurringEndOptionText,
                            recurrenceEndType === "count" &&
                              styles.recurringEndOptionTextSelected,
                          ]}
                        >
                          Count
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* End Date Picker */}
                  {recurrenceEndType === "date" && (
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
                  {recurrenceEndType === "count" && (
                    <View style={styles.recurringCountContainer}>
                      <TextInput
                        style={styles.recurringCountInput}
                        value={recurrenceCount?.toString() || ""}
                        onChangeText={(text) => {
                          const num = parseInt(text, 10);
                          setRecurrenceCount(isNaN(num) ? null : num);
                        }}
                        placeholder="Number of occurrences"
                        keyboardType="numeric"
                      />
                      <Text style={styles.recurringCountLabel}>
                        occurrences
                      </Text>
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
                <MaterialIcons
                  name="rotate-right"
                  size={20}
                  color={theme.colors.primary}
                  style={styles.inputIcon}
                />
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
                  <View
                    style={[
                      styles.toggleTrack,
                      rotationEnabled && styles.toggleTrackActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        rotationEnabled && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {rotationEnabled && (
                <View style={styles.hintContainer}>
                  <MaterialIcons
                    name="info-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
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
      {chore.status !== "completed" && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, (!canSubmit || saving) && styles.fabDisabled]}
            onPress={handleSave}
            disabled={!canSubmit || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <MaterialIcons
                  name="save"
                  size={20}
                  color={theme.colors.white}
                />
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

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100, // Space for floating button
    },
    content: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      gap: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      textAlign: "center",
      fontWeight: theme.typography.fontWeight.medium,
    },
    completedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.successBackground,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.successBackground,
    },
    completedBannerText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
    },
    heroSection: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
      paddingTop: theme.spacing.sm,
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      paddingHorizontal: theme.spacing.base,
      position: "relative",
    },
    titleIcon: {
      marginRight: theme.spacing.md,
    },
    categoryExpandButton: {
      marginLeft: theme.spacing.sm,
      padding: theme.spacing.xs,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 16,
      alignSelf: "center",
      gap: 6,
    },
    categoryBadgeText: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    autoIcon: {
      marginLeft: 2,
    },
    titleInput: {
      flex: 1,
      fontSize: 32,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      padding: 0,
      margin: 0,
      textAlign: "left",
      includeFontPadding: false,
      textAlignVertical: "center",
      minHeight: 48,
    },
    card: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      marginHorizontal: 0,
      ...theme.shadows.sm,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.base,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.base,
      paddingTop: 14,
      paddingBottom: 14,
      backgroundColor: theme.colors.backgroundSecondary,
      minHeight: 52,
    },
    inputRowContent: {
      flex: 1,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    helperText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    hintContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
    },
    hintText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    inputIcon: {
      marginRight: theme.spacing.md,
      marginTop: 2,
    },
    descriptionInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
      minHeight: 80,
      maxHeight: 120,
    },
    categorySection: {
      marginTop: theme.spacing.base,
      paddingTop: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    categoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    categoryLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    autoDetectedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.successBackground,
      borderRadius: 12,
    },
    autoDetectedText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.success,
    },
    categoryScroll: {
      marginTop: 0,
      maxHeight: 300,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingBottom: 8,
    },
    categoryChip: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 2,
      borderColor: "transparent",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      width: "31%", // 3 columns with gaps
      minHeight: 80,
      position: "relative",
    },
    categoryChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryChipAutoDetected: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    categoryChipDisabled: {
      opacity: 0.5,
    },
    categoryChipText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      textAlign: "center",
      lineHeight: 16,
    },
    categoryChipTextSelected: {
      color: theme.colors.textInverse,
    },
    categoryChipTextDisabled: {
      color: theme.colors.textTertiary,
    },
    checkIconContainer: {
      position: "absolute",
      top: theme.spacing.xs,
      right: theme.spacing.xs,
    },
    pointsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.base,
    },
    pointsHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    pointsLoading: {
      marginLeft: theme.spacing.sm,
    },
    manualToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 8,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    manualToggleText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    manualToggleTextActive: {
      color: theme.colors.primary,
    },
    autoPointsContainer: {
      alignItems: "center",
    },
    assignmentTypeContainer: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    assignmentTypeOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 2,
      borderColor: "transparent",
    },
    assignmentTypeOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    assignmentTypeText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    assignmentTypeTextSelected: {
      color: theme.colors.textInverse,
    },
    calculatedPointsSuggestion: {
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: 12,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
    },
    calculatedPointsInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    calculatedPointsText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    calculatedPointsExplanation: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      lineHeight: 16,
    },
    useCalculatedButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      alignSelf: "flex-start",
    },
    useCalculatedButtonText: {
      color: theme.colors.textInverse,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    autoPointsDisplay: {
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    autoPointsValue: {
      fontSize: 32,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.warning,
    },
    autoPointsLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    pointsExplanationContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.backgroundTertiary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 8,
      marginTop: theme.spacing.md,
      maxWidth: "100%",
    },
    pointsExplanationText: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    manualOverrideButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 8,
      alignSelf: "center",
    },
    manualOverrideButtonText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pointsScroll: {
      marginHorizontal: -theme.spacing.base,
      paddingHorizontal: theme.spacing.base,
    },
    pointsContainer: {
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.base,
    },
    pointsChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      marginRight: theme.spacing.sm,
      borderWidth: 2,
      borderColor: "transparent",
      minHeight: 44,
      gap: 6,
    },
    pointsChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pointsChipDisabled: {
      opacity: 0.5,
    },
    pointsIcon: {
      marginRight: 2,
    },
    pointsChipText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    pointsChipTextSelected: {
      color: theme.colors.textInverse,
    },
    pointsChipTextDisabled: {
      color: theme.colors.textTertiary,
    },
    pointsInfo: {
      marginTop: theme.spacing.base,
      paddingTop: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    pointsInfoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pointsInfoLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    pointsValueContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    pointsValue: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.warning,
    },
    bonusInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: 10,
      backgroundColor: theme.colors.successBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.successBackground,
    },
    bonusText: {
      fontSize: 13,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pointsDistributionInfo: {
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
    },
    pointsDistributionText: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginTop: theme.spacing.xs,
    },
    pointsDistributionSubtext: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    bonusHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.base,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: 8,
    },
    bonusHintText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
    },
    readOnlyField: {
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: 14,
      backgroundColor: theme.colors.backgroundTertiary,
      minHeight: 52,
      justifyContent: "center",
    },
    readOnlyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    bottomSpacer: {
      height: 20,
    },
    reminderHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    toggleSwitch: {
      padding: theme.spacing.xs,
    },
    toggleTrack: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.borderDark,
      justifyContent: "center",
      paddingHorizontal: 2,
    },
    toggleTrackActive: {
      backgroundColor: theme.colors.primary,
    },
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      ...theme.shadows.sm,
    },
    toggleThumbActive: {
      transform: [{ translateX: 20 }],
    },
    reminderOptions: {
      marginTop: theme.spacing.sm,
    },
    reminderLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    reminderHoursContainer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
      marginBottom: theme.spacing.sm,
    },
    reminderHourChip: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 20,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderWidth: 2,
      borderColor: "transparent",
    },
    reminderHourChipSelected: {
      backgroundColor: theme.colors.primaryBackground,
      borderColor: theme.colors.primary,
    },
    reminderHourText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    reminderHourTextSelected: {
      color: theme.colors.primary,
    },
    reminderHint: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
    },
    // Recurring styles
    recurringHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    recurringOptions: {
      marginTop: theme.spacing.base,
      gap: theme.spacing.base,
    },
    recurringLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.sm,
    },
    recurringSubLabel: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    recurrencePatternContainer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
    },
    recurrencePatternChip: {
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 2,
      borderColor: "transparent",
    },
    recurrencePatternChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    recurrencePatternText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    recurrencePatternTextSelected: {
      color: theme.colors.textInverse,
    },
    weeklyConfigContainer: {
      marginTop: theme.spacing.sm,
    },
    daysOfWeekContainer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    dayOfWeekChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    dayOfWeekChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    dayOfWeekText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    dayOfWeekTextSelected: {
      color: theme.colors.textInverse,
    },
    recurringEndContainer: {
      marginTop: theme.spacing.sm,
    },
    recurringEndOptions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    recurringEndOption: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 2,
      borderColor: "transparent",
    },
    recurringEndOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    recurringEndOptionText: {
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
    },
    recurringEndOptionTextSelected: {
      color: theme.colors.textInverse,
    },
    recurringEndDateContainer: {
      marginTop: theme.spacing.md,
    },
    recurringCountContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    recurringCountInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: 8,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
    },
    recurringCountLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    fabContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      ...theme.shadows.lg,
    },
    fab: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      paddingVertical: theme.spacing.base,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 56,
      ...theme.shadows.button,
    },
    fabDisabled: {
      opacity: 0.5,
    },
    fabTextContainer: {
      alignItems: "center",
    },
    fabText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    fabSubtext: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.normal,
      opacity: 0.9,
      marginTop: 2,
    },
  });
}
