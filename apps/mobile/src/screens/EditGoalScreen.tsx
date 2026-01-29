import React, { useEffect, useState, useMemo } from "react";
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
  getGoalById,
  updateGoal,
  UpdateGoalDto,
  FinancialGoal,
} from "../api/financeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { DatePicker } from "../components/DatePicker";
import { Icon } from "../components/Icon";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface EditGoalScreenProps {
  goalId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditGoalScreen({
  goalId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditGoalScreenProps) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState<
    "savings" | "debt" | "purchase" | "investment"
  >("savings");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState<
    "active" | "completed" | "paused" | "cancelled"
  >("active");
  const [saving, setSaving] = useState(false);

  const categories: Array<{
    value: "savings" | "debt" | "purchase" | "investment";
    label: string;
  }> = [
    { value: "savings", label: "Savings" },
    { value: "debt", label: "Debt" },
    { value: "purchase", label: "Purchase" },
    { value: "investment", label: "Investment" },
  ];

  const priorities: Array<{ value: "low" | "medium" | "high"; label: string }> =
    [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ];

  const statuses: Array<{
    value: "active" | "completed" | "paused" | "cancelled";
    label: string;
  }> = [
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "paused", label: "Paused" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const {
    data: goal,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<FinancialGoal>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getGoalById(token, goalId);
    },
    immediate: true,
    deps: [token, goalId],
    transform: (data: FinancialGoal) => {
      // Populate form fields
      setName(data.name);
      setTargetAmount(data.targetAmount.toString());
      setCurrentAmount(data.currentAmount.toString());
      setTargetDate(data.targetDate ? data.targetDate.split("T")[0] : "");
      setCategory(data.category);
      setPriority(data.priority);
      setStatus(data.status);
      return data;
    },
  });

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error || "Failed to load goal");
      onBack();
    }
  }, [error]);

  async function handleSave() {
    if (!token) return;

    if (!name.trim()) {
      Alert.alert("Error", "Please enter a goal name");
      return;
    }

    const targetAmountNum = parseFloat(targetAmount);
    if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
      Alert.alert("Error", "Please enter a valid target amount");
      return;
    }

    const currentAmountNum = parseFloat(currentAmount);
    if (isNaN(currentAmountNum) || currentAmountNum < 0) {
      Alert.alert("Error", "Please enter a valid current amount");
      return;
    }

    try {
      setSaving(true);

      const goalData: UpdateGoalDto = {
        name: name.trim(),
        targetAmount: targetAmountNum,
        currentAmount: currentAmountNum,
        targetDate: targetDate || undefined,
        category,
        priority,
        status,
      };

      await updateGoal(token, goalId, goalData);
      Alert.alert("Success", "Goal updated successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update goal",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Goal"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading goal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Goal"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Goal not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Goal"
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
              <Text style={styles.label}>Goal Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Emergency Fund"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Target Amount *</Text>
              <TextInput
                style={styles.input}
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Amount</Text>
              <TextInput
                style={styles.input}
                value={currentAmount}
                onChangeText={setCurrentAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      category === cat.value && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategory(cat.value)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={cat.label}
                      size={20}
                      color={
                        category === cat.value
                          ? theme.colors.white
                          : theme.colors.textPrimary
                      }
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat.value &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.priorityScroll}
                contentContainerStyle={styles.priorityContainer}
              >
                {priorities.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.priorityChip,
                      priority === p.value && styles.priorityChipSelected,
                    ]}
                    onPress={() => setPriority(p.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        priority === p.value && styles.priorityChipTextSelected,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Status *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.statusScroll}
                contentContainerStyle={styles.statusContainer}
              >
                {statuses.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.statusChip,
                      status === s.value && styles.statusChipSelected,
                    ]}
                    onPress={() => setStatus(s.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        status === s.value && styles.statusChipTextSelected,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={targetDate}
                onChange={setTargetDate}
                label="Target Date (Optional)"
                placeholder="Select target date"
                minimumDate={new Date()}
              />
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
                  <Text style={styles.saveButtonText}>Update Goal</Text>
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
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    form: {
      gap: 20,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.gray700,
    },
    input: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 48,
    },
    categoryScroll: {
      marginHorizontal: -24,
      paddingHorizontal: 24,
    },
    categoryContainer: {
      gap: 8,
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    categoryChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    categoryChipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: "500",
    },
    categoryChipTextSelected: {
      color: theme.colors.white,
    },
    priorityScroll: {
      marginHorizontal: -24,
      paddingHorizontal: 24,
    },
    priorityContainer: {
      gap: 8,
    },
    priorityChip: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    priorityChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    priorityChipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: "500",
    },
    priorityChipTextSelected: {
      color: theme.colors.white,
    },
    statusScroll: {
      marginHorizontal: -24,
      paddingHorizontal: 24,
    },
    statusContainer: {
      gap: 8,
    },
    statusChip: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statusChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    statusChipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: "500",
    },
    statusChipTextSelected: {
      color: theme.colors.white,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blue,
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
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
