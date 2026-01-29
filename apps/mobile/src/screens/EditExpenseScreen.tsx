import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { pickImage } from "../utils/imagePicker";
import { useAuth } from "../auth/authContext";
import {
  updateExpense,
  getExpenseById,
  uploadReceipt,
  Expense,
  SplitType,
} from "../api/expenseApi";
import { getCategories, Categories, suggestCategory } from "../api/financeApi";
import { getApiBaseUrl } from "../api/getApiBaseUrl";
import { SUPPORTED_CURRENCIES } from "../components/CurrencyPicker";
import { Header } from "../components/Header";
import { getProfile } from "../api/profileApi";
import { getAvatarUrl } from "../utils/avatar";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface EditExpenseScreenProps {
  expenseId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditExpenseScreen({
  expenseId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditExpenseScreenProps) {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Categories | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [paidBy, setPaidBy] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [errors, setErrors] = useState<{
    description?: string;
    amount?: string;
  }>({});
  const categorySuggestTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const amountInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const {
    data: expense,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<Expense>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getExpenseById(token, expenseId);
    },
    immediate: true,
    deps: [token, expenseId],
    transform: (data) => {
      setDescription(data.description || "");
      setAmount(data.amount.toString());
      setCategory(data.category || "");
      setSplitType(data.splitType || "EQUAL");
      setPaidBy(data.paidBy || "");
      setCurrency(data.currency || "USD");
      if (data.receiptUrl) {
        const fullUrl = data.receiptUrl.startsWith("http")
          ? data.receiptUrl
          : `${getApiBaseUrl()}${data.receiptUrl}`;
        setReceiptUri(fullUrl);
      } else {
        setReceiptUri(null);
      }
      return data;
    },
  });

  useEffect(() => {
    async function loadCategories() {
      if (!token) return;
      try {
        setCategoriesLoading(true);
        const categoriesData = await getCategories(token);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, [token]);

  // Load user's primary currency from profile (for consistency, though expense has its own currency)
  useEffect(() => {
    async function loadUserCurrency() {
      if (!token) return;
      try {
        const profile = await getProfile(token);
        // Use expense currency if available, otherwise profile currency
        if (expense && expense.currency) {
          setCurrency(expense.currency);
        } else if (profile?.primaryCurrency) {
          setCurrency(profile.primaryCurrency);
        }
      } catch (err) {
        console.error("Failed to load user currency:", err);
      }
    }
    if (expense) {
      loadUserCurrency();
    }
  }, [token, expense]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error || "Failed to load expense");
      onBack();
    }
  }, [error]);

  // Auto-suggest category when description changes
  useEffect(() => {
    if (!description.trim() || !token) return;

    if (categorySuggestTimeoutRef.current) {
      clearTimeout(categorySuggestTimeoutRef.current);
    }

    categorySuggestTimeoutRef.current = setTimeout(async () => {
      if (!token || !description.trim()) return;

      try {
        const result = await suggestCategory(token, description, "expense");
        if (result.category) {
          setCategory(result.category);
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
  }, [description, token]);

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
      setCategoriesLoading(true);
      const categoriesData = await getCategories(token);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: { description?: string; amount?: string } = {};

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!token || !expense) return;

    if (!validateForm()) {
      return;
    }

    const amountNum = parseFloat(amount);

    try {
      setSaving(true);

      const updateData: any = {
        description: description.trim(),
        amount: amountNum,
        currency: currency,
        category: category.trim() || undefined,
        splitType: splitType,
        paidBy: paidBy,
      };

      const updatedExpense = await updateExpense(token, expenseId, updateData);

      if (receiptUri && receiptUri.startsWith("file://")) {
        try {
          await uploadReceipt(token, updatedExpense.id, receiptUri);
        } catch (err) {
          console.error("Failed to upload receipt:", err);
          Alert.alert("Warning", "Expense updated but receipt upload failed");
        }
      }

      Alert.alert("Success", "Expense updated successfully!", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update expense",
      );
    } finally {
      setSaving(false);
    }
  }

  async function pickReceipt() {
    try {
      const uri = await pickImage();
      if (uri) {
        setReceiptUri(uri);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Expense"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Expense"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>Expense not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currencySymbol =
    SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || "$";
  const allParticipants = expense.splits.map((split) => ({
    userId: split.userId,
    name: split.user?.profile?.displayName || split.user?.email || "Unknown",
    email: split.user?.email || "",
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Expense"
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
          {/* Hero Amount Section */}
          <View style={styles.heroSection}>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbolLarge}>{currencySymbol}</Text>
              <TextInput
                ref={amountInputRef}
                style={[
                  styles.amountInput,
                  errors.amount && styles.amountInputError,
                ]}
                placeholder="0.00"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (errors.amount) {
                    setErrors((prev) => ({ ...prev, amount: undefined }));
                  }
                }}
                keyboardType="decimal-pad"
                placeholderTextColor={theme.colors.textTertiary}
                returnKeyType="next"
                onSubmitEditing={() => descriptionInputRef.current?.focus()}
              />
            </View>
            {errors.amount && (
              <Text style={styles.errorTextInline}>{errors.amount}</Text>
            )}
          </View>

          {/* Who Paid Section - Prominent placement */}
          {expense && expense.splits.length > 0 && (
            <View style={styles.whoPaidCard}>
              <Text style={styles.whoPaidCardTitle}>Who Paid</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.whoPaidScroll}
                contentContainerStyle={styles.whoPaidContainer}
              >
                {allParticipants.map((participant) => (
                  <TouchableOpacity
                    key={participant.userId}
                    style={[
                      styles.whoPaidButtonCompact,
                      paidBy === participant.userId &&
                        styles.whoPaidButtonCompactSelected,
                    ]}
                    onPress={() => setPaidBy(participant.userId)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="payment"
                      size={14}
                      color={
                        paidBy === participant.userId
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.whoPaidButtonTextCompact,
                        paidBy === participant.userId &&
                          styles.whoPaidButtonTextCompactSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {participant.userId === user?.id
                        ? "You"
                        : participant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
                placeholder="What was this for?"
                placeholderTextColor={theme.colors.textTertiary}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            {errors.description && (
              <Text style={styles.errorTextInline}>{errors.description}</Text>
            )}

            {/* Category Chips */}
            {description.trim() && !categoriesLoading && categories && (
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
                      isAutoDetected &&
                        category === cat &&
                        styles.categoryChipAutoDetected,
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
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color={theme.colors.textInverse}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Participants Display - Read-only since they're fixed */}
          {expense && expense.splits.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Participants</Text>
              <View style={styles.participantsList}>
                {expense.splits.map((split) => {
                  const avatarUrl = getAvatarUrl(
                    split.user?.profile?.avatarUrl || null,
                  );
                  const participantName =
                    split.user?.profile?.displayName ||
                    split.user?.email ||
                    "Unknown";
                  const initials = participantName.charAt(0).toUpperCase();
                  const isYou = split.userId === user?.id;
                  return (
                    <View key={split.id} style={styles.participantRow}>
                      <View style={styles.participantInfo}>
                        <View style={styles.participantAvatar}>
                          {avatarUrl ? (
                            <Image
                              source={{ uri: avatarUrl }}
                              style={styles.participantAvatarImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.participantAvatarPlaceholder}>
                              <Text style={styles.participantAvatarText}>
                                {initials}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.participantName}>
                          {isYou ? "You" : participantName}
                        </Text>
                      </View>
                      <Text style={styles.participantAmount}>
                        {currencySymbol}
                        {split.amount.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Info Boxes - Show consequences of changes */}
          {expense && parseFloat(amount) !== expense.amount && (
            <View style={styles.infoBox}>
              <MaterialIcons
                name="info-outline"
                size={20}
                color={theme.colors.primary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Changing the amount will automatically recalculate splits
                proportionally and reset payment status for all participants.
              </Text>
            </View>
          )}
          {expense &&
            parseFloat(amount) === expense.amount &&
            expense.splits.length > 0 && (
              <View style={styles.infoBox}>
                <MaterialIcons
                  name="info-outline"
                  size={20}
                  color={theme.colors.primary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  Editing this expense will reset payment status for all
                  participants.
                </Text>
              </View>
            )}

          {/* Split Type - Only show if expense has splits */}
          {expense && expense.splits.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Split Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.splitTypeScroll}
                contentContainerStyle={styles.splitTypeRow}
              >
                {(["EQUAL", "CUSTOM", "PERCENTAGE"] as SplitType[]).map(
                  (type) => (
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
                          type === "EQUAL"
                            ? "equalizer"
                            : type === "CUSTOM"
                              ? "edit"
                              : "percent"
                        }
                        size={20}
                        color={
                          splitType === type
                            ? theme.colors.textInverse
                            : theme.colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.splitTypeButtonText,
                          splitType === type &&
                            styles.splitTypeButtonTextSelected,
                        ]}
                      >
                        {type === "EQUAL"
                          ? "Equal"
                          : type === "CUSTOM"
                            ? "Custom"
                            : "Percentage"}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            </View>
          )}

          {/* Receipt Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Receipt (Optional)</Text>
            {receiptUri ? (
              <View style={styles.receiptContainer}>
                <Image
                  source={{ uri: receiptUri }}
                  style={styles.receiptPreview}
                />
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
                    <Text
                      style={[
                        styles.receiptButtonText,
                        styles.removeButtonText,
                      ]}
                    >
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.receiptUploadButton}
                onPress={pickReceipt}
              >
                <MaterialIcons
                  name="add-photo-alternate"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.receiptUploadButtonText}>
                  Upload Receipt
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom spacing for floating button */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, saving && styles.fabDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.fabText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
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
      fontWeight: theme.typography.fontWeight.medium,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      marginTop: theme.spacing.base,
      textAlign: "center",
      fontWeight: theme.typography.fontWeight.medium,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 48,
      marginTop: theme.spacing.base,
      ...theme.shadows.button,
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    heroSection: {
      alignItems: "center",
      marginBottom: theme.spacing["2xl"],
      paddingTop: theme.spacing.sm,
    },
    amountContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
    },
    currencySymbolLarge: {
      fontSize: 56,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginRight: theme.spacing.xs,
    },
    amountInput: {
      fontSize: 56,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      padding: 0,
      margin: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      textAlign: "left",
      includeFontPadding: false,
      textAlignVertical: "center",
      minWidth: 80,
    },
    amountInputError: {
      color: theme.colors.error,
    },
    errorTextInline: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    whoPaidCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      marginHorizontal: 0,
      ...theme.shadows.sm,
    },
    whoPaidCardTitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.md,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    whoPaidScroll: {
      marginHorizontal: -theme.spacing.base,
      paddingHorizontal: theme.spacing.base,
    },
    whoPaidContainer: {
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.sm,
    },
    whoPaidButtonCompact: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.sm,
      borderWidth: 2,
      borderColor: "transparent",
      minHeight: 36,
      maxWidth: 120,
    },
    whoPaidButtonCompactSelected: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    whoPaidButtonTextCompact: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      flexShrink: 1,
    },
    whoPaidButtonTextCompactSelected: {
      color: theme.colors.textInverse,
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
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.backgroundSecondary,
      minHeight: 52,
    },
    inputIcon: {
      marginRight: 12,
    },
    descriptionInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.textPrimary,
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
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginRight: 8,
      borderWidth: 2,
      borderColor: "transparent",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 40,
    },
    categoryChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryChipAutoDetected: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.gray700,
    },
    categoryChipTextSelected: {
      color: theme.colors.white,
    },
    checkIcon: {
      marginLeft: 2,
    },
    participantsList: {
      gap: theme.spacing.md,
    },
    participantRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
    },
    participantInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      flex: 1,
    },
    participantAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      overflow: "hidden",
      backgroundColor: theme.colors.primaryBackground,
    },
    participantAvatarImage: {
      width: "100%",
      height: "100%",
    },
    participantAvatarPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    participantAvatarText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    participantName: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    participantAmount: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    infoBox: {
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    infoIcon: {
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      lineHeight: 21,
    },
    splitTypeScroll: {
      marginHorizontal: -theme.spacing.base,
      paddingHorizontal: theme.spacing.base,
    },
    splitTypeRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingRight: theme.spacing.base,
    },
    splitTypeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 12,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      borderWidth: 2,
      borderColor: "transparent",
      minHeight: 40,
      minWidth: 120,
    },
    splitTypeButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    splitTypeButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      textAlign: "center",
      includeFontPadding: false,
    },
    splitTypeButtonTextSelected: {
      color: theme.colors.textInverse,
    },
    receiptUploadButton: {
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: "dashed",
      borderRadius: 12,
      padding: theme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 120,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    receiptUploadButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      marginTop: theme.spacing.sm,
    },
    receiptContainer: {
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: 12,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    receiptPreview: {
      width: "100%",
      height: 200,
      borderRadius: 12,
      marginBottom: theme.spacing.md,
      resizeMode: "contain",
      backgroundColor: theme.colors.background,
    },
    receiptActions: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    receiptButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      alignItems: "center",
      minHeight: 44,
    },
    receiptButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    removeButton: {
      backgroundColor: theme.colors.error,
    },
    removeButtonText: {
      color: theme.colors.textInverse,
    },
    bottomSpacer: {
      height: 20,
    },
    fabContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.base,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      ...theme.shadows.lg,
    },
    fab: {
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      paddingVertical: theme.spacing.base,
      paddingHorizontal: theme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 56,
      ...theme.shadows.button,
    },
    fabDisabled: {
      opacity: 0.5,
    },
    fabText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
