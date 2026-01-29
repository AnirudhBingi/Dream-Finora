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
import { useAuth } from "../auth/authContext";
import {
  getRideAnalytics,
  RideAnalytics,
  RideAnalyticsSummary,
  RideMonthlyTrend,
  TopRoute,
  TopCompanion,
  RideSpendingByGroup,
} from "../api/analyticsApi";
import { Header, HeaderOption } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useDataFetch } from "../hooks/useDataFetch";
import { Avatar } from "../components/Avatar";
import { getAvatarUrl } from "../utils/avatar";
import { useTheme } from "../theme";

interface RideAnalyticsScreenProps {
  onBack: () => void;
  onNavigateToRide?: (rideId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function RideAnalyticsScreen({
  onBack,
  onNavigateToRide,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: RideAnalyticsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(6); // months

  const {
    data: analytics,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<RideAnalytics>({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");
      return getRideAnalytics(token, selectedPeriod);
    },
    immediate: true,
    deps: [token, selectedPeriod],
  });

  // Header options
  const headerOptions: HeaderOption[] = [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Ride Analytics"
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
        >
          <View style={styles.content}>
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <SkeletonLoader width="100%" height={80} borderRadius={16} />
              </View>
              <View style={styles.summaryCard}>
                <SkeletonLoader width="100%" height={80} borderRadius={16} />
              </View>
            </View>
            <View style={styles.section}>
              <SkeletonLoader
                width="60%"
                height={24}
                borderRadius={4}
                style={{ marginBottom: 16 }}
              />
              <SkeletonLoader width="100%" height={220} borderRadius={16} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && !analytics) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Ride Analytics"
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

  const summary = analytics?.summary;
  const monthlyTrends = analytics?.monthlyTrends || [];
  const topRoutes = analytics?.topRoutes || [];
  const topCompanions = analytics?.topCompanions || [];
  const ridesByGroup = analytics?.spendingByGroup || []; // Renamed for clarity (shows ride counts, not spending)

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Ride Analytics"
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
          {error && (monthlyTrends.length > 0 || summary) && (
            <View style={styles.errorBanner}>
              <MaterialIcons
                name="error-outline"
                size={20}
                color={theme.colors.error}
              />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity
                onPress={refetch}
                style={styles.errorRetryButton}
              >
                <Text style={styles.errorRetryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary Cards */}
          {summary && (
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <MaterialIcons
                    name="directions-car"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.summaryCardLabel}>Total Rides</Text>
                </View>
                <Text style={styles.summaryCardValue}>
                  {summary.totalRides}
                </Text>
                <View style={styles.summaryCardBreakdown}>
                  <Text style={styles.summaryCardSubtext}>
                    {summary.ridesAsDriver} as driver
                  </Text>
                  <Text style={styles.summaryCardSubtext}>•</Text>
                  <Text style={styles.summaryCardSubtext}>
                    {summary.ridesAsPassenger} as passenger
                  </Text>
                </View>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <MaterialIcons
                    name={
                      summary.ridesAsDriver >= summary.ridesAsPassenger
                        ? "person"
                        : "group"
                    }
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.summaryCardLabel}>Mostly</Text>
                </View>
                <Text style={styles.summaryCardValue}>
                  {summary.ridesAsDriver >= summary.ridesAsPassenger
                    ? "Driver"
                    : "Passenger"}
                </Text>
                <Text style={styles.summaryCardSubtext}>
                  {Math.abs(summary.ridesAsDriver - summary.ridesAsPassenger)}{" "}
                  {Math.abs(
                    summary.ridesAsDriver - summary.ridesAsPassenger,
                  ) === 1
                    ? "ride"
                    : "rides"}{" "}
                  {summary.ridesAsDriver >= summary.ridesAsPassenger
                    ? "as driver"
                    : "as passenger"}
                </Text>
              </View>
            </View>
          )}

          {/* Monthly Ride Breakdown */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ride Activity</Text>
              <View style={styles.periodSelector}>
                {[3, 6, 12].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedPeriod(period);
                      refetch();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        selectedPeriod === period &&
                          styles.periodButtonTextSelected,
                      ]}
                    >
                      {period}M
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {monthlyTrends.length === 0 ? (
              <EmptyState
                icon="directions-car"
                title="No ride data yet"
                message="Create rides to see your monthly activity breakdown."
              />
            ) : (
              <View style={styles.monthlyBreakdownCard}>
                {monthlyTrends
                  .sort((a, b) => b.month.localeCompare(a.month)) // Most recent first
                  .map((trend) => {
                    const [year, month] = trend.month.split("-");
                    const monthDate = new Date(
                      parseInt(year),
                      parseInt(month) - 1,
                    );
                    const maxRides = Math.max(
                      ...monthlyTrends.map((t) => t.rides),
                      1,
                    );
                    const barWidth =
                      maxRides > 0 ? (trend.rides / maxRides) * 100 : 0;

                    return (
                      <View key={trend.month} style={styles.monthlyItem}>
                        <View style={styles.monthlyHeader}>
                          <Text style={styles.monthlyLabel}>
                            {monthDate.toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </Text>
                          <View style={styles.monthlyBadge}>
                            <Text style={styles.monthlyCount}>
                              {trend.rides}
                            </Text>
                            <Text style={styles.monthlyCountLabel}>
                              {trend.rides === 1 ? "ride" : "rides"}
                            </Text>
                          </View>
                        </View>
                        {maxRides > 0 && (
                          <View style={styles.monthlyBarContainer}>
                            <View
                              style={[
                                styles.monthlyBar,
                                { width: `${barWidth}%` },
                              ]}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            )}
          </View>

          {/* Driver vs Passenger Comparison */}
          {summary && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Driver vs Passenger</Text>
              <View style={styles.driverPassengerCard}>
                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonItem}>
                    <MaterialIcons
                      name="person"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.comparisonLabel}>As Driver</Text>
                    <Text style={styles.comparisonValue}>
                      {summary.ridesAsDriver}
                    </Text>
                    <Text style={styles.comparisonSubtext}>
                      {summary.totalRides > 0
                        ? `${Math.round((summary.ridesAsDriver / summary.totalRides) * 100)}% of rides`
                        : "0%"}
                    </Text>
                  </View>
                  <View style={styles.comparisonDivider} />
                  <View style={styles.comparisonItem}>
                    <MaterialIcons
                      name="group"
                      size={24}
                      color={theme.colors.success}
                    />
                    <Text style={styles.comparisonLabel}>As Passenger</Text>
                    <Text style={styles.comparisonValue}>
                      {summary.ridesAsPassenger}
                    </Text>
                    <Text style={styles.comparisonSubtext}>
                      {summary.totalRides > 0
                        ? `${Math.round((summary.ridesAsPassenger / summary.totalRides) * 100)}% of rides`
                        : "0%"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Top Routes */}
          {topRoutes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Frequent Routes</Text>
              <View style={styles.routesList}>
                {topRoutes.slice(0, 5).map((route, index) => (
                  <View key={route.route} style={styles.routeItem}>
                    <View style={styles.routeRank}>
                      <Text style={styles.routeRankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.routeInfo}>
                      <View style={styles.routeTextContainer}>
                        <MaterialIcons
                          name="place"
                          size={16}
                          color={theme.colors.success}
                        />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {route.origin}
                        </Text>
                      </View>
                      <MaterialIcons
                        name="arrow-forward"
                        size={16}
                        color={theme.colors.textTertiary}
                      />
                      <View style={styles.routeTextContainer}>
                        <MaterialIcons
                          name="place"
                          size={16}
                          color={theme.colors.error}
                        />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {route.destination}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.routeCount}>{route.count}x</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Top Companions */}
          {topCompanions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Ride Companions</Text>
              <View style={styles.companionsList}>
                {topCompanions.slice(0, 5).map((companion, index) => (
                  <TouchableOpacity
                    key={companion.userId}
                    style={styles.companionItem}
                    onPress={() => {
                      // TODO: Navigate to user profile if onNavigateToUserProfile available
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.companionRank}>
                      <Text style={styles.companionRankText}>#{index + 1}</Text>
                    </View>
                    <Avatar
                      avatarUrl={getAvatarUrl(companion.avatarUrl)}
                      displayName={companion.displayName}
                      size={40}
                    />
                    <View style={styles.companionInfo}>
                      <Text style={styles.companionName} numberOfLines={1}>
                        {companion.displayName}
                      </Text>
                      <View style={styles.companionStats}>
                        <Text style={styles.companionRides}>
                          {companion.rides}{" "}
                          {companion.rides === 1
                            ? "ride together"
                            : "rides together"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Rides by Group */}
          {ridesByGroup.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rides by Group</Text>
              <View style={styles.groupsList}>
                {ridesByGroup
                  .sort((a, b) => b.rides - a.rides) // Sort by ride count, not spending
                  .slice(0, 5)
                  .map((group) => (
                    <View key={group.groupId} style={styles.groupItem}>
                      <View style={styles.groupInfo}>
                        <MaterialIcons
                          name="group"
                          size={20}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.groupName} numberOfLines={1}>
                          {group.groupName}
                        </Text>
                      </View>
                      <View style={styles.groupAmounts}>
                        <Text style={styles.groupAmount}>{group.rides}</Text>
                        <Text style={styles.groupRides}>
                          {group.rides === 1 ? "ride" : "rides"}
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Empty State */}
          {!summary &&
            monthlyTrends.length === 0 &&
            topRoutes.length === 0 &&
            topCompanions.length === 0 &&
            ridesByGroup.length === 0 && (
              <EmptyState
                icon="directions-car"
                title="No ride data yet"
                message="Create rides to see your ride patterns, frequent routes, and top companions!"
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
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.errorBackground,
      padding: theme.spacing.md,
      borderRadius: 12,
      marginBottom: theme.spacing.base,
      gap: theme.spacing.sm,
    },
    errorBannerText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
    },
    errorRetryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.error,
      borderRadius: 8,
    },
    errorRetryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    summaryCards: {
      flexDirection: "row",
      gap: theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      ...theme.shadows.sm,
    },
    summaryCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    summaryCardLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    summaryCardValue: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    summaryCardBreakdown: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
    },
    summaryCardSubtext: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    periodSelector: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    periodButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    periodButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    periodButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    periodButtonTextSelected: {
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    monthlyBreakdownCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      ...theme.shadows.sm,
      gap: theme.spacing.md,
    },
    monthlyItem: {
      gap: theme.spacing.sm,
    },
    monthlyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    monthlyLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    monthlyBadge: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: theme.spacing.xs / 2,
      backgroundColor: theme.colors.primaryBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 999,
    },
    monthlyCount: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
    },
    monthlyCountLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    monthlyBarContainer: {
      height: 8,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 4,
      overflow: "hidden",
    },
    monthlyBar: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 4,
    },
    typeList: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    typeItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: 12,
      ...theme.shadows.sm,
    },
    typeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    typeName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    typeAmounts: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    typeAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    typeCount: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    routesList: {
      gap: theme.spacing.sm,
    },
    routeItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: 12,
      ...theme.shadows.sm,
    },
    routeRank: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    routeRankText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
    },
    routeInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    routeTextContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      flex: 1,
    },
    routeText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    routeCount: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    companionsList: {
      gap: theme.spacing.sm,
    },
    companionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: 12,
      ...theme.shadows.sm,
    },
    companionRank: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    companionRankText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
    },
    companionInfo: {
      flex: 1,
    },
    companionName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    companionStats: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    companionRides: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    driverPassengerCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.base,
      ...theme.shadows.sm,
    },
    comparisonRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    comparisonItem: {
      flex: 1,
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    comparisonDivider: {
      width: 1,
      height: 60,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.md,
    },
    comparisonLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    comparisonValue: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    comparisonSubtext: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      textAlign: "center",
    },
    groupsList: {
      gap: theme.spacing.sm,
    },
    groupItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: 12,
      ...theme.shadows.sm,
    },
    groupInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    groupName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    groupAmounts: {
      alignItems: "flex-end",
    },
    groupAmount: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    groupRides: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs / 4,
    },
  });
}
