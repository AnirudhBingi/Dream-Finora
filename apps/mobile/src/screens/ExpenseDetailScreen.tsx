import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getExpenseById, deleteExpense, Expense } from "../api/expenseApi";
import { getApiBaseUrl } from "../api/getApiBaseUrl";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { Header, HeaderOption } from "../components/Header";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useTheme } from "../theme";

interface ExpenseDetailScreenProps {
  expenseId: string;
  onBack: () => void;
  onEdit?: (expenseId: string) => void;
  onNavigateToUserProfile?: (userId: string) => void;
  onNavigateToRide?: (rideId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function ExpenseDetailScreen({
  expenseId,
  onBack,
  onEdit,
  onNavigateToUserProfile,
  onNavigateToRide,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: ExpenseDetailScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();

  const {
    data: expense,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<Expense>({
    fetchFn: async () => {
      if (!token || !expenseId)
        throw new Error("No authentication token or expense ID");
      return getExpenseById(token, expenseId);
    },
    immediate: true,
    deps: [token, expenseId],
  });

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function getUserDisplayName(user: Expense["createdByUser"]): string {
    return user.profile?.displayName || user.email;
  }

  function isExpenseOwner(): boolean {
    return user?.id === expense?.createdBy;
  }

  // Prepare header options menu
  const headerOptions: HeaderOption[] = [];
  if (expense && isExpenseOwner()) {
    if (onEdit) {
      headerOptions.push({
        label: "Edit",
        icon: "edit",
        onPress: () => onEdit(expense.id),
      });
    }
    headerOptions.push({
      label: "Delete",
      icon: "delete",
      onPress: handleDeleteExpense,
      danger: true,
    });
  }

  const { execute: executeDeleteExpense, loading: deleting } =
    useAsyncOperation({
      operationFn: async () => {
        if (!token || !expense)
          throw new Error("No authentication token or expense");
        return deleteExpense(token, expense.id);
      },
      onSuccess: () => {
        Alert.alert("Success", "Expense deleted successfully", [
          { text: "OK", onPress: onBack },
        ]);
      },
      onError: (errorMessage) => {
        Alert.alert("Error", errorMessage);
      },
    });

  function handleDeleteExpense() {
    if (!expense) return;
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => executeDeleteExpense(),
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Expense Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Expense Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
          useOptionsMenu={true}
          options={headerOptions}
        />
        <ErrorState message={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (error || !expense) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Expense Details"
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
          <Text style={styles.errorText}>{error || "Expense not found"}</Text>
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
        title="Expense Details"
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
          {/* Hero Amount Card */}
          <View style={styles.heroCard}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amount}>
              {formatCurrency(expense.amount, expense.currency)}
            </Text>
            <Text style={styles.description}>{expense.description}</Text>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>

            {expense.category && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons
                    name="category"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.label}>Category</Text>
                </View>
                <Text style={styles.value}>{expense.category}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons
                  name="person"
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.label}>Created by</Text>
              </View>
              {expense.createdByUser &&
              expense.createdByUser.id !== user?.id ? (
                <TouchableOpacity
                  onPress={() => {
                    if (onNavigateToUserProfile && expense.createdByUser?.id) {
                      onNavigateToUserProfile(expense.createdByUser.id);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.value, styles.linkText]}>
                    {getUserDisplayName(expense.createdByUser)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.value}>
                  {getUserDisplayName(expense.createdByUser)}
                </Text>
              )}
            </View>

            {expense.paidByUser && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons
                    name="payment"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.label}>Paid by</Text>
                </View>
                <View style={styles.paidByContainer}>
                  {expense.paidByUser.id !== user?.id ? (
                    <TouchableOpacity
                      onPress={() => {
                        if (onNavigateToUserProfile && expense.paidByUser?.id) {
                          onNavigateToUserProfile(expense.paidByUser.id);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.value, styles.linkText]}>
                        {getUserDisplayName(expense.paidByUser)}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.value}>
                      {getUserDisplayName(expense.paidByUser)}
                    </Text>
                  )}
                  {expense.paidBy === expense.createdBy && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Creator</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons
                  name={
                    expense.splitType === "EQUAL"
                      ? "equalizer"
                      : expense.splitType === "CUSTOM"
                        ? "edit"
                        : "percent"
                  }
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.label}>Split type</Text>
              </View>
              <Text style={styles.value}>
                {expense.splitType === "EQUAL"
                  ? "Equal"
                  : expense.splitType === "CUSTOM"
                    ? "Custom"
                    : "Percentage"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons
                  name="calendar-today"
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.label}>Date</Text>
              </View>
              <Text style={styles.value}>
                {new Date(expense.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>

            {expense.group && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons
                    name="group"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.label}>Group</Text>
                </View>
                <View style={styles.groupInfoContainer}>
                  <Avatar
                    avatarUrl={getAvatarUrl(expense.group.avatarUrl || null)}
                    displayName={expense.group.name}
                    size={28}
                  />
                  <Text style={styles.value}>{expense.group.name}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Ride Link Card - Show if expense was created from a ride */}
          {expense.rideId && onNavigateToRide && (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onNavigateToRide(expense.rideId!)}
              activeOpacity={0.7}
            >
              <View style={styles.rideLinkHeader}>
                <View style={styles.rideLinkLeft}>
                  <MaterialIcons
                    name="directions-car"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <View style={styles.rideLinkText}>
                    <Text style={styles.cardTitle}>Linked Ride</Text>
                    <Text style={styles.rideLinkSubtitle}>
                      {expense.ride
                        ? `${expense.ride.origin} → ${expense.ride.destination}`
                        : "This expense was created from a ride"}
                    </Text>
                  </View>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.textTertiary}
                />
              </View>
            </TouchableOpacity>
          )}

          {/* Receipt Card */}
          {expense.receiptUrl && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Receipt</Text>
              <Image
                source={{
                  uri: expense.receiptUrl.startsWith("http")
                    ? expense.receiptUrl
                    : `${getApiBaseUrl()}${expense.receiptUrl}`,
                }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Splits Card - Redesigned to be more visual */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Splits</Text>
            <View style={styles.splitsList}>
              {expense.splits.map((split, index) => {
                const avatarUrl = getAvatarUrl(
                  split.user?.profile?.avatarUrl || null,
                );
                const displayName = getUserDisplayName(split.user);
                const initials = displayName.charAt(0).toUpperCase();
                const isYou = split.userId === user?.id;

                return (
                  <View
                    key={split.id}
                    style={[
                      styles.splitCard,
                      index === expense.splits.length - 1 &&
                        styles.splitCardLast,
                    ]}
                  >
                    <View style={styles.splitHeader}>
                      <View style={styles.splitUserInfo}>
                        <View
                          style={[
                            styles.avatar,
                            split.isPaid && styles.avatarPaid,
                          ]}
                        >
                          {avatarUrl ? (
                            <Image
                              source={{ uri: avatarUrl }}
                              style={styles.avatarImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.avatarPlaceholder}>
                              <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.splitUserDetails}>
                          {split.user?.id && split.user.id !== user?.id ? (
                            <TouchableOpacity
                              onPress={() => {
                                if (onNavigateToUserProfile && split.user?.id) {
                                  onNavigateToUserProfile(split.user.id);
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[styles.splitUserName, styles.linkText]}
                              >
                                {isYou ? "You" : displayName}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.splitUserName}>
                              {isYou ? "You" : displayName}
                            </Text>
                          )}
                          {split.isPaid && (
                            <View style={styles.paidBadge}>
                              <MaterialIcons
                                name="check-circle"
                                size={12}
                                color={theme.colors.success}
                              />
                              <Text style={styles.paidText}>Paid</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.splitAmount,
                          split.isPaid && styles.splitAmountPaid,
                        ]}
                      >
                        {formatCurrency(split.amount, expense.currency)}
                      </Text>
                    </View>
                  </View>
                );
              })}
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
      backgroundColor: theme.colors.backgroundSecondary,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing["2xl"],
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
    },
    retryButton: {
      marginTop: theme.spacing.base,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 48,
      ...theme.shadows.button,
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    heroCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.base,
      alignItems: "center",
      ...theme.shadows.md,
    },
    amountLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
    },
    amount: {
      fontSize: 48,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    description: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      textAlign: "center",
    },
    actionsCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      flexDirection: "row",
      gap: theme.spacing.md,
      ...theme.shadows.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      minHeight: 48,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    deleteButton: {
      backgroundColor: theme.colors.errorBackground,
      borderColor: theme.colors.errorBackground,
    },
    deleteButtonText: {
      color: theme.colors.error,
    },
    card: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.base,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray100,
    },
    detailLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    value: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
      textAlign: "right",
    },
    paidByContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    badge: {
      backgroundColor: theme.colors.success,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textInverse,
      textTransform: "uppercase",
    },
    linkText: {
      color: theme.colors.primary,
      textDecorationLine: "underline",
    },
    receiptImage: {
      width: "100%",
      height: 300,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    splitsList: {
      gap: theme.spacing.sm,
    },
    splitCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    splitCardLast: {
      marginBottom: 0,
    },
    splitHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    splitUserInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.primary,
      overflow: "hidden",
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
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    avatarPaid: {
      borderColor: theme.colors.success,
    },
    groupInfoContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    rideLinkHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rideLinkLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      flex: 1,
    },
    rideLinkText: {
      flex: 1,
    },
    rideLinkSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs / 2,
    },
    splitUserDetails: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    splitUserName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    paidBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      alignSelf: "flex-start",
      backgroundColor: theme.colors.successBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 12,
    },
    paidText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.success,
    },
    splitAmount: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    splitAmountPaid: {
      color: theme.colors.success,
    },
  });
