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
  createBudget,
  getCategories,
  suggestCategory,
  CreateBudgetDto,
  Categories,
} from "../api/financeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Icon } from "../components/Icon";
import { normalizeCategoryName } from "../utils/categoryIcons";
import { DatePicker } from "../components/DatePicker";
import { useTheme } from "../theme";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";

interface CreateBudgetScreenProps {
  context: "local" | "home";
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function CreateBudgetScreen({
  context,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreateBudgetScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">(
    "monthly",
  );
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [warningThreshold, setWarningThreshold] = useState("80");
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

  const { data: categoriesData, loading } = useDataFetch<Categories>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getCategories(token);
    },
    immediate: true,
    deps: [token],
  });

  const categories = categoriesData ?? null;

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

  const { execute: handleSave, loading: saving } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");

      if (!name.trim()) {
        throw new Error("Please enter a budget name");
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const thresholdNum = parseFloat(warningThreshold);
      if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
        throw new Error("Warning threshold must be between 0 and 100");
      }

      const budgetData: CreateBudgetDto = {
        name: name.trim(),
        category: selectedCategory || undefined,
        amount: amountNum,
        period,
        startDate,
        endDate: endDate || undefined,
        warningThreshold: thresholdNum,
        context,
      };

      return createBudget(token, budgetData);
    },
    onSuccess: () => {
      Alert.alert("Success", "Budget created successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
              onPress={() => handleSave()}
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
                  <Text style={styles.saveButtonText}>Create Budget</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.gray500,
    },
    form: {
      gap: 20,
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
      fontSize: 12,
      color: theme.colors.gray500,
      marginTop: theme.spacing.xs,
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
      fontSize: 12,
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
      marginRight: 8,
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
      fontSize: theme.typography.fontSize.sm,
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
      fontSize: theme.typography.fontSize.sm,
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
}
