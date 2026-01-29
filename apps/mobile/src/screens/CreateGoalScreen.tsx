import React, { useState, useMemo } from "react";
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
import { createGoal, CreateGoalDto } from "../api/financeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { DatePicker } from "../components/DatePicker";
import { Icon } from "../components/Icon";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface CreateGoalScreenProps {
  context: "local" | "home";
  prefill?: {
    name: string;
    targetAmount: number;
    category: "savings" | "debt" | "purchase" | "investment";
  };
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function CreateGoalScreen({
  context,
  prefill,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreateGoalScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [name, setName] = useState(prefill?.name || "");
  const [targetAmount, setTargetAmount] = useState(
    prefill?.targetAmount?.toString() || "",
  );
  const [currentAmount, setCurrentAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState<
    "savings" | "debt" | "purchase" | "investment"
  >(prefill?.category || "savings");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const { execute: handleSave, loading: saving } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");

      if (!name.trim()) {
        throw new Error("Please enter a goal name");
      }

      const targetAmountNum = parseFloat(targetAmount);
      if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
        throw new Error("Please enter a valid target amount");
      }

      const currentAmountNum = parseFloat(currentAmount);
      if (isNaN(currentAmountNum) || currentAmountNum < 0) {
        throw new Error("Please enter a valid current amount");
      }

      const goalData: CreateGoalDto = {
        name: name.trim(),
        targetAmount: targetAmountNum,
        currentAmount: currentAmountNum,
        targetDate: targetDate || undefined,
        category,
        priority,
        context,
      };

      return createGoal(token, goalData);
    },
    onSuccess: () => {
      Alert.alert("Success", "Goal created successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

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
              <Text style={styles.helpText}>Starting amount (default: 0)</Text>
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
                          : theme.colors.gray700
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
                  <Text style={styles.saveButtonText}>Create Goal</Text>
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
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    placeholder: {
      width: 60,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
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
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
    },
    input: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      fontSize: 16,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 48,
    },
    helpText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 4,
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
      paddingHorizontal: theme.spacing.base,
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
      fontWeight: theme.typography.fontWeight.medium,
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
      borderRadius: 8,
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
      fontWeight: theme.typography.fontWeight.medium,
    },
    priorityChipTextSelected: {
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
}
