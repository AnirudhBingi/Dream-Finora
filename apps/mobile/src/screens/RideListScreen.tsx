import React, { useState, useMemo } from "react";
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
import {
  QuickAccessSection,
  QuickAccessButton,
} from "../components/QuickAccessSection";
import { useAuth } from "../auth/authContext";
import {
  getRides,
  Ride,
  getFavoriteRides,
  RideFavorite,
  createRideFromFavorite,
  deleteFavoriteRide,
  updateFavoriteRide,
  UpdateRideFavoriteDto,
} from "../api/rideApi";
import { Header } from "../components/Header";
import { SkeletonRideList } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useDataFetch } from "../hooks/useDataFetch";
import { useBottomNavPadding } from "../hooks/useBottomNavPadding";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { useTheme, colorWithOpacity, getBackgroundVariant } from "../theme";
import { Alert } from "react-native";

interface RideListScreenProps {
  onCreateRide: () => void;
  onViewRide: (rideId: string) => void;
  onBack: () => void;
  groupId?: string;
  onViewAnalytics?: () => void;
  onViewHistory?: () => void;
  onEditFavorite?: (favorite: RideFavorite) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function RideListScreen({
  onCreateRide,
  onViewRide,
  onBack,
  groupId,
  onViewAnalytics,
  onViewHistory,
  onEditFavorite,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: RideListScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const bottomPadding = useBottomNavPadding(true);

  const { data, loading, refreshing, error, refresh, refetch } = useDataFetch<
    Ride[]
  >({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getRides(token, groupId);
    },
    immediate: true,
    deps: [token, groupId],
  });

  const {
    data: favorites,
    loading: favoritesLoading,
    error: favoritesError,
    refetch: refetchFavorites,
  } = useDataFetch<RideFavorite[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getFavoriteRides(token);
    },
    immediate: true,
    deps: [token],
  });

  // Sort rides by date (newest first) and limit to 5 most recent
  const recentRides = useMemo(() => {
    const allRides = data ?? [];
    return allRides
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt).getTime() -
          new Date(a.date || a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [data]);

  const favoriteRides = (favorites ?? []) as RideFavorite[];
  const [recordingFavoriteId, setRecordingFavoriteId] = useState<string | null>(
    null,
  );

  async function handleRecordRide(favoriteId: string) {
    if (!token) {
      Alert.alert("Error", "No authentication token");
      return;
    }

    try {
      setRecordingFavoriteId(favoriteId);
      await createRideFromFavorite(token, favoriteId);
      await refetch(); // Refresh rides list
      await refetchFavorites(); // Refresh favorites list
      Alert.alert("Success", "Ride recorded successfully!");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to record ride",
      );
    } finally {
      setRecordingFavoriteId(null);
    }
  }

  async function handleDeleteFavorite(favoriteId: string) {
    if (!token) return;
    Alert.alert(
      "Delete Favorite",
      "Are you sure you want to delete this favorite?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFavoriteRide(token, favoriteId);
              await refetchFavorites();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Failed to delete favorite",
              );
            }
          },
        },
      ],
    );
  }

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

  if (loading && recentRides.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Rides"
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
        >
          <View style={styles.content}>
            <SkeletonRideList count={5} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Rides"
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
            refreshing={refreshing || favoritesLoading}
            onRefresh={async () => {
              await refresh();
              await refetchFavorites();
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.content}>
          {error && recentRides.length === 0 && (
            <ErrorState message={error} onRetry={refetch} />
          )}

          {/* Favorites Error (shown separately from rides error) */}
          {favoritesError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                Error loading favorites: {favoritesError}
              </Text>
              <TouchableOpacity
                onPress={refetchFavorites}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Favorite Riders Section - Quick Action Cards */}
          {favoritesLoading && (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading favorites...</Text>
            </View>
          )}

          {!favoritesLoading && favoriteRides.length > 0 && (
            <View style={styles.favoritesQuickSection}>
              <View style={styles.favoritesQuickHeader}>
                <View style={styles.favoritesQuickHeaderLeft}>
                  <View style={styles.favoritesQuickIcon}>
                    <MaterialIcons
                      name="flash-on"
                      size={20}
                      color={theme.colors.warning}
                    />
                  </View>
                  <View>
                    <Text style={styles.favoritesQuickTitle}>Quick Rides</Text>
                    <Text style={styles.favoritesQuickSubtitle}>
                      Tap to record instantly
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.favoritesQuickScroll}
                contentContainerStyle={styles.favoritesQuickScrollContent}
              >
                {favoriteRides.map((favorite) => {
                  const isRecording = recordingFavoriteId === favorite.id;
                  const totalAmount = favorite.chargePerRide
                    ? favorite.chargePerRide * favorite.passengers.length
                    : null;

                  return (
                    <View key={favorite.id} style={styles.favoriteQuickCard}>
                      <View style={styles.favoriteQuickCardTop}>
                        <View style={styles.favoriteQuickNameRow}>
                          <View style={styles.favoriteQuickNameLeft}>
                            <Text
                              style={styles.favoriteQuickName}
                              numberOfLines={1}
                            >
                              {favorite.name}
                            </Text>
                            <MaterialIcons
                              name="star"
                              size={14}
                              color={theme.colors.warning}
                            />
                          </View>
                          <View style={styles.favoriteQuickActions}>
                            {onEditFavorite && (
                              <TouchableOpacity
                                style={styles.favoriteQuickIconButton}
                                onPress={() => onEditFavorite(favorite)}
                                disabled={
                                  isRecording || recordingFavoriteId !== null
                                }
                                activeOpacity={0.7}
                              >
                                <MaterialIcons
                                  name="edit"
                                  size={16}
                                  color={theme.colors.textSecondary}
                                />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.favoriteQuickIconButton}
                              onPress={() => handleDeleteFavorite(favorite.id)}
                              disabled={
                                isRecording || recordingFavoriteId !== null
                              }
                              activeOpacity={0.7}
                            >
                              <MaterialIcons
                                name="delete-outline"
                                size={16}
                                color={theme.colors.error}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.favoriteQuickPassengersList}>
                          {favorite.passengers.slice(0, 2).map((passenger) => (
                            <View
                              key={passenger.id}
                              style={styles.favoriteQuickPassengerItem}
                            >
                              <Avatar
                                avatarUrl={passenger.avatarUrl}
                                displayName={passenger.displayName}
                                size={28}
                                borderColor={theme.colors.background}
                                borderWidth={1}
                              />
                              <Text
                                style={styles.favoriteQuickPassengerName}
                                numberOfLines={1}
                              >
                                {passenger.displayName}
                              </Text>
                            </View>
                          ))}
                          {favorite.passengers.length > 2 && (
                            <View style={styles.favoriteQuickMorePassengers}>
                              <Text
                                style={styles.favoriteQuickMorePassengersText}
                              >
                                +{favorite.passengers.length - 2} more
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.favoriteQuickCardBottom}>
                        <View style={styles.favoriteQuickAmountRow}>
                          {totalAmount !== null ? (
                            <Text style={styles.favoriteQuickAmount}>
                              {formatCurrency(totalAmount)}
                            </Text>
                          ) : (
                            <Text style={styles.favoriteQuickAmountPlaceholder}>
                              {favorite.chargePerRide
                                ? formatCurrency(favorite.chargePerRide) +
                                  "/ride"
                                : favorite.chargePerMile
                                  ? formatCurrency(favorite.chargePerMile) +
                                    "/mile"
                                  : "Pricing not set"}
                            </Text>
                          )}
                          <TouchableOpacity
                            style={[
                              styles.favoriteQuickAddButton,
                              isRecording &&
                                styles.favoriteQuickAddButtonDisabled,
                            ]}
                            onPress={() => handleRecordRide(favorite.id)}
                            disabled={
                              isRecording || recordingFavoriteId !== null
                            }
                            activeOpacity={0.8}
                          >
                            {isRecording ? (
                              <ActivityIndicator
                                size="small"
                                color={theme.colors.primary}
                              />
                            ) : (
                              <MaterialIcons
                                name="add"
                                size={20}
                                color={theme.colors.primary}
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Quick Access Section */}
          <QuickAccessSection
            buttons={[
              ...(onViewHistory
                ? [
                    {
                      label: "History",
                      icon: "activity",
                      iconColor: theme.colors.primary,
                      onPress: onViewHistory,
                    },
                  ]
                : []),
              {
                label: "Create",
                materialIcon: "add",
                iconColor: theme.colors.success,
                onPress: onCreateRide,
              },
              ...(onViewAnalytics
                ? [
                    {
                      label: "Analytics",
                      icon: "analytics",
                      iconColor: theme.colors.blue,
                      onPress: onViewAnalytics,
                    },
                  ]
                : []),
            ]}
          />

          {recentRides.length === 0 && !error && (
            <EmptyState
              icon="directions-car"
              title="No rides yet"
              message="Create your first ride to start tracking shared trips and expenses!"
              actionLabel="Create Ride"
              onAction={onCreateRide}
            />
          )}

          {recentRides.map((ride) => {
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
                    {formatDate(ride.date)} •{" "}
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
    headerActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "center",
    },
    headerActionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCreateButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.blue,
      alignItems: "center",
      justifyContent: "center",
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
      gap: theme.spacing.sm,
      flexWrap: "wrap",
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
    rideInfo: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    rideFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: theme.spacing.md,
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
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    participantsInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    participantsText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    favoritesQuickSection: {
      marginBottom: theme.spacing.xl,
      backgroundColor: colorWithOpacity(theme.colors.white, 0.7),
      borderRadius: 20,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: colorWithOpacity(theme.colors.black, 0.1),
      ...theme.shadows.md,
    },
    favoritesQuickHeader: {
      marginBottom: theme.spacing.md,
    },
    favoritesQuickHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    favoritesQuickIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.warningBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    favoritesQuickTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    favoritesQuickSubtitle: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    favoritesQuickScroll: {
      marginHorizontal: -theme.spacing.sm,
    },
    favoritesQuickScrollContent: {
      paddingHorizontal: theme.spacing.sm,
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
    favoriteQuickCard: {
      width: 200,
      backgroundColor: colorWithOpacity(theme.colors.white, 0.9),
      borderRadius: 16,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: colorWithOpacity(theme.colors.black, 0.08),
      ...theme.shadows.sm,
    },
    favoriteQuickCardTop: {
      marginBottom: theme.spacing.sm,
    },
    favoriteQuickNameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    favoriteQuickNameLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 1,
    },
    favoriteQuickName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    favoriteQuickPassengersList: {
      gap: theme.spacing.sm,
    },
    favoriteQuickPassengerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    favoriteQuickPassengerName: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
    },
    favoriteQuickMorePassengers: {
      marginTop: theme.spacing.xs,
    },
    favoriteQuickMorePassengersText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    favoriteQuickCardBottom: {
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colorWithOpacity(theme.colors.black, 0.08),
      marginTop: theme.spacing.xs,
    },
    favoriteQuickAmountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    favoriteQuickAmount: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.bold,
      flex: 1,
    },
    favoriteQuickAmountPlaceholder: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
    },
    favoriteQuickAddButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryBackground,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    favoriteQuickAddButtonDisabled: {
      opacity: 0.6,
    },
    favoriteQuickActions: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    favoriteQuickIconButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.backgroundTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingSection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    errorText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginRight: theme.spacing.sm,
    },
    retryButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.error,
      borderRadius: theme.spacing.xs,
    },
    retryButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.white,
    },
  });
