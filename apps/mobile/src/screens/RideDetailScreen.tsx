import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/authContext";
import {
  getRideById,
  joinRide,
  deleteRide,
  getRideHistory,
  Ride,
  RideParticipant,
  RideHistoryEntry,
} from "../api/rideApi";
import { SkeletonDetailScreen } from "../components/SkeletonLoader";
import { ErrorState } from "../components/ErrorState";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { Header, HeaderOption } from "../components/Header";
import { useTheme } from "../theme";

interface RideDetailScreenProps {
  rideId: string;
  onBack: () => void;
  onRefresh: () => void;
  onNavigateToEdit?: (rideId: string) => void;
  onNavigateToExpense?: (expenseId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function RideDetailScreen({
  rideId,
  onBack,
  onRefresh,
  onNavigateToEdit,
  onNavigateToExpense,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: RideDetailScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [history, setHistory] = useState<RideHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [joining, setJoining] = useState(false);

  const {
    data: ride,
    loading,
    error,
    refreshing,
    refresh,
    refetch,
  } = useDataFetch<Ride>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getRideById(token, rideId);
    },
    immediate: true,
    deps: [token, rideId],
  });

  async function loadHistory() {
    if (!token || history.length > 0) return;

    try {
      setLoadingHistory(true);
      const historyData = await getRideHistory(token, rideId);
      setHistory(historyData);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  const { execute: handleDeleteOperation, loading: deleting } =
    useAsyncOperation({
      operationFn: async () => {
        if (!token || !ride) throw new Error("No authentication token or ride");
        return deleteRide(token, rideId);
      },
      onSuccess: () => {
        Alert.alert(
          "Success",
          "Ride deleted successfully. The associated expense remains in Billchop.",
          [{ text: "OK", onPress: onBack }],
        );
      },
      onError: (errorMessage) => {
        Alert.alert("Error", errorMessage);
      },
    });

  function handleDelete() {
    if (!ride) return;

    Alert.alert(
      "Delete Ride",
      "Are you sure you want to delete this ride? The associated expense will remain in Billchop. All participants will be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteOperation(),
        },
      ],
    );
  }

  function handleEdit() {
    if (onNavigateToEdit) {
      onNavigateToEdit(rideId);
    }
  }

  const { execute: handleJoinOperation, loading: joiningOperation } =
    useAsyncOperation({
      operationFn: async () => {
        if (!token || !ride) throw new Error("No authentication token or ride");
        return joinRide(token, rideId);
      },
      onSuccess: () => {
        Alert.alert(
          "Success",
          "You have joined the ride! Expense splits have been recalculated.",
          [
            {
              text: "OK",
              onPress: () => {
                refetch();
                onRefresh();
              },
            },
          ],
        );
      },
      onError: (errorMessage) => {
        Alert.alert("Error", errorMessage);
      },
    });

