import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getBalances,
  simplifyDebts,
  BalanceInfo,
  SimplifiedDebtsResponse,
} from "../api/expenseApi";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { EmptyState } from "../components/EmptyState";
import { Avatar } from "../components/Avatar";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme } from "../theme";

interface BalanceSummaryScreenProps {
  onBack: () => void;
  onSettleUp: (payeeId: string, amount: number, payeeName: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function BalanceSummaryScreen({
  onBack,
  onSettleUp,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: BalanceSummaryScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [simplifiedDebts, setSimplifiedDebts] =
    useState<SimplifiedDebtsResponse | null>(null);
  const [showSimplified, setShowSimplified] = useState(false);
  const [sortBy, setSortBy] = useState<"amount" | "name">("amount");
  const [showSortOptions, setShowSortOptions] = useState(false);

  const {
    data: balances,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<BalanceInfo>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getBalances(token);
    },
    immediate: true,
    deps: [token],
  });

  const { execute: executeSimplifyDebts, loading: loadingSimplified } =
    useAsyncOperation<SimplifiedDebtsResponse, void>({
      operationFn: async () => {
        if (!token) throw new Error("No authentication token");

        // First, refresh balances to ensure we have the latest data
        await refetch();

        // Get fresh balances after refetch
        const balancesData = await getBalances(token);
        if (
          !balancesData ||
          (balancesData.totalOwed === 0 && balancesData.totalOwedToUser === 0)
        ) {
          throw new Error("No debts to simplify. All balances are settled.");
        }

        const simplified = await simplifyDebts(token);

        // Validate the response
        if (!simplified || !simplified.simplifiedDebts) {
          throw new Error("Invalid response from server");
        }

        // Check if there are any simplified debts
        if (
          !simplified.simplifiedDebts ||
          simplified.simplifiedDebts.length === 0
        ) {
          throw new Error("No debts can be simplified at this time.");
        }

        // Check if all users are present in the response
        const hasMissingUsers = simplified.simplifiedDebts.some(
          (debt) => !debt.fromUser || !debt.toUser,
        );

        if (hasMissingUsers) {
          throw new Error(
            "Some users are not available in the simplified debt calculation",
          );
        }

        return simplified;
      },
      onSuccess: (simplified) => {
        if (simplified) {
          setSimplifiedDebts(simplified);
          setShowSimplified(true);
        }
      },
      onError: () => {
        setShowSimplified(false);
      },
    });

  function handleSimplifyDebts() {
    executeSimplifyDebts();
  }

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  const primaryCurrency = balances?.primaryCurrency || "USD";

  function getUserDisplayName(
    user: BalanceInfo["owedByUser"][0]["user"],
  ): string {
    return user.profile?.displayName || user.email;
  }

  // Sort balances
  const sortedOwedToUser = useMemo(() => {
    if (!balances) return [];
    const sorted = [...balances.owedToUser];
    if (sortBy === "amount") {
      return sorted.sort((a, b) => b.amount - a.amount);
    } else {
      return sorted.sort((a, b) => {
        const nameA = getUserDisplayName(a.user).toLowerCase();
        const nameB = getUserDisplayName(b.user).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
  }, [balances?.owedToUser, sortBy]);

  const sortedOwedByUser = useMemo(() => {
    if (!balances) return [];
    const sorted = [...balances.owedByUser];
    if (sortBy === "amount") {
      return sorted.sort((a, b) => b.amount - a.amount);
    } else {
      return sorted.sort((a, b) => {
        const nameA = getUserDisplayName(a.user).toLowerCase();
        const nameB = getUserDisplayName(b.user).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
  }, [balances?.owedByUser, sortBy]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading balances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!balances) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No balance data available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Balances"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        rightActions={
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortOptions(!showSortOptions)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="sort" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
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

          {/* Sort Options */}
          {showSortOptions && (
            <View style={styles.sortOptionsContainer}>
              <Text style={styles.sortOptionsTitle}>Sort by</Text>
              <View style={styles.sortOptionsRow}>
                {(["amount", "name"] as const).map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={[
                      styles.sortOption,
                      sortBy === sort && styles.sortOptionActive,
                    ]}
                    onPress={() => {
                      setSortBy(sort);
                      setShowSortOptions(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === sort && styles.sortOptionTextActive,
                      ]}
                    >
                      {sort === "amount" ? "Amount" : "Name"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Summary Card */}
          {balances && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Your Balances</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>You owe:</Text>
                <View style={styles.amountWithCurrency}>
                  <Text style={[styles.summaryAmount, styles.summaryNegative]}>
                    {formatCurrency(balances.totalOwed, primaryCurrency)}
                  </Text>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>
                      {primaryCurrency}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Owed to you:</Text>
                <View style={styles.amountWithCurrency}>
                  <Text style={[styles.summaryAmount, styles.summaryPositive]}>
                    {formatCurrency(balances.totalOwedToUser, primaryCurrency)}
                  </Text>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>
                      {primaryCurrency}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.summaryRow, styles.netBalanceRow]}>
                <Text style={styles.summaryLabel}>Net balance:</Text>
                <View style={styles.amountWithCurrency}>
                  <Text
                    style={[
                      styles.summaryAmount,
                      balances.netBalance >= 0
                        ? styles.summaryPositive
                        : styles.summaryNegative,
                    ]}
                  >
                    {formatCurrency(
                      Math.abs(balances.netBalance),
                      primaryCurrency,
                    )}
                    {balances.netBalance >= 0 ? " owed to you" : " you owe"}
                  </Text>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>
                      {primaryCurrency}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Simplify Debts Button */}
          {balances &&
            (balances.totalOwed > 0 || balances.totalOwedToUser > 0) && (
              <TouchableOpacity
                style={styles.simplifyButton}
                onPress={handleSimplifyDebts}
                disabled={loadingSimplified}
                activeOpacity={0.7}
              >
                {loadingSimplified ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <View style={styles.simplifyButtonContent}>
                    <MaterialIcons
                      name="account-tree"
                      size={18}
                      color={theme.colors.white}
                    />
                    <View style={styles.simplifyButtonTextContainer}>
                      <Text style={styles.simplifyButtonText}>
                        Simplify Debts
                      </Text>
                      {simplifiedDebts && (
                        <Text style={styles.simplifyButtonSubtext}>
                          {simplifiedDebts.originalCount} →{" "}
                          {simplifiedDebts.simplifiedCount} transactions
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}

          {/* Simplified Debts View */}
          {showSimplified &&
            simplifiedDebts &&
            simplifiedDebts.simplifiedDebts.length > 0 && (
              <View style={styles.simplifiedCard}>
                <View style={styles.simplifiedHeader}>
                  <Text style={styles.simplifiedTitle}>Simplified Debts</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowSimplified(false)}
                  >
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.simplifiedSubtext}>
                  This reduces {simplifiedDebts.originalCount} transactions to{" "}
                  {simplifiedDebts.simplifiedCount}
                </Text>
                {simplifiedDebts.simplifiedDebts.map((debt, index) => (
                  <View key={index} style={styles.simplifiedDebtRow}>
                    <Text style={styles.simplifiedDebtText}>
                      {getUserDisplayName(debt.fromUser)} →{" "}
                      {getUserDisplayName(debt.toUser)}
                    </Text>
                    <Text style={styles.simplifiedDebtAmount}>
                      {formatCurrency(debt.amount, primaryCurrency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

          {/* Owed to You Section */}
          {balances && sortedOwedToUser.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owed to You</Text>
              {sortedOwedToUser.map((item, index) => (
                <View key={index} style={styles.personCard}>
                  <View style={styles.personInfo}>
                    <Avatar
                      avatarUrl={item.user?.profile?.avatarUrl}
                      displayName={getUserDisplayName(item.user)}
                      size={40}
                    />
                    <View style={styles.personDetails}>
                      <Text style={styles.personName}>
                        {getUserDisplayName(item.user)}
                      </Text>
                      <Text style={styles.personAmount}>
                        {formatCurrency(item.amount, primaryCurrency)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() =>
                      onSettleUp(
                        item?.user?.id || "",
                        item.amount,
                        getUserDisplayName(item.user),
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.settleButtonText}>Settle Up</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* You Owe Section */}
          {balances && sortedOwedByUser.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You Owe</Text>
              {sortedOwedByUser.map((item, index) => (
                <View key={index} style={styles.personCard}>
                  <View style={styles.personInfo}>
                    <Avatar
                      avatarUrl={item.user?.profile?.avatarUrl}
                      displayName={getUserDisplayName(item.user)}
                      size={40}
                    />
                    <View style={styles.personDetails}>
                      <Text style={styles.personName}>
                        {getUserDisplayName(item.user)}
                      </Text>
                      <Text
                        style={[
                          styles.personAmount,
                          styles.personAmountNegative,
                        ]}
                      >
                        {formatCurrency(item.amount, primaryCurrency)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() =>
                      onSettleUp(
                        item?.user?.id || "",
                        item.amount,
                        getUserDisplayName(item.user),
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.settleButtonText}>Settle Up</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {balances &&
            balances.owedToUser.length === 0 &&
            balances.owedByUser.length === 0 && (
              <EmptyState
                icon="check-circle"
                title="All settled up! 🎉"
                message="You don't owe anyone and no one owes you. Keep up the great work!"
              />
            )}
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
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    },
    sortButton: {
      padding: theme.spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    sortOptionsContainer: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sortOptionsTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.md,
    },
    sortOptionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    sortOption: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    sortOptionActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    sortOptionText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    sortOptionTextActive: {
      color: theme.colors.textInverse,
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
    errorContainer: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: 8,
      marginBottom: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 8,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    summaryCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
      letterSpacing: -0.3,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    netBalanceRow: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    summaryLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    summaryAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    amountWithCurrency: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    currencyBadge: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 6,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    currencyBadgeText: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
    },
    summaryPositive: {
      color: theme.colors.success,
    },
    summaryNegative: {
      color: theme.colors.error,
    },
    simplifyButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      marginBottom: theme.spacing.base,
      minHeight: 44,
      justifyContent: "center",
      ...theme.shadows.button,
    },
    simplifyButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    simplifyButtonTextContainer: {
      flex: 1,
    },
    simplifyButtonText: {
      color: theme.colors.textInverse,
      fontSize: 15,
      fontWeight: "600",
    },
    simplifyButtonSubtext: {
      color: theme.colors.white,
      fontSize: 11,
      opacity: 0.9,
      marginTop: 2,
    },
    simplifiedCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    simplifiedHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    simplifiedTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    closeButton: {
      padding: 4,
      minWidth: 32,
      minHeight: 32,
      justifyContent: "center",
      alignItems: "center",
    },
    closeButtonText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    simplifiedSubtext: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 12,
      fontWeight: "500",
    },
    simplifiedDebtRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    simplifiedDebtText: {
      fontSize: 14,
      color: theme.colors.textPrimary,
      flex: 1,
      fontWeight: "500",
    },
    simplifiedDebtAmount: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 12,
      letterSpacing: -0.3,
    },
    personCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 14,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      ...theme.shadows.sm,
    },
    personInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: theme.spacing.md,
    },
    personDetails: {
      flex: 1,
    },
    personName: {
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.2,
    },
    personAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.success,
      letterSpacing: -0.3,
    },
    personAmountNegative: {
      color: theme.colors.error,
    },
    settleButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      minHeight: 44,
      justifyContent: "center",
      ...theme.shadows.button,
    },
    settleButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyContainer: {
      alignItems: "center",
      padding: theme.spacing["2xl"],
    },
    emptyText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
  });
}
