import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/authContext";
import {
  getBudgetById,
  updateBudget,
  getCategories,
  suggestCategory,
  UpdateBudgetDto,
  Budget,
  Categories,
} from "../api/financeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Icon } from "../components/Icon";
import { normalizeCategoryName } from "../utils/categoryIcons";
import { DatePicker } from "../components/DatePicker";
import { Header } from "../components/Header";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface EditBudgetScreenProps {
  budgetId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditBudgetScreen({
  budgetId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditBudgetScreenProps) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [categories, setCategories] = useState<Categories | null>(null);
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">(
    "monthly",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [warningThreshold, setWarningThreshold] = useState("80");
  const [saving, setSaving] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const categorySuggestTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  const periods: Array<{
    value: "weekly" | "monthly" | "yearly";
    label: string;
  }> = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const {
    data: budget,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<Budget>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getBudgetById(token, budgetId);
    },
    immediate: true,
    deps: [token, budgetId],
    transform: (data) => {
      // Populate form fields
      setName(data.name);
      setSelectedCategory(data.category || "");
      setAmount(data.amount.toString());
      setPeriod(data.period);
      setStartDate(data.startDate ? data.startDate.split("T")[0] : "");
      setEndDate(data.endDate ? data.endDate.split("T")[0] : "");
      setWarningThreshold(data.warningThreshold?.toString() || "80");
      return data;
    },
  });

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
        const result = await suggestCategory(token, name, "expense");
        if (result.category) {
          setSelectedCategory(result.category);
          setIsAutoDetected(true);
          setTimeout(() => {
            if (result.category) {
              scrollToCategory(result.category);
            }
          }, 100);
        }
      } catch (err) {
        console.error("Failed to suggest category:", err);
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

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error || "Failed to load budget");
      onBack();
    }
  }, [error]);

  // Load categories separately
  useEffect(() => {
    async function loadCategories() {
      if (!token) return;
      try {
        const categoriesData = await getCategories(token);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
  }, [token]);

  async function handleSave() {
    if (!token) return;

    if (!name.trim()) {
      Alert.alert("Error", "Please enter a budget name");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const thresholdNum = parseFloat(warningThreshold);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      Alert.alert("Error", "Warning threshold must be between 0 and 100");
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
      Alert.alert("Success", "Budget updated successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update budget",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Budget"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading budget...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!budget) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Budget"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Budget not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Budget"
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
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Budget Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Monthly Groceries"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.categoryLabelRow}>
                <Text style={styles.label}>Category (Optional)</Text>
                {isAutoDetected && selectedCategory && (
                  <View style={styles.autoDetectedBadge}>
                    <MaterialIcons
                      name="auto-awesome"
                      size={14}
                      color={theme.colors.success}
                    />
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
                    setSelectedCategory("");
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
                      isAutoDetected &&
                        selectedCategory === cat &&
                        styles.categoryChipAutoDetected,
                    ]}
                    onPress={() => handleCategorySelect(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                    {isAutoDetected && selectedCategory === cat && (
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color={theme.colors.white}
                        style={styles.checkIcon}
                      />
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
                placeholderTextColor={theme.colors.textTertiary}
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
                placeholderTextColor={theme.colors.textTertiary}
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
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <>
                  <MaterialIcons
                    name="check"
                    size={24}
                    color={theme.colors.white}
                  />
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      gap: theme.spacing.base,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.gray500,
    },
    form: {
      gap: theme.spacing.lg,
    },
    inputGroup: {
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
    },
    input: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 48,
    },
    helpText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
      marginTop: 4,
    },
    categoryLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    autoDetectedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.successBackground,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.spacing.md,
    },
    autoDetectedText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.success,
    },
    categoryScroll: {
      marginHorizontal: -24,
      paddingHorizontal: theme.spacing.xl,
    },
    categoryContainer: {
      gap: theme.spacing.sm,
    },
    categoryChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginRight: theme.spacing.sm,
    },
    categoryChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    categoryChipAutoDetected: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
      shadowColor: theme.colors.success,
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
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    categoryChipTextSelected: {
      color: theme.colors.white,
    },
    checkIcon: {
      marginLeft: 2,
    },
    periodScroll: {
      marginHorizontal: -24,
      paddingHorizontal: theme.spacing.xl,
    },
    periodContainer: {
      gap: theme.spacing.sm,
    },
    periodChip: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    periodChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    periodChipText: {
      fontSize: 14,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    periodChipTextSelected: {
      color: theme.colors.white,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.md,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginTop: 8,
      gap: theme.spacing.sm,
      minHeight: 56,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  });
