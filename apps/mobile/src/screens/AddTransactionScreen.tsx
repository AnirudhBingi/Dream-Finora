import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/authContext";
import {
  createTransaction,
  getCategories,
  suggestCategory,
  Categories,
  CreateTransactionDto,
} from "../api/financeApi";
import { getProfile, Profile } from "../api/profileApi";
import { MaterialIcons } from "@expo/vector-icons";
import { DatePicker } from "../components/DatePicker";
import { Icon } from "../components/Icon";
import { normalizeCategoryName } from "../utils/categoryIcons";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface AddTransactionScreenProps {
  context?: "local" | "home"; // Optional: pre-select context
  initialType?: "income" | "expense"; // Optional: pre-select type
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function AddTransactionScreen({
  context: initialContext,
  initialType,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: AddTransactionScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [type, setType] = useState<"income" | "expense">(
    initialType || "expense",
  );
  const [context, setContext] = useState<"local" | "home">(
    initialContext || "local",
  );
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState(""); // For income
  const [selectedCategory, setSelectedCategory] = useState(""); // For expense
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // Default to today
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const categorySuggestTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  // Fetch categories
  const { data: categories, loading } = useDataFetch<Categories | null>({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return getCategories(token);
    },
    immediate: true,
    deps: [token],
  });

  // Fetch profile (for currency)
  const { data: profile } = useDataFetch<Profile | null>({
    fetchFn: async () => {
      if (!token) return null;
      try {
        return await getProfile(token);
      } catch (err) {
        // Silently fail - currency will default to USD
        console.error("Failed to load profile:", err);
        return null;
      }
    },
    immediate: true,
    deps: [token],
  });

  // Income sources (common options)
  const incomeSources = [
    "Salary",
    "Freelance",
    "Investment",
    "Gift",
    "Other Income",
  ];

  // Get currency symbol based on context
  function getCurrencySymbol(): string {
    if (!profile) return "$";
    const currency =
      context === "local"
        ? profile.primaryCurrency || "USD"
        : profile.homeCountryCurrency || "USD";

    // Common currency symbols
    const currencySymbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
      JPY: "¥",
      CNY: "¥",
      AUD: "A$",
      CAD: "C$",
      CHF: "CHF",
      SGD: "S$",
    };

    return currencySymbols[currency] || currency;
  }

  useEffect(() => {
    // Clear category when switching type
    setSelectedCategory("");
    setSource("");
  }, [type]);

  const { execute: handleSave, loading: saving } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Please enter a valid amount");
      }

      if (type === "income" && !source.trim()) {
        throw new Error("Please enter a source of income");
      }

      // For expense, category is optional (auto-populated from description)
      // But we can still require it if user wants to be explicit
      if (type === "expense" && !selectedCategory && !description.trim()) {
        throw new Error("Please enter a description or select a category");
      }

      const transactionData: CreateTransactionDto = {
        type,
        amount: amountNum,
        context,
        description: description.trim() || undefined,
        date: date || undefined, // Defaults to today if empty
      };

      // Add type-specific fields
      if (type === "income") {
        transactionData.source = source.trim();
      } else {
        // For expense, include category if selected (backend will auto-populate if not provided)
        if (selectedCategory) {
          transactionData.category = selectedCategory;
        }
      }

      return createTransaction(token, transactionData);
    },
    onSuccess: () => {
      Alert.alert("Success", "Transaction added successfully!", [
        { text: "OK", onPress: onSuccess },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

  // Auto-suggest category for expenses when description changes
  useEffect(() => {
    if (type === "expense" && description.trim() && token) {
      // Clear previous timeout
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
      // Set new timeout to debounce API calls
      categorySuggestTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await suggestCategory(token, description, "expense");
          if (result.category) {
            setSelectedCategory(result.category);
            setIsAutoDetected(true);
            // Scroll to the selected category after a short delay to ensure it's rendered
            setTimeout(() => {
              if (result.category) {
                scrollToCategory(result.category);
              }
            }, 100);
          }
        } catch (err) {
          // Silently fail - user can still manually select category
          console.error("Failed to suggest category:", err);
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
        chipRef.measure(
          (
            x: number,
            y: number,
            width: number,
            height: number,
            pageX: number,
            pageY: number,
          ) => {
            if (categoryScrollViewRef.current) {
              categoryScrollViewRef.current.scrollTo({
                x: Math.max(0, pageX - 40), // Offset to show some context
                animated: true,
              });
            }
          },
        );
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
      <Header
        title="New Transaction"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.form}>
            {/* Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === "income" && styles.typeButtonActive,
                ]}
                onPress={() => {
                  setType("income");
                  setSelectedCategory("");
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === "income" && styles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === "expense" && styles.typeButtonActive,
                ]}
                onPress={() => {
                  setType("expense");
                  setSource("");
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === "expense" && styles.typeButtonTextActive,
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
                    context === "local" && styles.contextButtonActive,
                  ]}
                  onPress={() => setContext("local")}
                >
                  <MaterialIcons
                    name="location-on"
                    size={20}
                    color={
                      context === "local"
                        ? theme.colors.white
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.contextButtonText,
                      context === "local" && styles.contextButtonTextActive,
                    ]}
                  >
                    Local
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contextButton,
                    context === "home" && styles.contextButtonActive,
                  ]}
                  onPress={() => setContext("home")}
                >
                  <MaterialIcons
                    name="home"
                    size={20}
                    color={
                      context === "home"
                        ? theme.colors.white
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.contextButtonText,
                      context === "home" && styles.contextButtonTextActive,
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
                <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
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
            {type === "income" && (
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
                            source === sourceOption &&
                              styles.sourceButtonTextActive,
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
            {type === "expense" && (
              <View style={styles.inputGroup}>
                <View style={styles.categoryLabelRow}>
                  <Text style={styles.label}>Category</Text>
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
                            selectedCategory === category &&
                              styles.categoryButtonActive,
                            isAutoDetected &&
                              selectedCategory === category &&
                              styles.categoryButtonAutoDetected,
                          ]}
                          onPress={() => handleCategorySelect(category)}
                        >
                          <Icon
                            name={normalizeCategoryName(category)}
                            size="sm"
                            color={
                              selectedCategory === category
                                ? theme.colors.white
                                : theme.colors.textSecondary
                            }
                            style={styles.categoryIcon}
                          />
                          <Text
                            style={[
                              styles.categoryButtonText,
                              selectedCategory === category &&
                                styles.categoryButtonTextActive,
                            ]}
                          >
                            {category}
                          </Text>
                          {isAutoDetected && selectedCategory === category && (
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color={theme.colors.white}
                              style={styles.checkIcon}
                            />
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
                Description{type === "expense" ? " (Auto-categorizes)" : ""}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  type === "income"
                    ? "Add a note..."
                    : "e.g., Groceries at Walmart"
                }
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
              onPress={() => handleSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.white} />
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
      paddingHorizontal: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    form: {
      marginTop: theme.spacing.sm,
    },
    typeSelector: {
      flexDirection: "row",
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.sm,
      padding: 4,
    },
    typeButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: 6,
      alignItems: "center",
    },
    typeButtonActive: {
      backgroundColor: theme.colors.blue,
    },
    typeButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    typeButtonTextActive: {
      color: theme.colors.white,
    },
    inputGroup: {
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    contextSelector: {
      flexDirection: "row",
      gap: 12,
    },
    contextButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      backgroundColor: theme.colors.background,
      gap: theme.spacing.sm,
    },
    contextButtonActive: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    contextButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    contextButtonTextActive: {
      color: theme.colors.white,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
    },
    textArea: {
      minHeight: 100,
      paddingTop: theme.spacing.md,
    },
    marginTop: {
      marginTop: theme.spacing.sm,
    },
    amountContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
    },
    currencySymbol: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginRight: theme.spacing.sm,
    },
    amountInput: {
      flex: 1,
      padding: theme.spacing.md,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    sourceSelector: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
    },
    sourceButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      backgroundColor: theme.colors.background,
    },
    sourceButtonActive: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    sourceButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sourceButtonTextActive: {
      color: theme.colors.white,
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
      gap: 4,
      backgroundColor: theme.colors.successBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.spacing.md,
    },
    autoDetectedText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.success,
    },
    categoryScrollView: {
      marginHorizontal: -24,
      paddingHorizontal: 24,
    },
    categorySelector: {
      flexDirection: "row",
      gap: 8,
    },
    categoryButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      backgroundColor: theme.colors.backgroundTertiary,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    categoryButtonAutoDetected: {
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
    categoryButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    categoryButtonTextActive: {
      color: theme.colors.white,
    },
    checkIcon: {
      marginLeft: 2,
    },
    helperText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontStyle: "italic",
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      fontStyle: "italic",
    },
    saveButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    cancelButton: {
      backgroundColor: "transparent",
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.blue,
    },
    cancelButtonText: {
      color: theme.colors.blue,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
