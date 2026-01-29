import React, { useMemo } from "react";
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
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/authContext";
import { getRides, Ride } from "../api/rideApi";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useDataFetch } from "../hooks/useDataFetch";
import { useBottomNavPadding } from "../hooks/useBottomNavPadding";
import { useTheme } from "../theme";

interface RideHistoryScreenProps {
  onBack: () => void;
  onViewRide: (rideId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function RideHistoryScreen({
  onBack,
  onViewRide,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: RideHistoryScreenProps) {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const bottomPadding = useBottomNavPadding(true);

  const { data, loading, refreshing, error, refresh, refetch } = useDataFetch<
    Ride[]
  >({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getRides(token);
    },
    immediate: true,
    deps: [token],
  });

  // Sort rides by date (newest first)
  const sortedRides = useMemo(() => {
    const allRides = data ?? [];
    return allRides.sort(
      (a, b) =>
        new Date(b.date || b.createdAt).getTime() -
        new Date(a.date || a.createdAt).getTime(),
    );
  }, [data]);

  function getUserDisplayName(user: Ride["driver"]): string {
    if (!user) return "Unknown";
    return user?.profile?.displayName || user?.email || "Unknown";
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
    });
  }

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  function getTypeIcon(
    type: Ride["type"],
  ): keyof typeof MaterialIcons.glyphMap {
    return type === "giveRide" ? "drive-eta" : "share";
  }

  function getTypeLabel(type: Ride["type"]): string {
    return type === "giveRide" ? "Charge Riders" : "Split Cost";
  }

  if (loading && sortedRides.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Ride History"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading rides...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Ride History"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
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
          {error && sortedRides.length === 0 && (
            <ErrorState message={error} onRetry={refetch} />
          )}

          {sortedRides.length === 0 && !error && (
            <EmptyState
              icon="directions-car"
              title="No rides yet"
              message="Your ride history will appear here"
            />
          )}

          {sortedRides.map((ride) => {
            const isDriver = ride.driverId === user?.id;
            const isParticipant = (ride.participants || []).some(
              (p) => p.userId === user?.id,
            );
            const participantCount = (ride.participants || []).length;
            const passengers = (ride.participants || []).filter(
              (p) => !p.isDriver,
            );

            // Calculate cost per person for display
            const costPerPerson =
              ride.type === "rideshare"
                ? ride.totalCost / (participantCount || 1)
                : ride.totalCost / (passengers.length || 1);

            return (
              <TouchableOpacity
                key={ride.id}
                style={styles.rideCard}
                onPress={() => onViewRide(ride.id)}
                activeOpacity={0.7}
              >
                <View style={styles.rideHeader}>
                  <View style={styles.rideHeaderLeft}>
                    <View style={styles.routeContainer}>
                      <MaterialIcons
                        name="place"
                        size={16}
                        color={theme.colors.success}
                      />
                      <Text style={styles.routeText} numberOfLines={1}>
                        {ride.origin} → {ride.destination}
                      </Text>
                    </View>
                    <Text style={styles.rideAmount}>
                      {formatCurrency(ride.totalCost, ride.currency)}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-right"
                    size={24}
                    color={theme.colors.textTertiary}
                  />
                </View>

                <View style={styles.rideMeta}>
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

                  <Text style={styles.rideInfo}>
                    {formatDate(ride.date || ride.createdAt)} •{" "}
                    {formatCurrency(costPerPerson, ride.currency)} each
                  </Text>
                </View>

                <View style={styles.rideFooter}>
                  <View style={styles.driverInfo}>
                    <Avatar
                      avatarUrl={getAvatarUrl(
                        ride.driver?.profile?.avatarUrl || null,
                      )}
                      displayName={getUserDisplayName(ride.driver)}
                      size={24}
                      borderColor={theme.colors.border}
                      borderWidth={1}
                    />
                    <Text style={styles.driverText} numberOfLines={1}>
                      {isDriver ? "You" : getUserDisplayName(ride.driver)}
                    </Text>
                  </View>

                  {participantCount > 0 && (
                    <View style={styles.participantsInfo}>
                      <MaterialIcons
                        name="people"
                        size={16}
                        color={theme.colors.textTertiary}
                      />
                      <Text style={styles.participantsText}>
                        {participantCount}{" "}
                        {participantCount === 1 ? "person" : "people"}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    rideCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    rideHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.md,
    },
    rideHeaderLeft: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    routeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    routeText: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    rideAmount: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    rideMeta: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexWrap: "wrap",
    },
    typeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.spacing.xs,
    },
    typeBadgeCharge: {
      backgroundColor: theme.colors.warning,
    },
    typeBadgeSplit: {
      backgroundColor: theme.colors.blue,
    },
    typeBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.white,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.spacing.xs,
      backgroundColor: theme.colors.success,
    },
    roleBadgeParticipant: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
    },
    roleBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.white,
    },
    rideInfo: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    rideFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    driverInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    driverText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    participantsInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    participantsText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
    },
  });
