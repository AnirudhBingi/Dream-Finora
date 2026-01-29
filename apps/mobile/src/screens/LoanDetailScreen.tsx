import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getLoanById, Loan, deleteLoan, updateLoan } from "../api/financeApi";
import { getProfile } from "../api/profileApi";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { Header } from "../components/Header";
import { useTheme } from "../theme";

interface LoanDetailScreenProps {
  loanId: string;
  onBack: () => void;
  onRecordPayment: () => void;
  onLoanUpdated: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function LoanDetailScreen({
  loanId,
  onBack,
  onRecordPayment,
  onLoanUpdated,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: LoanDetailScreenProps) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [saving, setSaving] = useState(false);
  const [primaryCurrency, setPrimaryCurrency] = useState<string>("USD");
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>("USD");

  const {
    data: loan,
    loading,
    error,
    refresh,
    refetch,
  } = useDataFetch<Loan>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getLoanById(token, loanId);
    },
    immediate: true,
    deps: [token, loanId],
  });

  useEffect(() => {
    async function loadCurrencies() {
      if (!token) return;
      try {
        const profile = await getProfile(token);
        if (profile) {
          setPrimaryCurrency(profile.primaryCurrency || "USD");
          setHomeCountryCurrency(profile.homeCountryCurrency || "USD");
        } else {
          setPrimaryCurrency("USD");
          setHomeCountryCurrency("USD");
        }
      } catch {
        setPrimaryCurrency("USD");
        setHomeCountryCurrency("USD");
      }
    }
    loadCurrencies();
  }, [token]);

  function formatCurrency(amount: number | undefined | null): string {
    if (!loan || amount === undefined || amount === null || isNaN(amount)) {
      return "$0.00";
    }
    const displayCurrency =
      loan.context === "local" ? primaryCurrency : homeCountryCurrency;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
    }).format(amount);
  }

  function formatDate(dateString: string | undefined | null): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  }

  function getStatusLabel(status: Loan["status"]): string {
    switch (status) {
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      case "paused":
        return "Paused";
      default:
        return status;
    }
  }

  async function handleMarkCompleted() {
    if (!token || !loan) return;

    Alert.alert(
      "Mark as completed",
      "Are you sure this loan is fully paid off?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, mark completed",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await updateLoan(token, loan.id, { status: "completed" });
              await refetch();
              onLoanUpdated();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to update loan status",
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  async function handleDelete() {
    if (!token || !loan) return;

    Alert.alert(
      "Delete loan",
      "Are you sure you want to delete this loan? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await deleteLoan(token, loan.id);
              onLoanUpdated();
              onBack();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to delete loan",
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.blue}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loan Details</Text>
          <View style={styles.placeholder} />
        </View>
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.blue}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loan Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState message={error || "Loan not found"} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const totalPaid = loan.principalAmount - loan.remainingAmount;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Loan Details"
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
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Loan Header */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.loanName}>{loan.name}</Text>
                <Text style={styles.loanLender}>{loan.lender}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  loan.status === "active"
                    ? styles.statusBadgeActive
                    : loan.status === "completed"
                      ? styles.statusBadgeCompleted
                      : styles.statusBadgePaused,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {getStatusLabel(loan.status)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Remaining</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(loan.remainingAmount)}
                </Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Principal</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(loan.principalAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Paid so far</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(totalPaid)}
                </Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Interest Rate</Text>
                <Text style={styles.summaryValue}>
                  {loan.interestRate}% p.a.
                </Text>
              </View>
            </View>
          </View>

          {/* EMI Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EMI Overview</Text>
            <View style={styles.emiRow}>
              <View style={styles.emiItem}>
                <Text style={styles.emiLabel}>EMI Amount</Text>
                <Text style={styles.emiValue}>{formatCurrency(loan.emi)}</Text>
              </View>
              <View style={styles.emiItem}>
                <Text style={styles.emiLabel}>Remaining Months</Text>
                <Text style={styles.emiValue}>{loan.remainingMonths}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialIcons
                  name="event"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.metaText}>
                  Started {formatDate(loan.startDate) || "N/A"}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons
                  name="date-range"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.metaText}>
                  Next Payment {formatDate(loan.nextPaymentDate) || "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* Payments History */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Recent Payments</Text>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={onRecordPayment}
                disabled={saving}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="add"
                  size={18}
                  color={theme.colors.white}
                />
                <Text style={styles.smallButtonText}>Record Payment</Text>
              </TouchableOpacity>
            </View>

            {loan.payments && loan.payments.length > 0 ? (
              loan.payments.map((payment) => (
                <View key={payment.id} style={styles.paymentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                    <Text style={styles.paymentMeta}>
                      {formatDate(payment.paymentDate)} • Principal{" "}
                      {formatCurrency(payment.principalPaid)} • Interest{" "}
                      {formatCurrency(payment.interestPaid)}
                    </Text>
                    {payment.notes && (
                      <Text style={styles.paymentNotes} numberOfLines={1}>
                        {payment.notes}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyTextSmall}>
                No payments recorded yet. Record your first EMI to start
                tracking.
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {loan.status === "active" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleMarkCompleted}
                disabled={saving}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={theme.colors.success}
                />
                <Text style={styles.completeButtonText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={saving}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="delete"
                size={20}
                color={theme.colors.error}
              />
              <Text style={styles.deleteButtonText}>Delete Loan</Text>
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
      paddingHorizontal: theme.spacing.xl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center",
    },
    placeholder: {
      width: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      gap: theme.spacing.base,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray500,
    },
    errorContainer: {
      marginBottom: theme.spacing.base,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.errorBackground,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
    },
    summaryCard: {
      padding: theme.spacing.base,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.base,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    loanName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    loanLender: {
      marginTop: 2,
      fontSize: 13,
      color: theme.colors.gray500,
    },
    statusBadge: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: 10,
      borderRadius: 999,
    },
    statusBadgeActive: {
      backgroundColor: theme.colors.successBackground,
    },
    statusBadgeCompleted: {
      backgroundColor: theme.colors.blueBackground,
    },
    statusBadgePaused: {
      backgroundColor: theme.colors.warningBackground,
    },
    statusBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
    },
    summaryColumn: {
      flex: 1,
    },
    summaryLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
    },
    summaryValue: {
      marginTop: 2,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    card: {
      padding: theme.spacing.base,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.base,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    emiRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.xs,
    },
    emiItem: {
      flex: 1,
    },
    emiLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
    },
    emiValue: {
      marginTop: 2,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing.md,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    metaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    smallButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: theme.colors.blue,
      gap: theme.spacing.xs,
    },
    smallButtonText: {
      color: theme.colors.white,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.medium,
    },
    paymentRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    paymentAmount: {
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    paymentMeta: {
      marginTop: 2,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
    },
    paymentNotes: {
      marginTop: 2,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray600,
    },
    emptyTextSmall: {
      fontSize: 13,
      color: theme.colors.gray500,
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      gap: 6,
    },
    completeButton: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.successBackground,
    },
    completeButtonText: {
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    deleteButton: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorBackground,
    },
    deleteButtonText: {
      color: theme.colors.error,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
