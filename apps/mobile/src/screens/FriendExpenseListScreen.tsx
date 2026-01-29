import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getExpenses, Expense, getBalances } from "../api/expenseApi";
import { getFriendChoreStats, FriendChoreStats } from "../api/choreApi";
import { getFriendStats, FriendRideStats } from "../api/friendApi";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { getUserFriendlyErrorMessage } from "../components/ErrorState";
import { SkeletonExpenseList } from "../components/SkeletonLoader";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useTheme } from "../theme";

interface FriendExpenseListScreenProps {
  friendId: string;
  friendName: string;
  onBack: () => void;
  onViewExpense: (expenseId: string) => void;
  onCreateChore?: (friendId: string) => void;
  onCreateExpense?: (friendId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FriendExpenseListScreen({
  friendId,
  friendName,
  onBack,
  onViewExpense,
  onCreateChore,
  onCreateExpense,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FriendExpenseListScreenProps) {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">(
    "all",
  );
  const [filterType, setFilterType] = useState<"all" | "rides">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch expenses, balance, and chore stats
  const {
    data: friendData,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<{
    expenses: Expense[];
    balance: { owed: number; owedTo: number } | null;
    choreStats: FriendChoreStats | null;
    rideStats: FriendRideStats | null;
  }>({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");

      // Get all expenses and filter for this friend
      const allExpensesData = await getExpenses(token);

      // Handle both array response and paginated response
      let allExpenses: Expense[] = [];
      if (Array.isArray(allExpensesData)) {
        allExpenses = allExpensesData;
      } else if (allExpensesData && typeof allExpensesData === "object") {
        allExpenses = (allExpensesData as any).expenses || [];
      }

      // Filter expenses where this friend is involved (either as creator or in splits)
      const friendExpenses = allExpenses.filter(
        (expense) =>
          expense.createdBy === friendId ||
          (expense.splits || []).some((split) => split.userId === friendId),
      );

      // Get balance for this friend
      let balance: { owed: number; owedTo: number } | null = null;
      try {
        const balancesData = await getBalances(token);
        const owedBy = balancesData.owedByUser.find(
          (item) => item?.user?.id === friendId,
        );
        const owedTo = balancesData.owedToUser.find(
          (item) => item?.user?.id === friendId,
        );
        balance = {
          owed: Math.round((owedBy?.amount || 0) * 100) / 100,
          owedTo: Math.round((owedTo?.amount || 0) * 100) / 100,
        };
      } catch (err) {
        console.error("Failed to load balance:", err);
      }

      // Get chore stats for this friend
      let choreStats: FriendChoreStats | null = null;
      try {
        choreStats = await getFriendChoreStats(token, friendId);
      } catch (err) {
        console.error("Failed to load chore stats:", err);
        // Don't fail if stats fail
      }

      // Get ride stats for this friend
      let rideStats: FriendRideStats | null = null;
      try {
        rideStats = await getFriendStats(token, friendId);
      } catch (err) {
        console.error("Failed to load ride stats:", err);
        // Don't fail if stats fail
      }

      return {
        expenses: friendExpenses,
        balance,
        choreStats,
        rideStats,
      };
    },
    immediate: true,
    deps: [token, friendId],
  });

  const expenses = friendData?.expenses || [];
  const balance = friendData?.balance || null;
  const choreStats = friendData?.choreStats || null;
  const rideStats = friendData?.rideStats || null;

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((expense) =>
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply type filter (rides)
    if (filterType === "rides") {
      filtered = filtered.filter(
        (expense) => expense.rideId !== null && expense.rideId !== undefined,
      );
    }

    // Apply status filter
    if (filterStatus === "paid") {
      filtered = filtered.filter((expense) => {
        const friendSplit = expense.splits.find(
          (split) => split.userId === friendId,
        );
        const currentUserSplit = expense.splits.find(
          (split) => split.userId === user?.id,
        );
        return (friendSplit?.isPaid && currentUserSplit?.isPaid) || false;
      });
    } else if (filterStatus === "unpaid") {
      filtered = filtered.filter((expense) => {
        const friendSplit = expense.splits.find(
          (split) => split.userId === friendId,
        );
        const currentUserSplit = expense.splits.find(
          (split) => split.userId === user?.id,
        );
        return !friendSplit?.isPaid || !currentUserSplit?.isPaid;
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return b.amount - a.amount;
      }
    });

    return filtered;
  }, [
    expenses,
    searchQuery,
    filterStatus,
    filterType,
    sortBy,
    friendId,
    user?.id,
  ]);

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  }