  function handleJoinConfirm() {
    Alert.alert(
      "Join Ride",
      "Are you sure you want to join this ride? Expense splits will be recalculated.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Join",
          onPress: () => handleJoinOperation(),
        },
      ],
    );
  }

  function getUserDisplayName(
    user: Ride["driver"] | RideParticipant["user"] | undefined | null,
  ): string {
    if (!user) return "Unknown";
    return user.profile?.displayName || user.email || "Unknown";
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function getTypeLabel(type: Ride["type"]): string {
    return type === "giveRide" ? "Charge Riders" : "Split Cost";
  }

  function getTypeIcon(
    type: Ride["type"],
  ): keyof typeof MaterialIcons.glyphMap {
    return type === "giveRide" ? "drive-eta" : "share";
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Ride Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (error || !ride) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Ride Details"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error || "Ride not found"} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const isDriver = ride.driverId === user?.id;
  const isParticipant = (ride.participants || []).some(
    (p) => p.userId === user?.id,
  );
  const canJoin = !isDriver && !isParticipant;
  const passengers = (ride.participants || []).filter((p) => !p.isDriver);

  // Calculate cost per person for display
  // For "Charge Riders" (giveRide): Each passenger pays the FULL totalCost (driver charges each individually)
  // For "Split Cost" (rideshare): Cost is split equally among all participants including driver
  let costPerPerson: number;
  if (ride.type === "giveRide") {
    // Charge Riders: Each passenger pays the full amount (not split)
    costPerPerson = ride.totalCost; // Each passenger pays the FULL amount
  } else {
    // Split Cost: Split equally among all participants including driver
    const participantCount = ride.participants.length;
    costPerPerson =
      participantCount > 0 ? ride.totalCost / participantCount : 0;
  }

  // Prepare header options menu
  const headerOptions: HeaderOption[] = [];
  if (isDriver) {
    if (onNavigateToEdit) {
      headerOptions.push({
        label: "Edit",
        icon: "edit",
        onPress: () => onNavigateToEdit(ride.id),
      });
    }
    headerOptions.push({
      label: "Delete",
      icon: "delete",
      onPress: handleDelete,
      danger: true,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Ride Details"
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
          {/* Hero Total Cost Card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Total Cost</Text>
            <Text style={styles.heroAmount}>
              {formatCurrency(ride.totalCost, ride.currency)}
            </Text>
            <View style={styles.routeContainer}>
              <MaterialIcons
                name="place"
                size={18}
                color={theme.colors.success}
              />
              <Text style={styles.heroRoute} numberOfLines={2}>
                {ride.origin} → {ride.destination}
              </Text>
            </View>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.typeBadge,
                  ride.type === "giveRide"
                    ? styles.typeBadgeCharge
                    : styles.typeBadgeSplit,
                ]}
              >
                <MaterialIcons
                  name={getTypeIcon(ride.type)}
                  size={14}
                  color={theme.colors.white}
                />
                <Text style={styles.typeBadgeText}>
                  {getTypeLabel(ride.type)}
                </Text>
              </View>
              {isDriver && (
                <View style={styles.roleBadge}>
                  <MaterialIcons
                    name="verified"
                    size={14}
                    color={theme.colors.white}
                  />
                  <Text style={styles.roleBadgeText}>Driver</Text>
                </View>
              )}
              {isParticipant && !isDriver && (
                <View style={styles.roleBadgeParticipant}>
                  <MaterialIcons
                    name="check-circle"
                    size={14}
                    color={theme.colors.white}
                  />
                  <Text style={styles.roleBadgeText}>Joined</Text>
                </View>
              )}
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons
                  name="calendar-today"
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.label}>Date</Text>
              </View>
              <Text style={styles.value}>{formatDate(ride.date)}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons
                  name="person"
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.label}>Driver</Text>
              </View>
              <View style={styles.userInfo}>
                <Avatar
                  avatarUrl={getAvatarUrl(
                    ride.driver?.profile?.avatarUrl || null,
                  )}
                  displayName={getUserDisplayName(ride.driver)}
                  size={24}
                  borderColor={theme.colors.border}
                  borderWidth={1}
                />
                <Text style={styles.value}>
                  {isDriver ? "You" : getUserDisplayName(ride.driver)}
                </Text>
              </View>
            </View>

            {ride.distance && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons
                    name="straighten"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.label}>Distance</Text>
                </View>
                <Text style={styles.value}>
                  {ride.distance.toFixed(1)} miles
                </Text>
              </View>
            )}

            {ride.chargePerMile && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons
                    name="attach-money"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.label}>Charge per mile</Text>
                </View>
                <Text style={styles.value}>
                  {formatCurrency(ride.chargePerMile, ride.currency)}
                </Text>
              </View>
            )}

            {ride.chargePerRide && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialIcons
                    name="money"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.label}>Flat rate</Text>
                </View>
                <Text style={styles.value}>
                  {formatCurrency(ride.chargePerRide, ride.currency)}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialIcons
                  name="people"
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.label}>Cost per person</Text>
              </View>
              <Text style={[styles.value, styles.costPerPerson]}>
                {ride.type === "giveRide"
                  ? `${formatCurrency(costPerPerson, ride.currency)} each` // Charge Riders: Full amount per passenger
                  : formatCurrency(costPerPerson, ride.currency)}{" "}
                {/* Split Cost: Split amount */}
              </Text>
            </View>
          </View>

          {/* Expense Link Card */}
          {ride.expenseId && (
            <TouchableOpacity
              style={styles.expenseLinkCard}
              onPress={() => {
                if (onNavigateToExpense && ride.expenseId) {
                  onNavigateToExpense(ride.expenseId);
                }
              }}
              activeOpacity={onNavigateToExpense ? 0.7 : 1}
              disabled={!onNavigateToExpense}
            >
              <View style={styles.expenseLinkContent}>
                <MaterialIcons
                  name={onNavigateToExpense ? "receipt" : "check-circle"}
                  size={20}
                  color={theme.colors.success}
                />
                <View style={styles.expenseLinkTextContainer}>
                  <Text style={styles.expenseLinkTitle}>
                    Expense automatically created
                  </Text>
                  <Text style={styles.expenseLinkSubtitle}>
                    {onNavigateToExpense
                      ? "Tap to view in Billchop"
                      : "Added to expense splitting"}
                  </Text>
                </View>
                {onNavigateToExpense && (
                  <Icon
                    name="chevron-right"
                    size={24}
                    color={theme.colors.textTertiary}
                  />
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Participants Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Participants ({ride.participants.length})
            </Text>
            <View style={styles.participantsList}>
              {/* Driver */}
              <View style={styles.participantCard}>
                <Avatar
                  avatarUrl={getAvatarUrl(
                    ride.driver?.profile?.avatarUrl || null,
                  )}
                  displayName={getUserDisplayName(ride.driver)}
                  size={40}
                  borderColor={theme.colors.success}
                  borderWidth={2}
                />
                <View style={styles.participantInfo}>
                  <View style={styles.participantHeader}>
                    <Text style={styles.participantName}>
                      {isDriver ? "You" : getUserDisplayName(ride.driver)}
                    </Text>
                    <View style={styles.driverRoleBadge}>
                      <MaterialIcons
                        name="verified"
                        size={12}
                        color={theme.colors.white}
                      />
                      <Text style={styles.driverRoleText}>Driver</Text>
                    </View>
                  </View>
                  <Text style={styles.participantEmail}>
                    {ride.driver?.email}
                  </Text>
                </View>
                <View style={styles.participantCost}>
                  {ride.type === "rideshare" && (
                    <Text style={styles.participantCostAmount}>
                      {formatCurrency(costPerPerson, ride.currency)}
                    </Text>
                  )}
                  {ride.type === "giveRide" && (
                    <Text style={styles.participantCostFree}>Free</Text>
                  )}
                </View>
              </View>

              {/* Passengers */}
              {passengers.map((participant, index) => (
                <View
                  key={participant.id}
                  style={[
                    styles.participantCard,
                    index === passengers.length - 1 &&
                      styles.participantCardLast,
                  ]}
                >
                  <Avatar
                    avatarUrl={getAvatarUrl(
                      participant.user?.profile?.avatarUrl || null,
                    )}
                    displayName={getUserDisplayName(participant.user)}
                    size={40}
                    borderColor={theme.colors.border}
                    borderWidth={1}
                  />
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.userId === user?.id
                        ? "You"
                        : getUserDisplayName(participant.user)}
                    </Text>
                    <Text style={styles.participantEmail}>
                      {participant.user?.email}
                    </Text>
                  </View>
                  <View style={styles.participantCost}>
                    {ride.type === "giveRide" ? (
                      // Charge Riders: Each passenger pays the FULL amount (not split)
                      <Text style={styles.participantCostAmount}>
                        {formatCurrency(ride.totalCost, ride.currency)}
                      </Text>
                    ) : (
                      // Split Cost: Each participant pays the split amount
                      <Text style={styles.participantCostAmount}>
                        {formatCurrency(costPerPerson, ride.currency)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Join Button - for non-participants */}
          {canJoin && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinConfirm}
              disabled={joiningOperation}
              activeOpacity={0.7}
            >
              {joiningOperation ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <>
                  <MaterialIcons
                    name="add"
                    size={20}
                    color={theme.colors.white}
                  />
                  <Text style={styles.joinButtonText}>Join Ride</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* History Section - Collapsible */}
          {isDriver && (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.historyHeader}
                onPress={() => {
                  if (!showHistory) {
                    loadHistory();
                  }
                  setShowHistory(!showHistory);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.historyHeaderLeft}>
                  <MaterialIcons
                    name="history"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.historyTitle}>History</Text>
                </View>
                <MaterialIcons
                  name={
                    showHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"
                  }
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {showHistory && (
                <View style={styles.historyContent}>
                  {loadingHistory ? (
                    <View style={styles.historyLoading}>
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.primary}
                      />
                      <Text style={styles.historyLoadingText}>
                        Loading history...
                      </Text>
                    </View>
                  ) : history.length === 0 ? (
                    <Text style={styles.historyEmpty}>
                      No history available
                    </Text>
                  ) : (
                    <View style={styles.historyList}>
                      {history.map((entry, index) => (
                        <View
                          key={index}
                          style={[
                            styles.historyItem,
                            index === history.length - 1 &&
                              styles.historyItemLast,
                          ]}
                        >
                          <Text style={styles.historyItemDescription}>
                            {entry.description}
                          </Text>
                          <Text style={styles.historyItemTime}>
                            {formatDate(entry.timestamp)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
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
    heroCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.base,
      alignItems: "center",
      ...theme.shadows.md,
    },
    heroLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    heroAmount: {
      fontSize: 48,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    routeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    heroRoute: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      textAlign: "center",
      maxWidth: "90%",
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    typeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 12,
    },
    typeBadgeCharge: {
      backgroundColor: theme.colors.blue,
    },
    typeBadgeSplit: {
      backgroundColor: theme.colors.primary,
    },
    typeBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 12,
      backgroundColor: theme.colors.success,
    },
    roleBadgeParticipant: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 12,
      backgroundColor: theme.colors.warning,
    },
    roleBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    card: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.sm,
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
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    value: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "right",
    },
    costPerPerson: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.blue,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    expenseLinkCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
    },
    expenseLinkContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    expenseLinkTextContainer: {
      flex: 1,
    },
    expenseLinkTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    expenseLinkSubtitle: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    participantsList: {
      gap: theme.spacing.md,
    },
    participantCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    participantCardLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    participantInfo: {
      flex: 1,
    },
    participantHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    participantName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    participantEmail: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    driverRoleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: 8,
      backgroundColor: theme.colors.success,
    },
    driverRoleText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    participantCost: {
      alignItems: "flex-end",
    },
    participantCostAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    participantCostFree: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.success,
    },
    joinButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: 16,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.base,
      ...theme.shadows.md,
    },
    joinButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    historyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
    },
    historyHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    historyTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    historyContent: {
      marginTop: theme.spacing.md,
    },
    historyLoading: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      justifyContent: "center",
    },
    historyLoadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    historyEmpty: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
      textAlign: "center",
      padding: theme.spacing.md,
    },
    historyList: {
      gap: theme.spacing.md,
    },
    historyItem: {
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    historyItemLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    historyItemDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    historyItemTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
  });
}
