import React, { useState, useEffect, useMemo } from "react";
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
import { addContribution, getGoalById, FinancialGoal } from "../api/financeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { DatePicker } from "../components/DatePicker";
import { getProfile, Profile } from "../api/profileApi";
import { getCurrencySymbol } from "../utils/currency";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface AddContributionScreenProps {
  goalId?: string; // Optional - if provided, pre-fills the goal
  suggestedAmount?: number; // Optional - suggested amount from advisor
  context?: "local" | "home"; // Optional - will be derived from goal if not provided
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function AddContributionScreen({
  goalId,
  suggestedAmount,
  context,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: AddContributionScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [amount, setAmount] = useState(
    suggestedAmount ? suggestedAmount.toString() : "",
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const { data: goal, loading } = useDataFetch<FinancialGoal>({
    fetchFn: async () => {
      if (!token || !goalId) throw new Error("Missing token or goal ID");
      const goalData = await getGoalById(token, goalId);
      // If no suggested amount, suggest remaining amount needed
      if (!suggestedAmount && goalData.targetAmount > goalData.currentAmount) {
        const remaining = goalData.targetAmount - goalData.currentAmount;
        setAmount(remaining.toString());
      }
      return goalData;
    },
    immediate: !!goalId,
    deps: [token, goalId],
  });

  const { data: profile } = useDataFetch<Profile>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getProfile(token);
    },
    immediate: true,
    deps: [token],
  });

  function getCurrentCurrency(): string {
    if (!profile) return "USD";
    // Use context from prop, or derive from goal, or default to 'local'
    const currentContext = context || goal?.context || "local";
    return currentContext === "local"
      ? profile.primaryCurrency || "USD"
      : profile.homeCountryCurrency || "USD";
  }

  function formatCurrency(amount: number): string {
    const currency = getCurrentCurrency();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  const {
    loading: saving,
    error,
    execute,
  } = useAsyncOperation({
    operationFn: async () => {
      if (!token || !goalId) throw new Error("Missing token or goal ID");

      const amountNum = parseFloat(amount);
      if (!amount || isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Please enter a valid amount");
      }

      return await addContribution(token, goalId, {
        amount: amountNum,
        date: date,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Contribution added successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

  async function handleSubmit() {
    await execute();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading goal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Add Contribution"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {goal && (
          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>{goal.name}</Text>
            <View style={styles.goalProgress}>
              <Text style={styles.goalProgressText}>
                {formatCurrency(goal.currentAmount)} /{" "}
                {formatCurrency(goal.targetAmount)}
              </Text>
              <Text style={styles.goalProgressPercent}>
                {((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)}%
              </Text>
            </View>
            {goal.targetAmount > goal.currentAmount && (
              <Text style={styles.goalRemaining}>
                {formatCurrency(goal.targetAmount - goal.currentAmount)}{" "}
                remaining
              </Text>
            )}
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Amount {getCurrencySymbol(getCurrentCurrency())}
            </Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              autoFocus
            />
            {suggestedAmount && (
              <TouchableOpacity
                onPress={() => setAmount(suggestedAmount.toString())}
                style={styles.suggestedButton}
              >
                <Text style={styles.suggestedButtonText}>
                  Use suggested: {formatCurrency(suggestedAmount)}
                </Text>
              </TouchableOpacity>
            )}
            {goal && goal.targetAmount > goal.currentAmount && (
              <TouchableOpacity
                onPress={() =>
                  setAmount((goal.targetAmount - goal.currentAmount).toString())
                }
                style={styles.suggestedButton}
              >
                <Text style={styles.suggestedButtonText}>
                  Add remaining:{" "}
                  {formatCurrency(goal.targetAmount - goal.currentAmount)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <DatePicker
              value={date}
              onChange={setDate}
              maximumDate={new Date()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note about this contribution"
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving || !goalId}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Add Contribution</Text>
            )}
          </TouchableOpacity>
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
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
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
    goalInfo: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.base,
      marginHorizontal: theme.spacing.base,
      marginBottom: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    goalName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    goalProgress: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    goalProgressText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    goalProgressPercent: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    goalRemaining: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    form: {
      paddingHorizontal: theme.spacing.base,
    },
    inputGroup: {
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
    },
    textArea: {
      height: 80,
      textAlignVertical: "top",
    },
    suggestedButton: {
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.blueBackground,
      borderRadius: 6,
      alignSelf: "flex-start",
    },
    suggestedButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.medium,
    },
    submitButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.base,
      alignItems: "center",
      marginTop: theme.spacing.sm,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