  function getUserDisplayName(user: Expense["createdByUser"]): string {
    if (user.id === user?.id) {
      return "you";
    }
    return user.profile?.displayName || user.email;
  }

  function getFriendSplit(expense: Expense) {
    return expense.splits.find((split) => split.userId === friendId);
  }

  function getCurrentUserSplit(expense: Expense) {
    return expense.splits.find((split) => split.userId === user?.id);
  }

  // Prepare right actions for header (create chore/expense) - defined early so it can be used in loading/error states
  const rightActions =
    onCreateChore || onCreateExpense ? (
      <View style={{ flexDirection: "row", gap: 8 }}>
        {onCreateChore && (
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => onCreateChore(friendId)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Create task"
          >
            <MaterialIcons name="task" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        )}
        {onCreateExpense && (
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => onCreateExpense(friendId)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Chop a bill"
          >
            <MaterialIcons name="add" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        )}
      </View>
    ) : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={friendName}
        onBack={onBack}
        rightActions={rightActions}
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
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Combined Stats Section - Balance + Chores + Rides */}
          {(balance || choreStats || rideStats) && (
            <View style={styles.combinedStatsSection}>
              {/* Balance Summary - Compact */}
              {balance && (balance.owed > 0 || balance.owedTo > 0) && (
                <View style={styles.compactBalanceCard}>
                  <View style={styles.compactBalanceHeader}>
                    <View style={styles.compactBalanceRow}>
                      <View style={styles.compactBalanceItem}>
                        <Text style={styles.compactBalanceLabel}>You Owe</Text>
                        <Text style={styles.compactBalanceAmountRed}>
                          {formatCurrency(balance.owed || 0)}
                        </Text>
                      </View>
                      <View style={styles.compactBalanceDivider} />
                      <View style={styles.compactBalanceItem}>
                        <Text style={styles.compactBalanceLabel}>
                          You're Owed
                        </Text>
                        <Text style={styles.compactBalanceAmountGreen}>
                          {formatCurrency(balance.owedTo || 0)}
                        </Text>
                      </View>
                    </View>
                    {balance.owedTo - balance.owed !== 0 && (
                      <View style={styles.netBalanceRow}>
                        <Icon
                          name={
                            balance.owedTo - balance.owed > 0
                              ? "trending-up"
                              : "trending-down"
                          }
                          size={14}
                          color={
                            balance.owedTo - balance.owed > 0
                              ? theme.colors.success
                              : theme.colors.error
                          }
                        />
                        <Text
                          style={[
                            styles.netBalanceText,
                            balance.owedTo - balance.owed > 0
                              ? styles.netBalanceTextPositive
                              : styles.netBalanceTextNegative,
                          ]}
                        >
                          {balance.owedTo - balance.owed > 0
                            ? "Ahead by"
                            : "Owe"}{" "}
                          {formatCurrency(
                            Math.abs(balance.owedTo - balance.owed),
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Chore Stats Summary - Compact */}
              {choreStats && choreStats.combinedTotalCompleted > 0 && (
                <View style={styles.compactChoreStatsCard}>
                  <View style={styles.compactChoreStatsHeader}>
                    <View style={styles.compactChoreStatsRow}>
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons
                          name="task"
                          size={18}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.compactChoreStatsLabel}>Tasks</Text>
                        <Text style={styles.compactChoreStatsValue}>
                          {choreStats.combinedTotalCompleted}
                        </Text>
                      </View>
                      <View style={styles.compactChoreStatsDivider} />
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons
                          name="stars"
                          size={18}
                          color={theme.colors.warning}
                        />
                        <Text style={styles.compactChoreStatsLabel}>
                          Points
                        </Text>
                        <Text style={styles.compactChoreStatsValue}>
                          {choreStats.combinedTotalPoints}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Comparison Section - User vs Friend */}
                  <View style={styles.friendComparisonSection}>
                    <Text style={styles.friendComparisonTitle}>
                      Contributions
                    </Text>
                    <View style={styles.friendComparisonList}>
                      {/* User Stats */}
                      <View style={styles.friendComparisonItem}>
                        <View style={styles.friendComparisonInfo}>
                          <Text style={styles.friendComparisonName}>You</Text>
                          <View style={styles.friendComparisonPoints}>
                            <MaterialIcons
                              name="stars"
                              size={14}
                              color={theme.colors.warning}
                            />
                            <Text style={styles.friendComparisonPointsText}>
                              {choreStats.userStats.totalPoints} pts
                            </Text>
                            <Text style={styles.friendComparisonTasksText}>
                              • {choreStats.userStats.totalCompleted} tasks
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Friend Stats */}
                      <View style={styles.friendComparisonItem}>
                        <View style={styles.friendComparisonInfo}>
                          <Text style={styles.friendComparisonName}>
                            {choreStats.friendName}
                          </Text>
                          <View style={styles.friendComparisonPoints}>
                            <MaterialIcons
                              name="stars"
                              size={14}
                              color={theme.colors.warning}
                            />
                            <Text style={styles.friendComparisonPointsText}>
                              {choreStats.friendStats.totalPoints} pts
                            </Text>
                            <Text style={styles.friendComparisonTasksText}>
                              • {choreStats.friendStats.totalCompleted} tasks
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Ride Stats Summary - Compact */}
              {rideStats && rideStats.totalRides > 0 && (
                <View style={styles.compactChoreStatsCard}>
                  <View style={styles.compactChoreStatsHeader}>
                    <View style={styles.compactChoreStatsRow}>
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons
                          name="directions-car"
                          size={18}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.compactChoreStatsLabel}>Rides</Text>
                        <Text style={styles.compactChoreStatsValue}>
                          {rideStats.totalRides}
                        </Text>
                      </View>
                      <View style={styles.compactChoreStatsDivider} />
                      <View style={styles.compactChoreStatsItem}>
                        <MaterialIcons
                          name="attach-money"
                          size={18}
                          color={theme.colors.success}
                        />
                        <Text style={styles.compactChoreStatsLabel}>Spent</Text>
                        <Text style={styles.compactChoreStatsValue}>
                          {formatCurrency(rideStats.totalSpentTogether, "USD")}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Breakdown Section - Driver vs Passenger */}
                  <View style={styles.friendComparisonSection}>
                    <Text style={styles.friendComparisonTitle}>
                      Rides Together
                    </Text>
                    <View style={styles.friendComparisonList}>
                      {/* User Stats */}
                      <View style={styles.friendComparisonItem}>
                        <View style={styles.friendComparisonInfo}>
                          <Text style={styles.friendComparisonName}>You</Text>
                          <View style={styles.friendComparisonPoints}>
                            <MaterialIcons
                              name="drive-eta"
                              size={14}
                              color={theme.colors.primary}
                            />
                            <Text style={styles.friendComparisonPointsText}>
                              {rideStats.ridesAsDriver} as driver
                            </Text>
                            <Text style={styles.friendComparisonTasksText}>
                              • {rideStats.ridesAsPassenger} as passenger
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Friend Stats */}
                      <View style={styles.friendComparisonItem}>
                        <View style={styles.friendComparisonInfo}>
                          <Text style={styles.friendComparisonName}>
                            {friendName}
                          </Text>
                          <View style={styles.friendComparisonPoints}>
                            <MaterialIcons
                              name="drive-eta"
                              size={14}
                              color={theme.colors.primary}
                            />
                            <Text style={styles.friendComparisonPointsText}>
                              {rideStats.ridesAsPassenger} as driver
                            </Text>
                            <Text style={styles.friendComparisonTasksText}>
                              • {rideStats.ridesAsDriver} as passenger
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Search and Filter Section */}
          <View style={styles.filterSection}>
            <View style={styles.searchContainer}>
              <MaterialIcons
                name="search"
                size={20}
                color={theme.colors.textTertiary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search expenses..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterToggle}
              onPress={() => setShowFilters(!showFilters)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="filter-list"
                size={20}
                color={
                  showFilters
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filtersContainer}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Type:</Text>
                <View style={styles.filterChips}>
                  {(["all", "rides"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterChip,
                        filterType === type && styles.filterChipActive,
                      ]}
                      onPress={() => setFilterType(type)}
                      activeOpacity={0.7}
                    >
                      {type === "rides" && (
                        <MaterialIcons
                          name="directions-car"
                          size={14}
                          color={
                            filterType === type
                              ? theme.colors.white
                              : theme.colors.textSecondary
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.filterChipText,
                          filterType === type && styles.filterChipTextActive,
                        ]}
                      >
                        {type === "rides" ? "Rides" : "All"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Status:</Text>
                <View style={styles.filterChips}>
                  {(["all", "paid", "unpaid"] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterChip,
                        filterStatus === status && styles.filterChipActive,
                      ]}
                      onPress={() => setFilterStatus(status)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          filterStatus === status &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Sort by:</Text>
                <View style={styles.filterChips}>
                  {(["date", "amount"] as const).map((sort) => (
                    <TouchableOpacity
                      key={sort}
                      style={[
                        styles.filterChip,
                        sortBy === sort && styles.filterChipActive,
                      ]}
                      onPress={() => setSortBy(sort)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          sortBy === sort && styles.filterChipTextActive,
                        ]}
                      >
                        {sort.charAt(0).toUpperCase() + sort.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {filteredExpenses.length === 0 && expenses.length > 0 ? (
            <EmptyState
              icon="search-off"
              title="No matching expenses"
              message={`No expenses match your search or filter criteria.`}
            />
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="No Expenses"
              message={`No expenses shared with ${friendName} yet.`}
            />
          ) : (
            filteredExpenses.map((expense) => {
              const friendSplit = getFriendSplit(expense);
              const currentUserSplit = getCurrentUserSplit(expense);
              const isCreator = expense.createdBy === user?.id;
              const friendIsCreator = expense.createdBy === friendId;

              return (
                <TouchableOpacity
                  key={expense.id}
                  style={styles.expenseCard}
                  onPress={() => onViewExpense(expense.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.expenseHeader}>
                    <View style={styles.expenseHeaderLeft}>
                      <View style={styles.expenseTitleRow}>
                        <Text style={styles.expenseDescription}>
                          {expense.description}
                        </Text>
                        {expense.rideId && (
                          <View style={styles.rideBadge}>
                            <MaterialIcons
                              name="directions-car"
                              size={14}
                              color={theme.colors.primary}
                            />
                            <Text style={styles.rideBadgeText}>Ride</Text>
                          </View>
                        )}
                        {expense.group && (
                          <View style={styles.groupBadge}>
                            <Avatar
                              avatarUrl={getAvatarUrl(
                                expense.group.avatarUrl || null,
                              )}
                              displayName={expense.group.name}
                              size={18}
                            />
                            <Text style={styles.groupBadgeText}>
                              {expense.group.name}
                            </Text>
                          </View>
                        )}
                        {!expense.group && (
                          <View style={styles.individualBadge}>
                            <MaterialIcons
                              name="person"
                              size={14}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.individualBadgeText}>
                              Individual
                            </Text>
                          </View>
                        )}
                      </View>
                      {expense.ride && (
                        <Text style={styles.rideRoute} numberOfLines={1}>
                          {expense.ride.origin} → {expense.ride.destination}
                        </Text>
                      )}
                      <Text style={styles.expenseAmount}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={theme.colors.textTertiary}
                    />
                  </View>
                  <Text style={styles.expenseCreator}>
                    Created by{" "}
                    {isCreator
                      ? "you"
                      : friendIsCreator
                        ? friendName
                        : getUserDisplayName(expense.createdByUser)}
                  </Text>
                  <View style={styles.splitsContainer}>
                    {friendSplit && (
                      <View style={styles.splitRow}>
                        <View style={styles.splitUserInfo}>
                          <Avatar
                            avatarUrl={
                              expense.createdByUser?.profile?.avatarUrl
                            }
                            displayName={friendName}
                            size={32}
                          />
                          <Text style={styles.splitUser}>{friendName}</Text>
                        </View>
                        <Text
                          style={[
                            styles.splitAmount,
                            friendSplit.isPaid && styles.splitPaid,
                          ]}
                        >
                          {formatCurrency(friendSplit.amount, expense.currency)}
                          {friendSplit.isPaid ? " ✓" : ""}
                        </Text>
                      </View>
                    )}
                    {currentUserSplit && (
                      <View style={styles.splitRow}>
                        <View style={styles.splitUserInfo}>
                          <Avatar
                            avatarUrl={undefined}
                            displayName={user?.email || "You"}
                            size={32}
                          />
                          <Text style={styles.splitUser}>You</Text>
                        </View>
                        <Text
                          style={[
                            styles.splitAmount,
                            currentUserSplit.isPaid && styles.splitPaid,
                          ]}
                        >
                          {formatCurrency(
                            currentUserSplit.amount,
                            expense.currency,
                          )}
                          {currentUserSplit.isPaid ? " ✓" : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
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
    balanceSection: {
      marginBottom: theme.spacing.base,
    },
    combinedStatsSection: {
      marginBottom: theme.spacing.base,
      gap: theme.spacing.md,
    },
    compactBalanceCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    compactBalanceHeader: {
      gap: theme.spacing.md,
    },
    compactBalanceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    compactBalanceItem: {
      flex: 1,
      alignItems: "center",
    },
    compactBalanceLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    compactBalanceAmountRed: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.error,
    },
    compactBalanceAmountGreen: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.success,
    },
    compactBalanceDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.base,
    },
    netBalanceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },
    netBalanceText: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    netBalanceTextPositive: {
      color: theme.colors.success,
    },
    netBalanceTextNegative: {
      color: theme.colors.error,
    },
    compactChoreStatsCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    compactChoreStatsHeader: {
      marginBottom: theme.spacing.base,
    },
    compactChoreStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    compactChoreStatsItem: {
      flex: 1,
      alignItems: "center",
      gap: 6,
    },
    compactChoreStatsLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    compactChoreStatsValue: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    compactChoreStatsDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.base,
    },
    friendComparisonSection: {
      marginTop: theme.spacing.base,
      paddingTop: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },
    friendComparisonTitle: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.md,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    friendComparisonList: {
      gap: theme.spacing.md,
    },
    friendComparisonItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    friendComparisonInfo: {
      flex: 1,
    },
    friendComparisonName: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    friendComparisonPoints: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    friendComparisonPointsText: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.warning,
    },
    friendComparisonTasksText: {
      fontSize: theme.typography.fontSize.xs + 1,
      color: theme.colors.textSecondary,
    },
    balanceFlowCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      overflow: "visible",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    netBalanceBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    netBalanceIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    netBalanceIndicatorPositive: {
      backgroundColor: theme.colors.successBackground,
    },
    netBalanceIndicatorNegative: {
      backgroundColor: theme.colors.errorBackground,
    },
    netBalanceBannerText: {
      fontSize: theme.typography.fontSize.xs + 1,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    netBalanceBannerAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    netBalanceBannerAmountPositive: {
      color: theme.colors.success,
    },
    netBalanceBannerAmountNegative: {
      color: theme.colors.error,
    },
    balanceFlowContainer: {
      flexDirection: "row",
      minHeight: 110,
      position: "relative",
    },
    balanceFlowSide: {
      flex: 1,
      padding: 16,
      justifyContent: "space-between",
    },
    balanceFlowSideLeft: {
      borderRightWidth: 1,
      borderRightColor: theme.colors.borderLight,
      backgroundColor: theme.colors.errorBackground,
    },
    balanceFlowSideRight: {
      backgroundColor: theme.colors.successBackground,
    },
    balanceFlowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    balanceFlowIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    balanceFlowLabel: {
      fontSize: theme.typography.fontSize.xs - 2,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    balanceFlowAmountRed: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.error,
    },
    balanceFlowAmountGreen: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.success,
    },
    balanceFlowDivider: {
      width: 1,
      backgroundColor: theme.colors.border,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing["2xl"],
    },
    errorText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      textAlign: "center",
    },
    retryButton: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    expenseCard: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
      borderRadius: theme.spacing.base,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      position: "relative",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    filterSection: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
      alignItems: "center",
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      height: 44,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchIcon: {
      marginRight: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    clearButton: {
      padding: 4,
    },
    filterToggle: {
      width: 44,
      height: 44,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    filtersContainer: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterRow: {
      marginBottom: theme.spacing.md,
    },
    filterLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.sm,
    },
    filterChips: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
      color: theme.colors.white,
    },
    splitsContainer: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
      gap: theme.spacing.sm,
    },
    splitRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    splitUserInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    splitUser: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
    },
    splitAmount: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    splitPaid: {
      color: theme.colors.success,
    },
    expenseHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.sm,
    },
    expenseHeaderLeft: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    expenseTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: 4,
    },
    expenseDescription: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
      flex: 1,
    },
    groupBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primaryBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 6,
    },
    groupBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    individualBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.backgroundTertiary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    individualBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    rideBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      backgroundColor: theme.colors.primaryBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: 6,
    },
    rideBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    rideRoute: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs / 2,
      marginBottom: theme.spacing.xs,
    },
    expenseAmount: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    expenseCreator: {
      fontSize: theme.typography.fontSize.xs + 1,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    headerActionButton: {
      padding: 8,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: theme.colors.surfaceOverlay,
    },
  });
}
