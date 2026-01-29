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
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { CreateLoanDto, createLoan } from "../api/financeApi";
import { getProfile, Profile } from "../api/profileApi";
import { DatePicker } from "../components/DatePicker";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface CreateLoanScreenProps {
  context: "local" | "home";
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

type PaymentFrequency = "monthly" | "quarterly" | "yearly";

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
    form: {
      gap: theme.spacing.lg,
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
    readonlyField: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
    },
    readonlyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
    },
    placeholderText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray400,
    },
    frequencyScroll: {
      marginHorizontal: -theme.spacing.xl,
      paddingHorizontal: theme.spacing.xl,
    },
    frequencyContainer: {
      gap: theme.spacing.sm,
    },
    frequencyChip: {
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    frequencyChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    frequencyChipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    frequencyChipTextSelected: {
      color: theme.colors.white,
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

export function CreateLoanScreen({
  context,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreateLoanScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [lender, setLender] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [emi, setEmi] = useState("");
  const [startDate, setStartDate] = useState("");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>("monthly");

  const { data: profile } = useDataFetch<Profile>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getProfile(token);
    },
    immediate: true,
    deps: [token],
  });

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

  // Auto-calculate EMI when principal, interest rate, or term changes
  useEffect(() => {
    const principal = parseFloat(principalAmount);
    const rateAnnual = parseFloat(interestRate);
    const termMonths = parseInt(loanTerm, 10);

    if (
      !isNaN(principal) &&
      principal > 0 &&
      !isNaN(rateAnnual) &&
      rateAnnual >= 0 &&
      !isNaN(termMonths) &&
      termMonths > 0
    ) {
      const monthlyRate = rateAnnual / 12 / 100;
      let emiValue: number;

      if (monthlyRate === 0) {
        emiValue = principal / termMonths;
      } else {
        const factor = Math.pow(1 + monthlyRate, termMonths);
        emiValue = (principal * monthlyRate * factor) / (factor - 1);
      }

      setEmi(emiValue.toFixed(2));
    } else {
      setEmi("");
    }
  }, [principalAmount, interestRate, loanTerm]);

  const { execute: handleSave, loading: saving } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");

      if (!name.trim()) {
        throw new Error("Please enter a loan name");
      }

      if (!lender.trim()) {
        throw new Error("Please enter a lender name");
      }

      const principalNum = parseFloat(principalAmount);
      if (isNaN(principalNum) || principalNum <= 0) {
        throw new Error("Please enter a valid principal amount");
      }

      const rateNum = parseFloat(interestRate);
      if (isNaN(rateNum) || rateNum < 0) {
        throw new Error("Please enter a valid interest rate");
      }

      const termNum = parseInt(loanTerm, 10);
      if (isNaN(termNum) || termNum <= 0) {
        throw new Error("Please enter a valid loan term in months");
      }

      const emiNum = parseFloat(emi);
      if (isNaN(emiNum) || emiNum <= 0) {
        throw new Error(
          "EMI could not be calculated. Please check the inputs.",
        );
      }

      if (!startDate) {
        throw new Error("Please select a start date");
      }

      if (!nextPaymentDate) {
        throw new Error("Please select a next payment date");
      }

      const loanData: CreateLoanDto = {
        name: name.trim(),
        lender: lender.trim(),
        principalAmount: principalNum,
        remainingAmount: principalNum,
        interestRate: rateNum,
        emi: emiNum,
        loanTerm: termNum,
        remainingMonths: termNum,
        startDate,
        nextPaymentDate,
        paymentFrequency,
        context,
      };

      return createLoan(token, loanData);
    },
    onSuccess: () => {
      Alert.alert("Success", "Loan created successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

  const today = new Date();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={
          context === "local" ? "Create Local Loan" : "Create Home Country Loan"
        }
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
              <Text style={styles.label}>Loan Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Home Loan, Car Loan"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lender *</Text>
              <TextInput
                style={styles.input}
                value={lender}
                onChangeText={setLender}
                placeholder="e.g., Bank of America"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Principal Amount *</Text>
              <TextInput
                style={styles.input}
                value={principalAmount}
                onChangeText={setPrincipalAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Interest Rate (Annual, %) *</Text>
                <TextInput
                  style={styles.input}
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="e.g., 6.5"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Loan Term (Months) *</Text>
                <TextInput
                  style={styles.input}
                  value={loanTerm}
                  onChangeText={setLoanTerm}
                  placeholder="e.g., 60"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Calculated EMI</Text>
              <View style={styles.readonlyField}>
                <Text
                  style={emi ? styles.readonlyText : styles.placeholderText}
                >
                  {emi
                    ? `${getCurrencySymbol()}${emi}`
                    : "Enter principal, rate, and term to calculate"}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                label="Start Date *"
                placeholder="Select start date"
                minimumDate={today}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Frequency *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.frequencyScroll}
                contentContainerStyle={styles.frequencyContainer}
              >
                {(["monthly", "quarterly", "yearly"] as PaymentFrequency[]).map(
                  (freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyChip,
                        paymentFrequency === freq &&
                          styles.frequencyChipSelected,
                      ]}
                      onPress={() => setPaymentFrequency(freq)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.frequencyChipText,
                          paymentFrequency === freq &&
                            styles.frequencyChipTextSelected,
                        ]}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <DatePicker
                value={nextPaymentDate}
                onChange={setNextPaymentDate}
                label="Next Payment Date *"
                placeholder="Select next payment date"
                minimumDate={startDate ? new Date(startDate) : today}
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
                  <Text style={styles.saveButtonText}>Create Loan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
