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
import { useAuth } from "../auth/authContext";
import {
  getBalance,
  getCombinedBalance,
  getTransactions,
  BalanceInfo,
  CombinedBalanceInfo,
  FinanceTransaction,
} from "../api/financeApi";
import { getProfile } from "../api/profileApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { ErrorState } from "../components/ErrorState";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "../components/SegmentedControl";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface FinanceScreenProps {
  onAddIncome: (context: "local" | "home") => void;
  onAddExpense: (context: "local" | "home") => void;
  onViewBudgets: (context: "local" | "home") => void;
  onViewGoals: (context: "local" | "home") => void;
  onViewLoans: (context: "local" | "home") => void;
  onViewAdvisor: (context: "local" | "home") => void;
  onEditTransaction?: (transactionId: string) => void;
  onViewHistory?: (context?: "local" | "home") => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FinanceScreen({
  onAddIncome,
  onAddExpense,
  onViewBudgets,
  onViewGoals,
  onViewLoans,
  onViewAdvisor,
  onEditTransaction,
  onViewHistory,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FinanceScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [context, setContext] = useState<"local" | "home">("local");
  const [primaryCurrency, setPrimaryCurrency] = useState<string>("USD");
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>("USD");

  interface FinanceData {
    balance: BalanceInfo;
    combinedBalance: CombinedBalanceInfo;
    transactions: FinanceTransaction[];
  }

  const { data, loading, refreshing, error, refresh, refetch } =
    useDataFetch<FinanceData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        const currency =
          context === "local" ? primaryCurrency : homeCountryCurrency;
        const [balanceData, transactionsData, combinedBalanceData] =
          await Promise.all([
            getBalance(token, context, context === "local"), // Include Billchop for local
            getTransactions(token, context, context === "local"), // Include Billchop for local
            getCombinedBalance(token, primaryCurrency), // Get combined balance with currency conversion
          ]);
        return {
          balance: balanceData,
          combinedBalance: combinedBalanceData,
          transactions: transactionsData,
        };
      },
      immediate: false, // Wait for currencies to load
      deps: [token, context, primaryCurrency, homeCountryCurrency],
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
      } catch (err) {
        setPrimaryCurrency("USD");
        setHomeCountryCurrency("USD");
      }
    }
    loadCurrencies();
  }, [token]);

  useEffect(() => {
    if (primaryCurrency && homeCountryCurrency) {
      refetch();
    }
  }, [primaryCurrency, homeCountryCurrency]);

  const balance = data?.balance ?? null;
  const combinedBalance = data?.combinedBalance ?? null;
  const transactions = data?.transactions ?? [];

  function formatCurrency(
    amount: number | undefined | null,
    currency?: string,
  ): string {
    if (amount === undefined || amount === null || isNaN(amount))
      return "$0.00";
    const displayCurrency =
      currency ||
      (context === "local" ? primaryCurrency : homeCountryCurrency) ||
      "USD";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: displayCurrency,
      }).format(amount);
    } catch (e) {
      // Fallback if currency format fails
      return `$${amount.toFixed(2)}`;
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="My Wallet"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="My Wallet"
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

          {/* Context Toggle */}
          <SegmentedControl
            options={[
              { value: "local", label: "Local Finance", icon: "location-on" },
              { value: "home", label: "Home Country", icon: "home" },
            ]}
            value={context}
            onChange={(value) => setContext(value as "local" | "home")}
            style={styles.contextToggle}
          />

          {/* Combined Total Balance Card */}
          {combinedBalance && (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>Total Available Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(combinedBalance.combinedTotal, primaryCurrency)}
              </Text>
              <View style={styles.balanceBreakdown}>
                <Text style={styles.balanceSubtext}>
                  Local ({combinedBalance.localBalance.currency || "USD"}):{" "}
                  {formatCurrency(
                    combinedBalance.localBalance.amount,
                    combinedBalance.localBalance.currency,
                  )}
                </Text>
                <Text style={styles.balanceSubtext}>
                  Home ({combinedBalance.homeBalance.currency || "USD"}):{" "}
                  {formatCurrency(
                    combinedBalance.homeBalance.amount,
                    combinedBalance.homeBalance.currency,
                  )}
                  {combinedBalance.homeBalance.currency !== primaryCurrency ? (
                    <Text style={styles.balanceSubtext}>
                      {" "}
                      ≈{" "}
                      {formatCurrency(
                        combinedBalance.homeBalance.convertedAmount,
                        primaryCurrency,
                      )}
                    </Text>
                  ) : null}
                </Text>
              </View>
            </View>
          )}

          {/* Context-Specific Balance Card */}
          {balance && (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>
                {context === "local" ? "Local" : "Home Country"} Balance
              </Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(balance.totalBalance)}
              </Text>
              {context === "local" &&
              balance.billchopBalance &&
              balance.billchopBalance > 0 ? (
                <View style={styles.balanceBreakdown}>
                  <Text style={styles.balanceSubtext}>
                    Finance:{" "}
                    {formatCurrency(
                      balance.totalBalance - balance.billchopBalance,
                    )}
                  </Text>
                  <Text style={styles.balanceSubtext}>
                    Billchop: {formatCurrency(balance.billchopBalance)}
                  </Text>
                  <Text style={styles.balanceTotal}>
                    Total Available:{" "}
                    {formatCurrency(balance.totalAvailableBalance)}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.moneyInButton]}
              onPress={() => onAddIncome(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-downward"
                size={24}
                color={theme.colors.white}
              />
              <Text style={styles.actionButtonText}>Money In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.spentOnButton]}
              onPress={() => onAddExpense(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-upward"
                size={24}
                color={theme.colors.white}
              />
              <Text style={styles.actionButtonText}>Spent On</Text>
            </TouchableOpacity>
          </View>

          {/* Budgets, Goals & Loans Buttons */}
          <View style={styles.financeActionsContainer}>
            <TouchableOpacity
              style={styles.financeActionButton}
              onPress={() => onViewBudgets(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="account-balance-wallet"
                size={24}
                color={theme.colors.blue}
              />
              <Text style={styles.financeActionButtonText}>Budgets</Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.financeActionButton}
              onPress={() => onViewGoals(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="flag"
                size={24}
                color={theme.colors.success}
              />
              <Text style={styles.financeActionButtonText}>Goals</Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.financeActionButton}
              onPress={() => onViewLoans(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="account-balance"
                size={24}
                color={theme.colors.warning}
              />
              <Text style={styles.financeActionButtonText}>Loans</Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.financeActionButton}
              onPress={() => onViewAdvisor(context)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="psychology"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.financeActionButtonText}>AI Advisor</Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Transactions List */}
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <View style={styles.transactionsHeaderActions}>
              {onViewHistory && (
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => onViewHistory(context)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="history"
                    size={20}
                    color={theme.colors.blue}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => {
                  // TODO: Add filter options (all, income, expense)
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="filter-list"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="receipt-long"
                size={48}
                color={theme.colors.borderDark}
              />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first transaction to start tracking your{" "}
                {context === "local" ? "local" : "home country"} finances!
              </Text>
              <View style={styles.emptyActionButtons}>
                <TouchableOpacity
                  style={[styles.emptyActionButton, styles.emptyMoneyInButton]}
                  onPress={() => onAddIncome(context)}
                >
                  <MaterialIcons
                    name="arrow-downward"
                    size={20}
                    color={theme.colors.white}
                  />
                  <Text style={styles.emptyActionButtonText}>Money In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emptyActionButton, styles.emptySpentOnButton]}
                  onPress={() => onAddExpense(context)}
                >
                  <MaterialIcons
                    name="arrow-upward"
                    size={20}
                    color={theme.colors.white}
                  />
                  <Text style={styles.emptyActionButtonText}>Spent On</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                activeOpacity={0.7}
                onPress={() => onEditTransaction?.(transaction.id)}
              >
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIcon,
                        transaction.type === "income"
                          ? styles.transactionIconIncome
                          : styles.transactionIconExpense,
                      ]}
                    >
                      <MaterialIcons
                        name={
                          transaction.type === "income"
                            ? "arrow-downward"
                            : "arrow-upward"
                        }
                        size={20}
                        color={theme.colors.white}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text
                        style={styles.transactionDescription}
                        numberOfLines={1}
                      >
                        {transaction.description ||
                          (transaction.type === "income"
                            ? transaction.source || "Income"
                            : transaction.category || "Expense")}
                      </Text>
                      <View style={styles.transactionMeta}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          {transaction.type === "income" &&
                            transaction.source && (
                              <Text style={styles.transactionMetaText}>
                                {transaction.source} •{" "}
                              </Text>
                            )}
                          {transaction.type === "expense" &&
                            transaction.category && (
                              <Text style={styles.transactionMetaText}>
                                {transaction.category} •{" "}
                              </Text>
                            )}
                          {transaction.date && (
                            <Text style={styles.transactionMetaText}>
                              {formatDate(transaction.date)}
                            </Text>
                          )}
                          {transaction.expenseSplit && (
                            <>
                              <Text style={styles.transactionMetaText}>
                                {" "}
                                •{" "}
                              </Text>
                              <MaterialIcons
                                name="receipt"
                                size={12}
                                color={theme.colors.textSecondary}
                              />
                              <Text style={styles.transactionMetaText}>
                                {" "}
                                Billchop
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.type === "income"
                        ? styles.transactionAmountIncome
                        : styles.transactionAmountExpense,
                    ]}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </Text>
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
      backgroundColor: theme.colors.backgroundSecondary,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
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
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error,
      marginBottom: 8,
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
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: "500",
    },
    contextToggle: {
      marginBottom: theme.spacing.xl,
    },
    balanceCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.xl,
      alignItems: "center",
    },
    balanceTitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    balanceBreakdown: {
      width: "100%",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    balanceSubtext: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 4,
    },
    balanceTotal: {
      fontSize: 14,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
      marginTop: 4,
    },
    actionButtonsContainer: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    financeActionsContainer: {
      gap: 12,
      marginBottom: theme.spacing.xl,
    },
    financeActionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 56,
    },
    financeActionButtonText: {
      flex: 1,
      marginLeft: 12,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
      minHeight: 56,
    },
    moneyInButton: {
      backgroundColor: theme.colors.success,
    },
    spentOnButton: {
      backgroundColor: theme.colors.error,
    },
    actionButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    transactionsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    transactionsHeaderActions: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    historyButton: {
      padding: 8,
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    filterButton: {
      padding: 8,
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginTop: theme.spacing.base,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.xl,
    },
    emptyActionButtons: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    emptyActionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 6,
      minHeight: 44,
    },
    emptyMoneyInButton: {
      backgroundColor: theme.colors.success,
    },
    emptySpentOnButton: {
      backgroundColor: theme.colors.error,
    },
    emptyActionButtonText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    transactionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    transactionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    transactionLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    transactionIconIncome: {
      backgroundColor: theme.colors.success,
    },
    transactionIconExpense: {
      backgroundColor: theme.colors.error,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDescription: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: "500",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    transactionMeta: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    transactionMetaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    transactionAmount: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    transactionAmountIncome: {
      color: theme.colors.success,
    },
    transactionAmountExpense: {
      color: theme.colors.error,
    },
  });
