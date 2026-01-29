import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getLoans, Loan } from "../api/financeApi";
import { getProfile } from "../api/profileApi";
import { SkeletonLoanList } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { Header } from "../components/Header";
import { useTheme } from "../theme";

interface LoansListScreenProps {
  context: "local" | "home";
  onCreateLoan: () => void;
  onViewLoan: (loanId: string) => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

type LoanStatusFilter = "all" | "active" | "completed" | "paused";

export function LoansListScreen({
  context,
  onCreateLoan,
  onViewLoan,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: LoansListScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState<LoanStatusFilter>("active");
  const [primaryCurrency, setPrimaryCurrency] = useState<string>("USD");
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>("USD");

  const {
    data: loans,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<Loan[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      const status = statusFilter === "all" ? undefined : statusFilter;
      return getLoans(token, context, status);
    },
    immediate: true,
    deps: [token, context, statusFilter],
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
    if (amount === undefined || amount === null || isNaN(amount)) {
      const displayCurrency =
        context === "local" ? primaryCurrency : homeCountryCurrency;
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: displayCurrency,
      }).format(0);
    }
    const displayCurrency =
      context === "local" ? primaryCurrency : homeCountryCurrency;
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title={context === "local" ? "Local Loans" : "Home Country Loans"}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading loans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={context === "local" ? "Local Loans" : "Home Country Loans"}
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.contextBadge}>
            <MaterialIcons
              name={context === "local" ? "location-on" : "home"}
              size={16}
              color={theme.colors.blue}
            />
            <Text style={styles.contextBadgeText}>
              {context === "local" ? "Local Finance" : "Home Country Finance"}
            </Text>
          </View>

          {/* Status Filter */}
          <View style={styles.filterContainer}>
            {(
              ["all", "active", "completed", "paused"] as LoanStatusFilter[]
            ).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  statusFilter === filter && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(filter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === filter && styles.filterChipTextActive,
                  ]}
                >
                  {filter === "all"
                    ? "All"
                    : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Loan Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={onCreateLoan}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.white} />
            <Text style={styles.addButtonText}>Add Loan</Text>
          </TouchableOpacity>

          {/* Loans List */}
          {!loans || loans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="account-balance"
                size={48}
                color={theme.colors.borderDark}
              />
              <Text style={styles.emptyText}>No loans yet</Text>
              <Text style={styles.emptySubtext}>
                Track your home, car, student, or personal loans in one place.
              </Text>
            </View>
          ) : (
            loans.map((loan) => (
              <TouchableOpacity
                key={loan.id}
                style={styles.loanCard}
                onPress={() => onViewLoan(loan.id)}
                activeOpacity={0.7}
              >
                <View style={styles.loanHeader}>
                  <View style={styles.loanTitleContainer}>
                    <Text style={styles.loanName} numberOfLines={1}>
                      {loan.name}
                    </Text>
                    <Text style={styles.loanLender} numberOfLines={1}>
                      {loan.lender}
                    </Text>
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

                <View style={styles.loanAmountsRow}>
                  <View style={styles.amountColumn}>
                    <Text style={styles.amountLabel}>Remaining</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(loan.remainingAmount)}
                    </Text>
                  </View>
                  <View style={styles.amountColumn}>
                    <Text style={styles.amountLabel}>EMI</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(loan.emi)}
                    </Text>
                  </View>
                </View>

                <View style={styles.loanMetaRow}>
                  <View style={styles.metaItem}>
                    <MaterialIcons
                      name="date-range"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      Next: {formatDate(loan.nextPaymentDate) || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MaterialIcons
                      name="schedule"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      {loan.remainingMonths} months left
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
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
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      alignSelf: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 6,
      backgroundColor: theme.colors.error,
    },
    retryButtonText: {
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.medium,
    },
    contextBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: theme.colors.blueBackground,
      marginBottom: theme.spacing.base,
      gap: 6,
    },
    contextBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.blueDark,
      fontWeight: theme.typography.fontWeight.medium,
    },
    filterContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: theme.spacing.base,
      gap: theme.spacing.sm,
    },
    filterChip: {
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    filterChipActive: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    filterChipText: {
      fontSize: 13,
      color: theme.colors.gray600,
      fontWeight: theme.typography.fontWeight.medium,
    },
    filterChipTextActive: {
      color: theme.colors.white,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      marginBottom: theme.spacing.base,
      gap: theme.spacing.sm,
    },
    addButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: theme.spacing.base,
    },
    emptyText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    emptySubtext: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray500,
      textAlign: "center",
    },
    loanCard: {
      padding: theme.spacing.base,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    loanHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    loanTitleContainer: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    loanName: {
      fontSize: theme.typography.fontSize.base,
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
    loanAmountsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
    },
    amountColumn: {
      flex: 1,
    },
    amountLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
    },
    amountValue: {
      marginTop: 2,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    loanMetaRow: {
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
  });
