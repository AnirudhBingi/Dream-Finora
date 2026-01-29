import React, { useEffect, useState, useMemo } from "react";
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
  updateAccount,
  deleteAccount,
  getAccountById,
  FinanceAccount,
  UpdateAccountDto,
} from "../api/financeApi";
import { MaterialIcons } from "@expo/vector-icons";
import {
  CurrencyPicker,
  SUPPORTED_CURRENCIES,
} from "../components/CurrencyPicker";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface EditAccountScreenProps {
  accountId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditAccountScreen({
  accountId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditAccountScreenProps) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [originalCurrency, setOriginalCurrency] = useState("USD");
  const [context, setContext] = useState<"local" | "home">("local");
  const [accountType, setAccountType] = useState("checking");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCurrencyWarning, setShowCurrencyWarning] = useState(false);

  const accountTypes = ["checking", "savings", "cash", "investment", "other"];

  const {
    data: account,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<FinanceAccount>({
    fetchFn: async () => {
      if (!token || !accountId)
        throw new Error("No authentication token or account ID");
      return getAccountById(token, accountId);
    },
    immediate: true,
    deps: [token, accountId],
    transform: (data: FinanceAccount) => {
      setName(data.name);
      setCurrency(data.currency || "USD");
      setOriginalCurrency(data.currency || "USD");
      setContext(data.context || "local");
      setAccountType(data.accountType || "checking");
      return data;
    },
  });

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error || "Failed to load account");
      onBack();
    }
  }, [error]);

  useEffect(() => {
    // Show warning if currency is different from original
    if (currency !== originalCurrency && account && account.balance !== 0) {
      setShowCurrencyWarning(true);
    } else {
      setShowCurrencyWarning(false);
    }
  }, [currency, originalCurrency, account]);

  async function handleSave() {
    if (!token || !account) return;

    if (!name.trim()) {
      Alert.alert("Error", "Please enter an account name");
      return;
    }

    // Warn about currency conversion if currency changed and balance is not zero
    if (currency !== originalCurrency && account.balance !== 0) {
      Alert.alert(
        "Currency Change",
        `Changing currency from ${originalCurrency} to ${currency} will convert your balance of ${formatCurrency(account.balance, originalCurrency)} to the new currency using current exchange rates. Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: async () => {
              await performUpdate();
            },
          },
        ],
      );
    } else {
      await performUpdate();
    }
  }

  async function performUpdate() {
    if (!token || !account) return;

    try {
      setSaving(true);

      const updateData: UpdateAccountDto = {
        name: name.trim(),
        currency: currency,
        context: context,
        accountType: accountType,
      };

      await updateAccount(token, accountId, updateData);

      Alert.alert("Success", "Account updated successfully!", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update account",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !account) return;

    // Check if account has transactions
    if (account.transactions && account.transactions.length > 0) {
      Alert.alert(
        "Cannot Delete Account",
        `This account has ${account.transactions.length} transaction(s). Please delete or move transactions before deleting the account.`,
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete this account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteAccount(token, accountId);
              Alert.alert("Success", "Account deleted successfully!", [
                { text: "OK", onPress: onSuccess },
              ]);
            } catch (err) {
              const errorMessage =
                err instanceof Error ? err.message : "Failed to delete account";
              Alert.alert("Error", errorMessage);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  function formatCurrency(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Account"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Account not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Account"
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
            {/* Account Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Main Account, Savings, Cash"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Currency */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Currency</Text>
              <CurrencyPicker
                selectedCurrency={currency}
                onSelectCurrency={setCurrency}
              />
              {showCurrencyWarning && (
                <View style={styles.warningBox}>
                  <MaterialIcons
                    name="warning"
                    size={20}
                    color={theme.colors.warning}
                  />
                  <Text style={styles.warningText}>
                    Changing currency will convert your balance from{" "}
                    {originalCurrency} to {currency} using current exchange
                    rates.
                  </Text>
                </View>
              )}
            </View>

            {/* Context */}
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

            {/* Account Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.accountTypeSelector}>
                  {accountTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.accountTypeButton,
                        accountType === type && styles.accountTypeButtonActive,
                      ]}
                      onPress={() => setAccountType(type)}
                    >
                      <Text
                        style={[
                          styles.accountTypeButtonText,
                          accountType === type &&
                            styles.accountTypeButtonTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Current Balance (read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Balance</Text>
              <View style={styles.balanceDisplay}>
                <Text style={styles.balanceAmount}>
                  {formatCurrency(account.balance, currency)}
                </Text>
              </View>
              <Text style={styles.helperText}>
                Balance is calculated from transactions. Editing transactions
                will update this balance.
              </Text>
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
                      color={theme.colors.white}
                    />
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                  </>
                )}
              </TouchableOpacity>
              {account.transactions && account.transactions.length > 0 && (
                <Text style={styles.deleteHelperText}>
                  This account has {account.transactions.length} transaction(s).
                  Delete or move them first.
                </Text>
              )}
            </View>
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
      color: theme.colors.textSecondary,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      marginBottom: theme.spacing.base,
    },
    form: {
      marginTop: 8,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.5,
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
    helperText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    warningBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: theme.colors.warningBackground,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    warningText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.warning,
      lineHeight: 20,
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
    accountTypeSelector: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    accountTypeButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      backgroundColor: theme.colors.background,
    },
    accountTypeButtonActive: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    accountTypeButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    accountTypeButtonTextActive: {
      color: theme.colors.white,
    },
    balanceDisplay: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    balanceAmount: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
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
      marginTop: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    dangerZoneTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.md,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    deleteButtonDisabled: {
      opacity: 0.5,
    },
    deleteButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    deleteHelperText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error,
      marginTop: theme.spacing.sm,
    },
  });
