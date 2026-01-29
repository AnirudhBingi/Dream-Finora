import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { addLoanPayment, getLoanById, Loan } from "../api/financeApi";
import { DatePicker } from "../components/DatePicker";
import { Header } from "../components/Header";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface RecordLoanPaymentScreenProps {
  loanId?: string;
  suggestedAmount?: number;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function RecordLoanPaymentScreen({
  loanId,
  suggestedAmount,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: RecordLoanPaymentScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [amount, setAmount] = useState(suggestedAmount?.toString() || "");
  const [principalPaid, setPrincipalPaid] = useState("");
  const [interestPaid, setInterestPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    data: loan,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<Loan>({
    fetchFn: async () => {
      if (!token || !loanId)
        throw new Error("No authentication token or loan ID");
      return getLoanById(token, loanId);
    },
    immediate: true,
    deps: [token, loanId],
    transform: (data: Loan) => {
      // Pre-fill fields based on EMI and remaining amount
      const today = new Date();
      setPaymentDate(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
          today.getDate(),
        ).padStart(2, "0")}`,
      );

      if (suggestedAmount && suggestedAmount > 0) {
        // Use suggested amount from advisor
        const monthlyRate =
          data.interestRate > 0 ? data.interestRate / 12 / 100 : 0;
        const estimatedInterest = data.remainingAmount * monthlyRate;
        const estimatedPrincipal = Math.max(
          0,
          suggestedAmount - estimatedInterest,
        );
        setAmount(suggestedAmount.toFixed(2));
        setPrincipalPaid(estimatedPrincipal.toFixed(2));
        setInterestPaid(estimatedInterest.toFixed(2));
      } else if (data.emi && data.remainingAmount > 0) {
        // Default to EMI
        const monthlyRate =
          data.interestRate > 0 ? data.interestRate / 12 / 100 : 0;
        const estimatedInterest = data.remainingAmount * monthlyRate;
        const estimatedPrincipal = Math.max(0, data.emi - estimatedInterest);
        setAmount(data.emi.toFixed(2));
        setPrincipalPaid(estimatedPrincipal.toFixed(2));
        setInterestPaid(estimatedInterest.toFixed(2));
      }

      return data;
    },
  });

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error || "Failed to load loan for payment");
      onBack();
    }
  }, [error]);

  async function handleSave() {
    if (!token || !loan) return;

    const amountNum = parseFloat(amount);
    const principalNum = parseFloat(principalPaid);
    const interestNum = parseFloat(interestPaid);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Please enter a valid payment amount");
      return;
    }

    if (isNaN(principalNum) || principalNum < 0) {
      Alert.alert("Error", "Please enter a valid principal amount");
      return;
    }

    if (isNaN(interestNum) || interestNum < 0) {
      Alert.alert("Error", "Please enter a valid interest amount");
      return;
    }

    if (!paymentDate) {
      Alert.alert("Error", "Please select a payment date");
      return;
    }

    try {
      setSaving(true);
      await addLoanPayment(token, loan.id, {
        amount: amountNum,
        principalPaid: principalNum,
        interestPaid: interestNum,
        paymentDate,
        notes: notes.trim() || undefined,
      });

      Alert.alert("Success", "Payment recorded successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to record payment",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !loan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Record Payment"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading loan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remainingAfterPayment =
    loan && !isNaN(parseFloat(principalPaid))
      ? Math.max(0, loan.remainingAmount - parseFloat(principalPaid))
      : loan.remainingAmount;

  const remainingMonthsAfterPayment =
    loan && loan.remainingMonths > 0 && remainingAfterPayment > 0
      ? Math.max(0, loan.remainingMonths - 1)
      : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Record Payment"
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
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{loan.name}</Text>
            <Text style={styles.summarySubtitle}>{loan.lender}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Amount *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Principal Portion *</Text>
                <TextInput
                  style={styles.input}
                  value={principalPaid}
                  onChangeText={setPrincipalPaid}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Interest Portion *</Text>
                <TextInput
                  style={styles.input}
                  value={interestPaid}
                  onChangeText={setInterestPaid}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={paymentDate}
                onChange={setPaymentDate}
                label="Payment Date *"
                placeholder="Select payment date"
                minimumDate={new Date(loan.startDate)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this payment"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
              />
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Preview</Text>
              <Text style={styles.previewText}>
                Remaining amount after this payment:{" "}
                <Text style={styles.previewValue}>
                  {remainingAfterPayment.toFixed(2)}
                </Text>
              </Text>
              <Text style={styles.previewText}>
                Remaining months after this payment:{" "}
                <Text style={styles.previewValue}>
                  {remainingMonthsAfterPayment}
                </Text>
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
                  <Text style={styles.saveButtonText}>Save Payment</Text>
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
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray500,
    },
    summary: {
      marginBottom: theme.spacing.base,
    },
    summaryTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    summarySubtitle: {
      marginTop: 2,
      fontSize: 13,
      color: theme.colors.gray500,
    },
    form: {
      gap: theme.spacing.base,
    },
    inputGroup: {
      gap: theme.spacing.sm,
    },
    inputRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    inputHalf: {
      flex: 1,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
    },
    input: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 48,
    },
    notesInput: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    previewCard: {
      padding: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.blueBackground,
      borderWidth: 1,
      borderColor: theme.colors.blueLight,
      gap: theme.spacing.xs,
    },
    previewTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.blueDark,
    },
    previewText: {
      fontSize: 13,
      color: theme.colors.blueDark,
    },
    previewValue: {
      fontWeight: theme.typography.fontWeight.bold,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.md,
      paddingVertical: theme.spacing.base,
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
      minHeight: 56,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
