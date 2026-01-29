import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getFriends } from "../api/friendApi";
import {
  getBalances,
  BalanceInfo,
  getExpenses,
  Expense,
} from "../api/expenseApi";
import { Header, HeaderOption } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { useTheme } from "../theme";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";

interface BillchopFriendsScreenProps {
  onBack: () => void;
  onViewFriendExpenses: (friendId: string, friendName: string) => void;
  onSettleUp?: (payeeId: string, amount: number, payeeName: string) => void;
  onAddNewFriends?: () => void; // New handler for add friends button
  onMessageFriend?: (friendId: string, friendName: string) => void; // New handler for messaging
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function BillchopFriendsScreen({
  onBack,
  onViewFriendExpenses,
  onSettleUp,
  onAddNewFriends,
  onMessageFriend,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: BillchopFriendsScreenProps) {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "owe-you" | "you-owe" | "settled"
  >("all");
  const searchInputRef = useRef<TextInput>(null);

  interface FriendsData {
    friends: any[];
    balances: BalanceInfo;
    expenses: Expense[];
  }

  const { data, loading, refreshing, error, refresh, refetch } =
    useDataFetch<FriendsData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        const [friendsData, balancesData, expensesData] = await Promise.all([
          getFriends(token),
          getBalances(token),
          getExpenses(token, 100, 0),
        ]);

        // Handle both array and paginated response for expenses
        let expensesList: Expense[] = [];
        if (Array.isArray(expensesData)) {
          expensesList = expensesData;
        } else {
          expensesList = (expensesData as any).expenses || [];
        }

        return {
          friends: friendsData,
          balances: balancesData,
          expenses: expensesList,
        };
      },
      immediate: true,
      deps: [token],
    });

  const friends = data?.friends ?? [];
  const balances = data?.balances ?? null;
  const expenses = data?.expenses ?? [];

  function getUserDisplayName(friend: any): string {
    return (
      friend.friend?.profile?.displayName || friend.friend?.email || "Unknown"
    );
  }

  function getBalanceForFriend(friendId: string): {
    owed: number;
    owedTo: number;
    breakdown: {
      owed: {
        byGroup?: Array<{ groupId: string; groupName: string; amount: number }>;
        rideshare?: number;
        individual?: number;
      };
      owedTo: {
        byGroup?: Array<{ groupId: string; groupName: string; amount: number }>;
        rideshare?: number;
        individual?: number;
      };
    };
  } {
    if (!balances || !friendId)
      return {
        owed: 0,
        owedTo: 0,
        breakdown: {
          owed: {},
          owedTo: {},
        },
      };

    // Find balance entries that match this friend's user ID
    const owedBy = balances.owedByUser.find(
      (item: BalanceInfo["owedByUser"][number]) => {
        const userId = item?.user?.id;
        return userId && userId === friendId;
      },
    );
    const owedTo = balances.owedToUser.find(
      (item: BalanceInfo["owedToUser"][number]) => {
        const userId = item?.user?.id;
        return userId && userId === friendId;
      },
    );

    // Round amounts to 2 decimal places
    const result = {
      owed: Math.round((owedBy?.amount || 0) * 100) / 100,
      owedTo: Math.round((owedTo?.amount || 0) * 100) / 100,
      breakdown: {
        owed: owedBy?.breakdown || {},
        owedTo: owedTo?.breakdown || {},
      },
    };

    // Debug logging
    if (result.owed !== 0 || result.owedTo !== 0) {
      const user = owedBy?.user || owedTo?.user;
      const friendName = user?.profile?.displayName || user?.email || "Unknown";
      console.log("[BillchopFriendsScreen] Balance for friend:", {
        friendId,
        friendName,
        owed: result.owed,
        owedTo: result.owedTo,
        netBalance: result.owedTo - result.owed,
        breakdown: result.breakdown,
      });
    }

    return result;
  }

  const filteredFriends = useMemo(() => {
    let result = friends;

    // Apply filter
    if (filter !== "all") {
      result = result.filter((friend) => {
        const friendUserId = friend?.friend?.id || friend?.friendId || "";
        const balance = getBalanceForFriend(friendUserId);
        const netBalance = balance.owedTo - balance.owed;

        if (filter === "owe-you") return netBalance > 0.01;
        if (filter === "you-owe") return netBalance < -0.01;
        if (filter === "settled") return Math.abs(netBalance) < 0.01;
        return true;
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((friend) => {
        const name = getUserDisplayName(friend).toLowerCase();
        return name.includes(query);
      });
    }

    return result;
  }, [friends, searchQuery, filter]);

  // Get recent expenses for a friend (last 2)
  function getRecentExpensesForFriend(friendId: string): Expense[] {
    if (!expenses || !Array.isArray(expenses)) return [];
    return expenses
      .filter((expense) => {
        // Check if friend is in splits
        return (
          expense.splits?.some((split) => split.userId === friendId) ||
          expense.paidBy === friendId ||
          expense.createdBy === friendId
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2);
  }

  // Calculate financial stats
  const financialStats = useMemo(() => {
    const friendsList = Array.isArray(friends) ? friends : [];
    if (!balances) {
      return {
        totalOwedToYou: 0,
        totalYouOwe: 0,
        netBalance: 0,
        unsettledCount: 0,
      };
    }

    let totalOwedToYou = 0;
    let totalYouOwe = 0;
    let unsettledCount = 0;

    friendsList.forEach((friend) => {
      const friendUserId = friend?.friend?.id || friend?.friendId || "";
      const balance = getBalanceForFriend(friendUserId);
      const netBalance = balance.owedTo - balance.owed;

      if (netBalance > 0.01) {
        totalOwedToYou += netBalance;
        unsettledCount++;
      } else if (netBalance < -0.01) {
        totalYouOwe += Math.abs(netBalance);
        unsettledCount++;
      }
    });

    return {
      totalOwedToYou,
      totalYouOwe,
      netBalance: totalOwedToYou - totalYouOwe,
      unsettledCount,
    };
  }, [friends, balances]);

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  // Header options for the options menu
  const headerOptions: HeaderOption[] = [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Friends & Balances"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Friends & Balances"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
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
        title="Friends & Balances"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        useOptionsMenu={true}
        options={headerOptions}
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
          {/* Add New Friends Button */}
          {onAddNewFriends && (
            <TouchableOpacity
              style={styles.addNewFriendsButton}
              onPress={onAddNewFriends}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="person-add"
                size={20}
                color={theme.colors.textInverse}
              />
              <Text style={styles.addNewFriendsButtonText}>
                Add New Friends
              </Text>
            </TouchableOpacity>
          )}

          {/* Financial Stats Cards */}
          {friends.length > 0 && balances && (
            <View style={styles.statsContainer}>
              <TouchableOpacity
                style={[
                  styles.statCard,
                  filter === "all" && styles.statCardActive,
                ]}
                onPress={() => setFilter("all")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statValue,
                    filter === "all" && styles.statValueActive,
                  ]}
                >
                  {formatCurrency(
                    financialStats.netBalance,
                    balances.primaryCurrency || "USD",
                  )}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    filter === "all" && styles.statLabelActive,
                  ]}
                >
                  Net Balance
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statCard,
                  filter === "owe-you" && styles.statCardActive,
                ]}
                onPress={() => setFilter("owe-you")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statValue,
                    styles.statValuePositive,
                    filter === "owe-you" && styles.statValueActive,
                  ]}
                >
                  {formatCurrency(
                    financialStats.totalOwedToYou,
                    balances.primaryCurrency || "USD",
                  )}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    filter === "owe-you" && styles.statLabelActive,
                  ]}
                >
                  Owed to You
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statCard,
                  filter === "you-owe" && styles.statCardActive,
                ]}
                onPress={() => setFilter("you-owe")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statValue,
                    styles.statValueNegative,
                    filter === "you-owe" && styles.statValueActive,
                  ]}
                >
                  {formatCurrency(
                    financialStats.totalYouOwe,
                    balances.primaryCurrency || "USD",
                  )}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    filter === "you-owe" && styles.statLabelActive,
                  ]}
                >
                  You Owe
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statCard,
                  filter === "settled" && styles.statCardActive,
                ]}
                onPress={() => setFilter("settled")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statValue,
                    filter === "settled" && styles.statValueActive,
                  ]}
                >
                  {friends.length - financialStats.unsettledCount}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    filter === "settled" && styles.statLabelActive,
                  ]}
                >
                  Settled
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar */}
          {friends.length > 0 && (
            <View style={styles.searchContainer}>
              <Icon
                name="search"
                size={20}
                color={theme.colors.textSecondary}
              />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search friends..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.textTertiary}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    searchInputRef.current?.blur();
                  }}
                >
                  <Icon
                    name="close"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {filteredFriends.length === 0 ? (
            <EmptyState
              icon={searchQuery ? "search" : "people"}
              title={searchQuery ? "No friends found" : "No Friends Yet"}
              message={
                searchQuery
                  ? "Try adjusting your search query."
                  : "Add friends to start splitting expenses with them."
              }
              actionLabel={
                !searchQuery && onAddNewFriends ? "Add Friends" : undefined
              }
              onAction={
                !searchQuery && onAddNewFriends ? onAddNewFriends : undefined
              }
            />
          ) : (
            filteredFriends.map((friend) => {
              const friendName = getUserDisplayName(friend);
              // Get the actual friend user ID (not the friendship ID)
              const friendUserId = friend?.friend?.id || friend?.friendId || "";
              const balance = getBalanceForFriend(friendUserId);
              const netBalance = balance.owedTo - balance.owed;

              return (
                <TouchableOpacity
                  key={friend?.id}
                  style={styles.friendCard}
                  onPress={() => onViewFriendExpenses(friendUserId, friendName)}
                  activeOpacity={0.7}
                >
                  {/* Top row with name and action buttons */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.friendName}>{friendName}</Text>
                    <View style={styles.cardActions}>
                      {onMessageFriend && (
                        <TouchableOpacity
                          style={styles.messageButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            onMessageFriend(friendUserId, friendName);
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name="chat"
                            size={18}
                            color={theme.colors.primary}
                          />
                        </TouchableOpacity>
                      )}
                      {onSettleUp && netBalance !== 0 && (
                        <TouchableOpacity
                          style={styles.settleButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            const settleAmount = Math.abs(netBalance);
                            onSettleUp(friendUserId, settleAmount, friendName);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.settleButtonText}>Settle</Text>
                        </TouchableOpacity>
                      )}
                      <Icon
                        name="chevron-right"
                        size={20}
                        color={theme.colors.textTertiary}
                      />
                    </View>
                  </View>

                  {/* Main content */}
                  <View style={styles.friendInfo}>
                    <Avatar
                      avatarUrl={friend?.friend?.profile?.avatarUrl}
                      displayName={friendName}
                      size={48}
                    />
                    <View style={styles.friendDetails}>
                      {/* Balance Status */}
                      {netBalance !== 0 ? (
                        <View style={styles.balanceRow}>
                          <Icon
                            name={netBalance > 0 ? "arrow-down" : "arrow-up"}
                            size={14}
                            color={
                              netBalance > 0
                                ? theme.colors.success
                                : theme.colors.error
                            }
                          />
                          <Text
                            style={[
                              styles.balanceText,
                              netBalance > 0
                                ? styles.positiveBalance
                                : styles.negativeBalance,
                            ]}
                          >
                            {netBalance > 0
                              ? `Owes you ${formatCurrency(Math.abs(netBalance), balances?.primaryCurrency || "USD")}`
                              : `You owe ${formatCurrency(Math.abs(netBalance), balances?.primaryCurrency || "USD")}`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.settledText}>Settled up</Text>
                      )}

                      {/* Recent Expenses Preview - Show first, more important */}
                      {(() => {
                        const recentExpenses =
                          getRecentExpensesForFriend(friendUserId);
                        if (recentExpenses.length === 0) return null;
                        return (
                          <View style={styles.recentExpensesContainer}>
                            <Text style={styles.recentExpensesLabel}>
                              Recent
                            </Text>
                            {recentExpenses.map((expense, idx) => (
                              <Text
                                key={expense.id}
                                style={styles.recentExpenseText}
                                numberOfLines={1}
                              >
                                {expense.description} •{" "}
                                {formatCurrency(
                                  expense.amount,
                                  expense.currency,
                                )}
                              </Text>
                            ))}
                          </View>
                        );
                      })()}

                      {/* Detailed breakdown - Collapsed by default, less prominent */}
                      {netBalance !== 0 && balance.breakdown && (
                        <View style={styles.breakdownContainer}>
                          {balance.breakdown.owedTo && (
                            <>
                              {balance.breakdown.owedTo.byGroup &&
                                Array.isArray(
                                  balance.breakdown.owedTo.byGroup,
                                ) &&
                                balance.breakdown.owedTo.byGroup
                                  .filter((group) => group.amount > 0.01)
                                  .map((group) => (
                                    <Text
                                      key={group.groupId}
                                      style={styles.breakdownDetailText}
                                    >
                                      {friendName} owes you{" "}
                                      {formatCurrency(group.amount)} in "
                                      {group.groupName}"
                                    </Text>
                                  ))}
                              {balance.breakdown.owedTo.individual &&
                                balance.breakdown.owedTo.individual > 0.01 && (
                                  <Text style={styles.breakdownDetailText}>
                                    {friendName} owes you{" "}
                                    {formatCurrency(
                                      balance.breakdown.owedTo.individual,
                                    )}{" "}
                                    in non-group expenses
                                  </Text>
                                )}
                              {balance.breakdown.owedTo.rideshare &&
                                balance.breakdown.owedTo.rideshare > 0.01 && (
                                  <Text style={styles.breakdownDetailText}>
                                    {friendName} owes you{" "}
                                    {formatCurrency(
                                      balance.breakdown.owedTo.rideshare,
                                    )}{" "}
                                    from rides
                                  </Text>
                                )}
                            </>
                          )}
                          {balance.breakdown.owed && (
                            <>
                              {balance.breakdown.owed.byGroup &&
                                Array.isArray(balance.breakdown.owed.byGroup) &&
                                balance.breakdown.owed.byGroup
                                  .filter((group) => group.amount > 0.01)
                                  .map((group) => (
                                    <Text
                                      key={group.groupId}
                                      style={[
                                        styles.breakdownDetailText,
                                        styles.breakdownOwedText,
                                      ]}
                                    >
                                      You owe {friendName}{" "}
                                      {formatCurrency(group.amount)} in "
                                      {group.groupName}"
                                    </Text>
                                  ))}
                              {balance.breakdown.owed.individual &&
                                balance.breakdown.owed.individual > 0.01 && (
                                  <Text
                                    style={[
                                      styles.breakdownDetailText,
                                      styles.breakdownOwedText,
                                    ]}
                                  >
                                    You owe {friendName}{" "}
                                    {formatCurrency(
                                      balance.breakdown.owed.individual,
                                    )}{" "}
                                    in non-group expenses
                                  </Text>
                                )}
                              {balance.breakdown.owed.rideshare &&
                                balance.breakdown.owed.rideshare > 0.01 && (
                                  <Text
                                    style={[
                                      styles.breakdownDetailText,
                                      styles.breakdownOwedText,
                                    ]}
                                  >
                                    You owe {friendName}{" "}
                                    {formatCurrency(
                                      balance.breakdown.owed.rideshare,
                                    )}{" "}
                                    from rides
                                  </Text>
                                )}
                            </>
                          )}
                        </View>
                      )}
                    </View>
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
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.base,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.base,
      borderWidth: 2,
      borderColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      padding: 0,
    },
    settleButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: theme.spacing.sm,
      borderRadius: 10,
      marginRight: theme.spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    settleButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: -0.1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing["2xl"],
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
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.md,
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    summaryCard: {
      backgroundColor: theme.colors.background,
      padding: 20,
      marginBottom: theme.spacing.base,
      borderRadius: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    summaryLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    summaryAmount: {
      fontSize: theme.typography.fontSize["3xl"],
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.5,
    },
    summaryPositive: {
      color: theme.colors.success,
    },
    summaryNegative: {
      color: theme.colors.error,
    },
    friendCard: {
      padding: theme.spacing.base,
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.base,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    messageButton: {
      padding: theme.spacing.sm,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.primaryBackground,
    },
    friendInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    friendDetails: {
      flex: 1,
      flexShrink: 1,
      marginLeft: 12,
    },
    friendName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.2,
      flex: 1,
    },
    balanceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    balanceText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    settledText: {
      fontSize: theme.typography.fontSize.xs + 1,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      marginTop: 2,
    },
    breakdownContainer: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },
    breakdownDetailText: {
      fontSize: theme.typography.fontSize.xs - 1,
      color: theme.colors.success,
      marginTop: 3,
      lineHeight: 16,
    },
    breakdownOwedText: {
      color: theme.colors.warning,
    },
    positiveBalance: {
      color: theme.colors.error,
    },
    negativeBalance: {
      color: theme.colors.success,
    },
    statsContainer: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.md,
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.border,
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
    statCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryBackground,
    },
    statValue: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    statValueActive: {
      color: theme.colors.primary,
    },
    statValuePositive: {
      color: theme.colors.success,
    },
    statValueNegative: {
      color: theme.colors.error,
    },
    statLabel: {
      fontSize: theme.typography.fontSize.xs - 1,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "center",
    },
    statLabelActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    recentExpensesContainer: {
      marginTop: 8,
    },
    recentExpensesLabel: {
      fontSize: theme.typography.fontSize.xs - 1,
      color: theme.colors.textTertiary,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    recentExpenseText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
      lineHeight: 16,
    },
    headerActionButton: {
      padding: theme.spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: theme.colors.background + "26", // rgba equivalent
    },
    addNewFriendsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.md,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.base,
      gap: theme.spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    addNewFriendsButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
