import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getExpenseHistory,
  ExpenseHistory,
  getExpenses,
  Expense,
  getSettlements,
  Settlement,
} from "../api/expenseApi";
import { getRides, Ride } from "../api/rideApi";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { Icon } from "../components/Icon";
import { getAvatarUrl } from "../utils/avatar";
import { useTheme } from "../theme";

interface ExpenseHistoryScreenProps {
  expenseId?: string; // Made optional to support all history view
  onBack: () => void;
  onNavigateToRide?: (rideId: string) => void;
  onNavigateToExpense?: (expenseId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

type TransactionType =
  | "expense"
  | "settlement"
  | "rideshare"
  | "expense_history";

interface UnifiedTransaction {
  id: string;
  type: TransactionType;
  date: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  // Expense fields
  expense?: Expense;
  expenseHistory?: ExpenseHistory;
  // Settlement fields
  settlement?: Settlement;
  // Ride fields
  ride?: Ride;
  // Common fields
  description?: string;
  amount?: number;
  currency?: string;
}

export function ExpenseHistoryScreen({
  expenseId,
  onBack,
  onNavigateToRide,
  onNavigateToExpense,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ExpenseHistoryScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<TransactionType | "all">(
    "all",
  );

  const {
    data: transactionsData,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<UnifiedTransaction[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");

      if (expenseId) {
        // Load history for specific expense
        const historyData = await getExpenseHistory(token, expenseId);
        return historyData.map((item) => ({
          id: item.id,
          type: "expense_history" as const,
          date: item.createdAt,
          createdAt: item.createdAt,
          user: item.user,
          expenseHistory: item,
          description: item.notes || undefined,
        }));
      } else {
        // Load ALL billchop transactions
        // Use Promise.allSettled to handle partial failures gracefully
        const [expensesResult, settlementsResult, ridesResult] =
          await Promise.allSettled([
            getExpenses(token, 100, 0).catch((err) => {
              console.error(
                "[ExpenseHistoryScreen] Failed to load expenses:",
                err,
              );
              return { expenses: [] };
            }),
            getSettlements(token).catch((err) => {
              if (
                err instanceof Error &&
                !err.message.includes("Expense not found")
              ) {
                console.error(
                  "[ExpenseHistoryScreen] Failed to load settlements:",
                  err,
                );
              }
              return [];
            }),
            getRides(token).catch((err) => {
              console.error(
                "[ExpenseHistoryScreen] Failed to load rides:",
                err,
              );
              return [];
            }),
          ]);

        const expensesData =
          expensesResult.status === "fulfilled"
            ? expensesResult.value
            : { expenses: [] };
        const settlementsData =
          settlementsResult.status === "fulfilled"
            ? settlementsResult.value
            : [];
        const ridesData =
          ridesResult.status === "fulfilled" ? ridesResult.value : [];

        const expenses = Array.isArray(expensesData)
          ? expensesData
          : expensesData.expenses || [];
        const unified: UnifiedTransaction[] = [];

        // Add expenses
        expenses.forEach((expense) => {
          const expenseEntry: UnifiedTransaction = {
            id: expense.id,
            type: "expense", // Keep as expense type, but include ride context if available
            date: expense.createdAt,
            createdAt: expense.createdAt,
            user: expense.createdByUser,
            expense,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
          };

          // If expense was created from a ride, include ride info for context (route display)
          if (expense.ride) {
            expenseEntry.ride = {
              id: expense.ride.id,
              driverId: expense.paidBy || expense.createdBy, // Use paidBy or createdBy as driver
              type: expense.ride.type,
              origin: expense.ride.origin,
              destination: expense.ride.destination,
              distance: null,
              chargePerMile: null,
              chargePerRide: null,
              totalCost: expense.amount, // Use expense amount as approximation
              currency: expense.currency,
              date: expense.ride.date,
              createdAt: expense.date,
              expenseId: expense.id,
              driver: expense.createdByUser,
              participants: [],
            };
          }

          unified.push(expenseEntry);
        });

        // Add settlements
        settlementsData.forEach((settlement) => {
          unified.push({
            id: settlement.id,
            type: "settlement",
            date: settlement.settledAt,
            createdAt: settlement.createdAt,
            user: settlement.payer,
            settlement,
            description:
              settlement.notes ||
              `Settlement: ${settlement.payer.profile?.displayName || settlement.payer.email} paid ${settlement.payee.profile?.displayName || settlement.payee.email}`,
            amount: settlement.amount,
            currency: settlement.currency,
          });
        });

        // Add ride expenses (both Charge Riders and Split Cost types)
        ridesData.forEach((ride) => {
          unified.push({
            id: ride.id,
            type: "rideshare", // Keep type as 'rideshare' for transaction type, but show all rides
            date: ride.createdAt,
            createdAt: ride.createdAt,
            user: ride.driver,
            ride,
            description: `${ride.type === "giveRide" ? "Charge Riders" : "Split Cost"}: ${ride.origin} → ${ride.destination}`,
            amount: ride.totalCost,
            currency: ride.currency,
          });
        });

        // Sort by date (newest first)
        unified.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        return unified;
      }
    },
    immediate: true,
    deps: [token, expenseId],
  });

  const transactions = transactionsData ?? [];

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  }

  function formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  function getUserDisplayName(transaction: UnifiedTransaction): string {
    return (
      transaction.user?.profile?.displayName ||
      transaction.user?.email ||
      "Unknown"
    );
  }

  function getTransactionIcon(
    type: TransactionType,
  ): keyof typeof MaterialIcons.glyphMap {
    switch (type) {
      case "expense":
        return "receipt";
      case "settlement":
        return "account-balance-wallet";
      case "rideshare":
        return "directions-car";
      case "expense_history":
        return "history";
      default:
        return "info";
    }
  }

  function getTransactionColor(type: TransactionType): string {
    switch (type) {
      case "expense":
        return theme.colors.primary;
      case "settlement":
        return theme.colors.success;
      case "rideshare":
        return theme.colors.warning;
      case "expense_history":
        return theme.colors.primary;
      default:
        return theme.colors.gray500;
    }
  }

  function getTransactionLabel(type: TransactionType): string {
    switch (type) {
      case "expense":
        return "Expense";
      case "settlement":
        return "Settlement";
      case "rideshare":
        return "Ride";
      case "expense_history":
        return "History";
      default:
        return "Transaction";
    }
  }

  function getActionIcon(action: string): keyof typeof MaterialIcons.glyphMap {
    switch (action) {
      case "created":
        return "add-circle";
      case "updated":
        return "edit";
      case "deleted":
        return "delete";
      case "settled":
        return "check-circle";
      default:
        return "info";
    }
  }

  function getActionColor(action: string): string {
    switch (action) {
      case "created":
        return theme.colors.success;
      case "updated":
        return theme.colors.primary;
      case "deleted":
        return theme.colors.error;
      case "settled":
        return theme.colors.success;
      default:
        return theme.colors.gray500;
    }
  }

  function getActionLabel(action: string): string {
    switch (action) {
      case "created":
        return "Created";
      case "updated":
        return "Updated";
      case "deleted":
        return "Deleted";
      case "settled":
        return "Settled";
      default:
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
  }

  const filteredTransactions = useMemo(() => {
    if (selectedTab === "all") return transactions;
    return transactions.filter((t) => t.type === selectedTab);
  }, [transactions, selectedTab]);

  const availableTabs = useMemo(() => {
    if (expenseId) {
      // For specific expense, only show history filter
      return ["all", "expense_history"] as const;
    }
    // For all history, show all transaction types
    const types = new Set(transactions.map((t) => t.type));
    const tabs: Array<TransactionType | "all"> = ["all"];
    // Ensure we always show Expense, Settlement, and Rideshare tabs if they exist
    if (types.has("expense")) tabs.push("expense");
    if (types.has("settlement")) tabs.push("settlement");
    if (types.has("rideshare")) tabs.push("rideshare");
    if (types.has("expense_history")) tabs.push("expense_history");
    return tabs;
  }, [transactions, expenseId]);

  function formatChanges(
    changes: any,
  ): Array<{ field: string; before: string; after: string }> {
    if (!changes || typeof changes !== "object") return [];

    if (changes.settlementId) {
      const items: Array<{ field: string; before: string; after: string }> = [];
      if (changes.amount) {
        items.push({
          field: "Settlement Amount",
          before: "",
          after: `${changes.amount} ${changes.currency || "USD"}`,
        });
      }
      if (changes.paymentMethod) {
        items.push({
          field: "Payment Method",
          before: "",
          after: changes.paymentMethod,
        });
      }
      return items;
    }

    const changeItems: Array<{ field: string; before: string; after: string }> =
      [];
    Object.keys(changes).forEach((key) => {
      const change = changes[key];
      if (
        change &&
        typeof change === "object" &&
        "before" in change &&
        "after" in change
      ) {
        changeItems.push({
          field:
            key.charAt(0).toUpperCase() +
            key.slice(1).replace(/([A-Z])/g, " $1"),
          before: String(change.before || ""),
          after: String(change.after || ""),
        });
      }
    });

    return changeItems;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title={expenseId ? "Expense History" : "All Billchop History"}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title={expenseId ? "Expense History" : "All Billchop History"}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
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
        title={expenseId ? "Expense History" : "All Billchop History"}
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
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
          {/* Tab Filters */}
          {!expenseId && availableTabs.length > 1 && (
            <View style={styles.tabSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabContainer}
              >
                {availableTabs.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      selectedTab === tab && styles.tabSelected,
                    ]}
                    onPress={() => setSelectedTab(tab)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selectedTab === tab && styles.tabTextSelected,
                      ]}
                    >
                      {tab === "all"
                        ? "All"
                        : getTransactionLabel(tab as TransactionType)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon="history"
              title={
                selectedTab !== "all"
                  ? `No ${getTransactionLabel(selectedTab as TransactionType)} transactions`
                  : "No history available"
              }
              message={
                selectedTab !== "all"
                  ? `Try selecting a different filter or check back later.`
                  : "No billchop transactions found."
              }
            />
          ) : (
            <View style={styles.historyList}>
              {filteredTransactions.map((transaction) => {
                const isCurrentUser = transaction.user?.id === user?.id;
                const iconColor =
                  transaction.type === "expense_history"
                    ? getActionColor(transaction.expenseHistory?.action || "")
                    : getTransactionColor(transaction.type);
                const iconName =
                  transaction.type === "expense_history"
                    ? getActionIcon(transaction.expenseHistory?.action || "")
                    : getTransactionIcon(transaction.type);
                const avatarUrl = getAvatarUrl(
                  transaction.user?.profile?.avatarUrl || null,
                );
                const displayName = getUserDisplayName(transaction);
                const initials = displayName.charAt(0).toUpperCase();

                return (
                  <TouchableOpacity
                    key={transaction.id}
                    style={styles.historyCard}
                    onPress={() => {
                      if (transaction.expense && onNavigateToExpense) {
                        onNavigateToExpense(transaction.expense.id);
                      } else if (
                        transaction.ride &&
                        transaction.type === "rideshare" &&
                        onNavigateToRide
                      ) {
                        onNavigateToRide(transaction.ride.id);
                      }
                    }}
                    activeOpacity={
                      (transaction.expense && onNavigateToExpense) ||
                      (transaction.ride &&
                        transaction.type === "rideshare" &&
                        onNavigateToRide)
                        ? 0.7
                        : 1
                    }
                    disabled={
                      !(transaction.expense && onNavigateToExpense) &&
                      !(
                        transaction.ride &&
                        transaction.type === "rideshare" &&
                        onNavigateToRide
                      )
                    }
                  >
                    {/* Header with icon and action */}
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: `${iconColor}15` },
                        ]}
                      >
                        <Icon name={iconName} size={20} color={iconColor} />
                      </View>
                      <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                          <Text style={styles.actionLabel}>
                            {transaction.type === "expense_history"
                              ? getActionLabel(
                                  transaction.expenseHistory?.action || "",
                                )
                              : getTransactionLabel(transaction.type)}
                          </Text>
                          {isCurrentUser && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>You</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.userInfo}>
                          <View style={styles.userAvatar}>
                            {avatarUrl ? (
                              <Image
                                source={{ uri: avatarUrl }}
                                style={styles.avatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                  {initials}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.userText}>
                            {isCurrentUser ? "You" : displayName}
                          </Text>
                          <Text style={styles.timeText}>
                            {" "}
                            • {formatDate(transaction.date)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Expense Details - More Valuable Information */}
                    {transaction.expense && (
                      <View style={styles.expenseDetailsBox}>
                        {/* Ride context for expenses created from rides */}
                        {transaction.expense.rideId &&
                          transaction.expense.ride &&
                          onNavigateToRide && (
                            <TouchableOpacity
                              style={styles.rideContextBox}
                              onPress={() =>
                                onNavigateToRide(transaction.expense!.rideId!)
                              }
                              activeOpacity={0.7}
                            >
                              <View style={styles.rideContextHeader}>
                                <MaterialIcons
                                  name="directions-car"
                                  size={16}
                                  color={theme.colors.primary}
                                />
                                <Text style={styles.rideContextLabel}>
                                  From Ride
                                </Text>
                                <MaterialIcons
                                  name="chevron-right"
                                  size={16}
                                  color={theme.colors.textTertiary}
                                />
                              </View>
                              <Text
                                style={styles.rideRouteText}
                                numberOfLines={1}
                              >
                                {transaction.expense.ride.origin} →{" "}
                                {transaction.expense.ride.destination}
                              </Text>
                            </TouchableOpacity>
                          )}
                        {transaction.expense.rideId &&
                          transaction.expense.ride &&
                          !onNavigateToRide && (
                            <View style={styles.rideContextBox}>
                              <View style={styles.rideContextHeader}>
                                <MaterialIcons
                                  name="directions-car"
                                  size={16}
                                  color={theme.colors.primary}
                                />
                                <Text style={styles.rideContextLabel}>
                                  From Ride
                                </Text>
                              </View>
                              <Text
                                style={styles.rideRouteText}
                                numberOfLines={1}
                              >
                                {transaction.expense.ride.origin} →{" "}
                                {transaction.expense.ride.destination}
                              </Text>
                            </View>
                          )}
                        <View style={styles.expenseDetailRow}>
                          <Text style={styles.expenseDetailLabel}>
                            Created by:
                          </Text>
                          <Text style={styles.expenseDetailValue}>
                            {transaction.expense.createdByUser?.profile
                              ?.displayName ||
                              transaction.expense.createdByUser?.email ||
                              "Unknown"}
                          </Text>
                        </View>
                        {transaction.expense.category && (
                          <View style={styles.expenseDetailRow}>
                            <Text style={styles.expenseDetailLabel}>
                              Category:
                            </Text>
                            <Text style={styles.expenseDetailValue}>
                              {transaction.expense.category}
                            </Text>
                          </View>
                        )}
                        {transaction.expense.splits &&
                          transaction.expense.splits.length > 0 && (
                            <View style={styles.expenseDetailRow}>
                              <Text style={styles.expenseDetailLabel}>
                                Participants:
                              </Text>
                              <Text style={styles.expenseDetailValue}>
                                {transaction.expense.splits.length}{" "}
                                {transaction.expense.splits.length === 1
                                  ? "person"
                                  : "people"}
                              </Text>
                            </View>
                          )}
                        {transaction.expense.group && (
                          <View style={styles.expenseDetailRow}>
                            <Text style={styles.expenseDetailLabel}>
                              Group:
                            </Text>
                            <Text style={styles.expenseDetailValue}>
                              {transaction.expense.group.name}
                            </Text>
                          </View>
                        )}
                        <View style={styles.expenseAmountRow}>
                          <Text style={styles.expenseAmountLabel}>Amount:</Text>
                          <Text style={styles.expenseAmountValue}>
                            {formatCurrency(
                              transaction.expense.amount,
                              transaction.expense.currency,
                            )}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Description/Amount for non-expense transactions */}
                    {!transaction.expense &&
                      (transaction.description || transaction.amount) && (
                        <View style={styles.descriptionBox}>
                          {transaction.description && (
                            <Text style={styles.descriptionText}>
                              {transaction.description}
                            </Text>
                          )}
                          {transaction.amount && (
                            <Text style={styles.amountText}>
                              {formatCurrency(
                                transaction.amount,
                                transaction.currency,
                              )}
                            </Text>
                          )}
                        </View>
                      )}

                    {/* Notes (for expense history) */}
                    {transaction.expenseHistory?.notes && (
                      <View style={styles.notesBox}>
                        <MaterialIcons
                          name="note"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.notesText}>
                          {transaction.expenseHistory.notes}
                        </Text>
                      </View>
                    )}

                    {/* Changes (for expense history) */}
                    {transaction.expenseHistory?.changes &&
                      (() => {
                        const changeItems = formatChanges(
                          transaction.expenseHistory.changes,
                        );
                        if (changeItems.length === 0) return null;
                        return (
                          <View style={styles.changesBox}>
                            <View style={styles.changesHeader}>
                              <MaterialIcons
                                name="edit"
                                size={16}
                                color={theme.colors.primary}
                              />
                              <Text style={styles.changesTitle}>
                                Changes Made
                              </Text>
                            </View>
                            {changeItems.map((change, idx) => (
                              <View key={idx} style={styles.changeRow}>
                                <Text style={styles.changeField}>
                                  {change.field}
                                </Text>
                                {change.before ? (
                                  <View style={styles.changeValues}>
                                    <View style={styles.changeValueBox}>
                                      <Text style={styles.changeBefore}>
                                        {change.before}
                                      </Text>
                                    </View>
                                    <MaterialIcons
                                      name="arrow-forward"
                                      size={16}
                                      color={theme.colors.textTertiary}
                                    />
                                    <View
                                      style={[
                                        styles.changeValueBox,
                                        styles.changeValueBoxNew,
                                      ]}
                                    >
                                      <Text style={styles.changeAfter}>
                                        {change.after}
                                      </Text>
                                    </View>
                                  </View>
                                ) : (
                                  <View
                                    style={[
                                      styles.changeValueBox,
                                      styles.changeValueBoxNew,
                                    ]}
                                  >
                                    <Text style={styles.changeAfter}>
                                      {change.after}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        );
                      })()}

                    {/* Settlement details */}
                    {transaction.settlement && (
                      <View style={styles.settlementBox}>
                        <View style={styles.settlementRow}>
                          <Text style={styles.settlementLabel}>
                            Payment Method:
                          </Text>
                          <Text style={styles.settlementValue}>
                            {transaction.settlement.paymentMethod}
                          </Text>
                        </View>
                        <View style={styles.settlementRow}>
                          <Text style={styles.settlementLabel}>From:</Text>
                          <Text style={styles.settlementValue}>
                            {transaction.settlement.payer.profile
                              ?.displayName ||
                              transaction.settlement.payer.email}
                          </Text>
                        </View>
                        <View style={styles.settlementRow}>
                          <Text style={styles.settlementLabel}>To:</Text>
                          <Text style={styles.settlementValue}>
                            {transaction.settlement.payee.profile
                              ?.displayName ||
                              transaction.settlement.payee.email}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Ride details */}
                    {transaction.ride && (
                      <View style={styles.rideshareBox}>
                        <View style={styles.rideshareRow}>
                          <MaterialIcons
                            name="place"
                            size={16}
                            color={theme.colors.warning}
                          />
                          <Text style={styles.rideshareText}>
                            {transaction.ride.origin}
                          </Text>
                        </View>
                        <MaterialIcons
                          name="arrow-downward"
                          size={16}
                          color={theme.colors.textTertiary}
                          style={styles.arrowIcon}
                        />
                        <View style={styles.rideshareRow}>
                          <MaterialIcons
                            name="place"
                            size={16}
                            color={theme.colors.warning}
                          />
                          <Text style={styles.rideshareText}>
                            {transaction.ride.destination}
                          </Text>
                        </View>
                        {transaction.ride.distance && (
                          <View style={styles.rideshareRow}>
                            <Text style={styles.rideshareLabel}>Distance:</Text>
                            <Text style={styles.rideshareValue}>
                              {transaction.ride.distance.toFixed(1)} miles
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Full date tooltip */}
                    <Text style={styles.fullDate}>
                      {formatFullDate(transaction.date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    errorText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      textAlign: "center",
      fontWeight: theme.typography.fontWeight.medium,
      paddingHorizontal: theme.spacing.xl,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 48,
      marginTop: theme.spacing.base,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    tabSection: {
      marginBottom: theme.spacing.xl,
    },
    tabContainer: {
      gap: theme.spacing.md,
      paddingRight: theme.spacing.base,
    },
    tab: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.lg,
      borderWidth: 2,
      borderColor: "transparent",
      minHeight: 44,
    },
    tabSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    tabTextSelected: {
      color: theme.colors.white,
    },
    historyList: {
      gap: theme.spacing.md,
    },
    historyCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    cardHeader: {
      flexDirection: "row",
      marginBottom: 10,
      gap: 10,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    headerContent: {
      flex: 1,
      gap: 4,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    youBadge: {
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    youBadgeText: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    userAvatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme.colors.primaryBackground,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      color: theme.colors.white,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    userText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    timeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      fontWeight: theme.typography.fontWeight.normal,
    },
    expenseDetailsBox: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
    },
    expenseDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    expenseDetailLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    expenseDetailValue: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
      flex: 1,
      textAlign: "right",
    },
    expenseAmountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    expenseAmountLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    expenseAmountValue: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    descriptionBox: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: theme.typography.fontSize.xs + 1,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
      marginBottom: 4,
    },
    amountText: {
      fontSize: theme.typography.fontSize.sm + 1,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    notesBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.infoBackground,
      borderRadius: theme.spacing.sm,
      padding: 10,
      marginBottom: theme.spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    notesText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      lineHeight: 20,
    },
    changesBox: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
    },
    changesHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    changesTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    changeRow: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    changeField: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    changeValues: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      flexWrap: "wrap",
    },
    changeValueBox: {
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.errorBackground,
    },
    changeValueBoxNew: {
      backgroundColor: theme.colors.successBackground,
      borderColor: theme.colors.successBackground,
    },
    changeBefore: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      fontWeight: theme.typography.fontWeight.medium,
      textDecorationLine: "line-through",
    },
    changeAfter: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    settlementBox: {
      backgroundColor: theme.colors.successBackground,
      borderRadius: theme.spacing.sm,
      padding: 10,
      marginBottom: theme.spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.success,
    },
    settlementRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    settlementLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    settlementValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    rideContextBox: {
      backgroundColor: theme.colors.primaryBackground,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    rideContextHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    rideContextLabel: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    rideRouteText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginLeft: 22, // Align with ride context header content
    },
    rideshareBox: {
      backgroundColor: theme.colors.warningBackground,
      borderRadius: theme.spacing.sm,
      padding: 10,
      marginBottom: theme.spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.warning,
    },
    rideshareRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    rideshareText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
    },
    rideshareLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    rideshareValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    arrowIcon: {
      marginLeft: theme.spacing.sm,
      marginBottom: 4,
    },
    fullDate: {
      fontSize: theme.typography.fontSize.xs - 2,
      color: theme.colors.textTertiary,
      marginTop: 4,
      textAlign: "right",
    },
  });
}
