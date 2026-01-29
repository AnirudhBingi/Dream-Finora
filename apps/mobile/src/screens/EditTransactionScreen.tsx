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
  updateTransaction,
  deleteTransaction,
  getTransactionById,
  getCategories,
  suggestCategory,
  Categories,
  UpdateTransactionDto,
  FinanceTransaction,
} from "../api/financeApi";
import { getProfile, Profile } from "../api/profileApi";
import { MaterialIcons } from "@expo/vector-icons";
import { DatePicker } from "../components/DatePicker";
import { Icon } from "../components/Icon";
import { normalizeCategoryName } from "../utils/categoryIcons";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface EditTransactionScreenProps {
  transactionId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditTransactionScreen({
  transactionId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditTransactionScreenProps) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [categories, setCategories] = useState<Categories | null>(null);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [context, setContext] = useState<"local" | "home">("local");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const categorySuggestTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  // Income sources (common options)
  const incomeSources = [
    "Salary",
    "Freelance",
    "Investment",
    "Gift",
    "Other Income",
  ];

  const {
    data: transaction,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<FinanceTransaction>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getTransactionById(token, transactionId);
    },
    immediate: true,
    deps: [token, transactionId],
    transform: (data) => {
      setType(data.type);
      setContext(data.context || "local");
      setAmount(Math.abs(data.amount).toString()); // Use absolute value for display
      setSource(data.source || "");
      setSelectedCategory(data.category || "");
      setDescription(data.description || "");
      setDate(
        data.date
          ? new Date(data.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
      return data;
    },
  });

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error || "Failed to load transaction");
      onBack();
    }
  }, [error]);

  // Get currency symbol based on context
  function getCurrencySymbol(): string {
    if (!profile) return "$";
    const currency =
      context === "local"
        ? profile.primaryCurrency || "USD"
        : profile.homeCountryCurrency || "USD";

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
    async function loadCategories() {
      if (!token) return;
      try {
        const categoriesData = await getCategories(token);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    async function loadProfile() {
      if (!token) return;
      try {
        const profileData = await getProfile(token);
        setProfile(profileData || null);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setProfile(null);
      }
    }
    loadCategories();
    loadProfile();
  }, [token]);

  // Auto-suggest category for expenses when description changes
  useEffect(() => {
    if (
      type === "expense" &&
      description.trim() &&
      token &&
      description !== transaction?.description
    ) {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
      categorySuggestTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await suggestCategory(token, description, "expense");
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
    }

    return () => {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
    };
  }, [description, type, token]);

  function scrollToCategory(category: string) {
    if (!categoryScrollViewRef.current || !availableCategories.length) return;

    const categoryIndex = availableCategories.indexOf(category);
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

  function handleCategorySelect(category: string) {
    setSelectedCategory(category);
    setIsAutoDetected(false);
    scrollToCategory(category);
  }

  async function handleSave() {
    if (!token || !transaction) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (type === "income" && !source.trim()) {
      Alert.alert("Error", "Please enter a source of income");
      return;
    }

    try {
      setSaving(true);

      const updateData: UpdateTransactionDto = {
        amount: amountNum,
        context,
        description: description.trim() || undefined,
        date: date || undefined,
      };

      if (type === "income") {
        updateData.source = source.trim();
      } else {
        if (selectedCategory) {
          updateData.category = selectedCategory;
        }
      }

      await updateTransaction(token, transactionId, updateData);

      Alert.alert("Success", "Transaction updated successfully!", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update transaction",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !transaction) return;

    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteTransaction(token, transactionId);
              Alert.alert("Success", "Transaction deleted successfully!", [
                { text: "OK", onPress: onSuccess },
              ]);
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to delete transaction",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  const availableCategories = categories?.expense || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Transaction"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Transaction not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Transaction"
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
            {/* Type Display (read-only for editing) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeDisplay}>
                <Text style={styles.typeDisplayText}>
                  {type === "income" ? "Income" : "Expense"}
                </Text>
              </View>
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
                        ? theme.colors.textInverse
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
                        ? theme.colors.textInverse
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
                <TextInput
                  style={[styles.input, styles.marginTop]}
                  placeholder="Or enter custom source..."
                  value={source}
                  onChangeText={setSource}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Expense: Category */}
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
                      {availableCategories.map((category) => (
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
                              color={theme.colors.textInverse}
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
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  deleting && styles.deleteButtonDisabled,
                ]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <>
                    <MaterialIcons
                      name="delete-outline"
                      size={20}
                      color={theme.colors.textInverse}
                    />
                    <Text style={styles.deleteButtonText}>
                      Delete Transaction
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      marginBottom: theme.spacing.base,
    },
    form: {
      marginTop: theme.spacing.sm,
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
    typeDisplay: {
      padding: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
    },
    typeDisplayText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
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
      marginBottom: theme.spacing.sm,
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
    saveButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      flexDirection: "row",
      gap: theme.spacing.sm,
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
      marginBottom: theme.spacing.xl,
    },
    cancelButtonText: {
      color: theme.colors.blue,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    dangerZone: {
      marginTop: 24,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    dangerZoneTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.gray700,
      marginBottom: 12,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    deleteButtonDisabled: {
      opacity: 0.5,
    },
    deleteButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: "500",
    },
  });
}
