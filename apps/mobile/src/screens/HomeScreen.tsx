import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text as RNText,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Icon } from "../components/Icon";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { Card } from "../components/Card";
import { Text } from "../components/Text";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { useAuth } from "../auth/authContext";
import { useTheme } from "../theme";
import { getBalances, BalanceInfo } from "../api/expenseApi";
import {
  getBalance,
  BalanceInfo as FinanceBalanceInfo,
} from "../api/financeApi";
import { useDataFetch } from "../hooks/useDataFetch";

interface HomeScreenProps {
  onNavigateToProfile: () => void;
  onNavigateToExpenses: () => void;
  onNavigateToGroups: () => void;
  onNavigateToFinance: () => void;
  onNavigateToChores: () => void;
  onNavigateToRides: () => void;
  onNavigateToSpaceV: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToActivity?: () => void;
  onNavigateToFriends?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToLeaderboard?: () => void;
  refreshKey?: number; // Add refresh key to trigger balance refresh
}

export function HomeScreen({
  onNavigateToProfile,
  onNavigateToExpenses,
  onNavigateToGroups,
  onNavigateToFinance,
  onNavigateToChores,
  onNavigateToRides,
  onNavigateToSpaceV,
  onNavigateToMessages,
  onNavigateToAnalytics,
  onNavigateToActivity,
  onNavigateToFriends,
  onNavigateToNotifications,
  onNavigateToSettings,
  onNavigateToLeaderboard,
  refreshKey,
}: HomeScreenProps) {
  const { theme, resolvedMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, resolvedMode), [theme, resolvedMode]);
  const { user, token } = useAuth();

  // Animation values for glassy card
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Start shimmer animation loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  interface HomeBalanceData {
    balances: BalanceInfo;
    financeBalance: FinanceBalanceInfo | null;
  }

  const { data, loading, refreshing, error, refresh, refetch } =
    useDataFetch<HomeBalanceData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        console.log("[HomeScreen] Loading balances, refreshKey:", refreshKey);
        const [balanceData, financeData] = await Promise.all([
          getBalances(token),
          getBalance(token, "local", false).catch(() => null), // Get local finance balance, don't include billchop
        ]);
        console.log("[HomeScreen] Balance data loaded:", {
          totalOwed: balanceData.totalOwed,
          totalOwedToUser: balanceData.totalOwedToUser,
          netBalance: balanceData.netBalance,
          owedByUserCount: balanceData.owedByUser.length,
          owedToUserCount: balanceData.owedToUser.length,
        });
        return {
          balances: balanceData,
          financeBalance: financeData,
        };
      },
      immediate: true,
      deps: [token, refreshKey],
    });

  const balances = data?.balances ?? null;
  const financeBalance = data?.financeBalance ?? null;

  const onRefresh = React.useCallback(() => {
    refresh();
  }, [refresh]);

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  // totalOwed = how much user owes others
  // totalOwedToUser = how much others owe the user
  const totalOwed = balances?.totalOwed || 0;
  const totalOwedToUser = balances?.totalOwedToUser || 0;
  const netBalance = totalOwedToUser - totalOwed; // Positive = user is owed, Negative = user owes
  const personalFinanceBalance = financeBalance?.totalBalance || 0;
  const personalFinanceCurrency =
    financeBalance?.localCurrency || balances?.primaryCurrency || "USD";

  return (
    <>
      <Header
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScreenWrapper
        scroll
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Unified Balance Flow Card */}
        {loading ? (
          <View style={styles.balanceSection}>
            <View style={styles.balanceFlowCard}>
              {/* Glassy gradient overlay */}
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.08)',
                  'rgba(255, 255, 255, 0.02)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.glassOverlay}
              />
              <View style={styles.balanceFlowContainer}>
                <View
                  style={[styles.balanceFlowSide, styles.balanceFlowSideLeft]}
                >
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.error}
                    style={styles.balanceFlowLoader}
                  />
                </View>
                <View style={styles.balanceFlowDivider} />
                <View
                  style={[styles.balanceFlowSide, styles.balanceFlowSideRight]}
                >
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.success}
                    style={styles.balanceFlowLoader}
                  />
                </View>
              </View>
            </View>
          </View>
        ) : totalOwed > 0 ||
          totalOwedToUser > 0 ||
          personalFinanceBalance !== 0 ? (
          <View style={styles.balanceSection}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.balanceFlowCard}
              >
                {/* Enhanced glassy gradient overlay */}
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0.15)',
                    'rgba(255, 255, 255, 0.05)',
                    'rgba(255, 255, 255, 0.01)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.glassOverlay}
                />
                
                {/* Animated shimmer effect */}
                <Animated.View
                  style={[
                    styles.shimmerOverlay,
                    {
                      opacity: shimmerAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.3, 0],
                      }),
                      transform: [
                        {
                          translateX: shimmerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-400, 400],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(255, 255, 255, 0.3)',
                      'transparent',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                  />
                </Animated.View>

              {/* Top Section - Net Balance Indicator */}
              {netBalance !== 0 && (
                <View style={styles.netBalanceBanner}>
                  <View
                    style={[
                      styles.netBalanceIndicator,
                      netBalance > 0
                        ? styles.netBalanceIndicatorPositive
                        : styles.netBalanceIndicatorNegative,
                    ]}
                  >
                    <Icon
                      name={netBalance > 0 ? "trending-up" : "trending-down"}
                      size={16}
                      color={
                        netBalance > 0
                          ? theme.colors.success
                          : theme.colors.error
                      }
                    />
                  </View>
                  <RNText style={styles.netBalanceBannerText}>
                    {netBalance > 0 ? "You're ahead by" : "You owe"}
                  </RNText>
                  <RNText
                    style={[
                      styles.netBalanceBannerAmount,
                      netBalance > 0
                        ? styles.netBalanceBannerAmountPositive
                        : styles.netBalanceBannerAmountNegative,
                    ]}
                  >
                    {formatCurrency(
                      Math.abs(netBalance),
                      balances?.primaryCurrency || "USD",
                    )}
                  </RNText>
                </View>
              )}

              {/* Main Balance Flow - Billchop Balances */}
              {(totalOwed > 0 || totalOwedToUser > 0) && (
                <View style={styles.balanceFlowContainer}>
                  {/* Left: You Owe */}
                  <View
                    style={[styles.balanceFlowSide, styles.balanceFlowSideLeft]}
                  >
                    <View style={styles.balanceFlowHeader}>
                      <View style={styles.balanceFlowIconContainer}>
                        <Icon
                          name="arrow-up"
                          size={16}
                          color={theme.colors.error}
                        />
                      </View>
                      <RNText style={styles.balanceFlowLabel}>YOU OWE</RNText>
                    </View>
                    <RNText style={styles.balanceFlowAmountRed}>
                      {formatCurrency(
                        totalOwed,
                        balances?.primaryCurrency || "USD",
                      )}
                    </RNText>
                  </View>

                  {/* Center Divider with Floating Action */}
                  <View style={styles.balanceFlowDivider}>
                    <TouchableOpacity
                      style={styles.balanceFlowConnector}
                      onPress={onNavigateToExpenses}
                      activeOpacity={0.8}
                    >
                      <Icon name="add" size={20} color={theme.colors.accentForeground} />
                    </TouchableOpacity>
                  </View>

                  {/* Right: You're Owed */}
                  <View
                    style={[
                      styles.balanceFlowSide,
                      styles.balanceFlowSideRight,
                    ]}
                  >
                    <View style={styles.balanceFlowHeader}>
                      <RNText style={styles.balanceFlowLabel}>YOU'RE OWED</RNText>
                      <View style={styles.balanceFlowIconContainer}>
                        <Icon
                          name="arrow-down"
                          size={16}
                          color={theme.colors.success}
                        />
                      </View>
                    </View>
                    <RNText style={styles.balanceFlowAmountGreen}>
                      {formatCurrency(
                        totalOwedToUser,
                        balances?.primaryCurrency || "USD",
                      )}
                    </RNText>
                  </View>
                </View>
              )}

              {/* Personal Finance Balance Section */}
              {personalFinanceBalance !== 0 && (
                <View style={styles.personalFinanceSection}>
                  <View style={styles.personalFinanceDivider} />
                  <TouchableOpacity
                    style={styles.personalFinanceRow}
                    onPress={onNavigateToFinance}
                    activeOpacity={0.8}
                  >
                    <View style={styles.personalFinanceHeader}>
                      <View style={styles.personalFinanceIconContainer}>
                        <Icon
                          name="account-balance-wallet"
                          size={18}
                          color={theme.colors.primary}
                        />
                      </View>
                      <RNText style={styles.personalFinanceLabel}>
                        PERSONAL FINANCE
                      </RNText>
                    </View>
                    <RNText style={styles.personalFinanceAmount}>
                      {formatCurrency(
                        personalFinanceBalance,
                        personalFinanceCurrency,
                      )}
                    </RNText>
                  </TouchableOpacity>
                </View>
              )}
              </Pressable>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.balanceSection}>
            <EmptyState
              icon="account-balance-wallet"
              title="No balances yet"
              message="Start splitting bills with friends or add transactions to see your balances here."
              actionLabel="Create Billchop"
              onAction={onNavigateToExpenses}
            />
          </View>
        )}

        {/* Social Features */}
        <View style={styles.section}>
          <Text variant="h4" style={styles.sectionTitle}>Social</Text>
          <View style={styles.buttonGrid}>
            {onNavigateToFriends && (
              <TouchableOpacity
                style={[styles.featureButton, styles.friendButton]}
                onPress={onNavigateToFriends}
                activeOpacity={0.7}
              >
                <Icon name="friends" size={20} color={theme.colors.white} />
                <RNText style={styles.featureButtonText}>Friends</RNText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.featureButton, styles.groupButton]}
              onPress={onNavigateToGroups}
              activeOpacity={0.7}
            >
              <Icon name="groups" size={20} color={theme.colors.white} />
              <RNText style={styles.featureButtonText}>Circles</RNText>
            </TouchableOpacity>
            {onNavigateToMessages && (
              <TouchableOpacity
                style={[styles.featureButton, styles.messageButton]}
                onPress={onNavigateToMessages}
                activeOpacity={0.7}
              >
                <Icon name="messages" size={20} color={theme.colors.white} />
                <RNText style={styles.featureButtonText}>Messages</RNText>
              </TouchableOpacity>
            )}
            {onNavigateToActivity && (
              <TouchableOpacity
                style={[styles.featureButton, styles.activityButton]}
                onPress={onNavigateToActivity}
                activeOpacity={0.7}
              >
                <Icon name="activity" size={20} color={theme.colors.white} />
                <RNText style={styles.featureButtonText}>Activity</RNText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Finance & Tools */}
        <View style={styles.section}>
          <Text variant="h4" style={styles.sectionTitle}>Finance & Tools</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.featureButton, styles.financeButton]}
              onPress={onNavigateToFinance}
              activeOpacity={0.7}
            >
              <Icon name="finance" size={20} color={theme.colors.white} />
              <RNText style={styles.featureButtonText}>My Wallet</RNText>
            </TouchableOpacity>
            {onNavigateToAnalytics && (
              <TouchableOpacity
                style={[styles.featureButton, styles.analyticsButton]}
                onPress={onNavigateToAnalytics}
                activeOpacity={0.7}
              >
                <Icon name="analytics" size={20} color={theme.colors.white} />
                <RNText style={styles.featureButtonText}>Insights</RNText>
              </TouchableOpacity>
            )}
            {onNavigateToLeaderboard && (
              <TouchableOpacity
                style={[styles.featureButton, styles.leaderboardButton]}
                onPress={onNavigateToLeaderboard}
                activeOpacity={0.7}
              >
                <Icon name="star" size={20} color={theme.colors.white} />
                <RNText style={styles.featureButtonText}>FinScore</RNText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScreenWrapper>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"], resolvedMode: ReturnType<typeof useTheme>["resolvedMode"]) =>
  StyleSheet.create({
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerText: {
      flex: 1,
      alignItems: "flex-start",
    },
    title: {
      fontSize: theme.typography.fontSize["3xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.blue,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    notificationButton: {
      backgroundColor: theme.colors.primary,
    },
    notificationButtonContainer: {
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: -8,
      right: -8,
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.xs,
    },
    badgeText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    email: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    balanceSection: {
      paddingTop: theme.spacing.base,
      paddingBottom: theme.spacing.sm,
    },
    section: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
      letterSpacing: -0.3,
    },
    balanceFlowCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 24, // Larger radius for liquid feel
      overflow: "hidden", // Changed to hidden for gradient overlay
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
        },
        android: {
          elevation: 12,
        },
      }),
      borderWidth: 2,
      borderColor: resolvedMode === 'light' 
        ? 'rgba(0, 0, 0, 0.08)' 
        : 'rgba(255, 255, 255, 0.15)',
    },
    glassOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    shimmerOverlay: {
      position: "absolute",
      top: 0,
      left: -100,
      right: -100,
      bottom: 0,
      zIndex: 1,
    },
    shimmerGradient: {
      flex: 1,
      width: 200,
      transform: [{ skewX: "-20deg" }],
    },
    netBalanceBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.base,
      gap: theme.spacing.sm,
      backgroundColor: 'rgba(255, 255, 255, 0.05)', // More visible glassy overlay
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.12)',
      zIndex: 2, // Above gradient overlay
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
      fontSize: theme.typography.fontSize.sm,
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
      zIndex: 2, // Above gradient overlay
    },
    balanceFlowSide: {
      flex: 1,
      padding: theme.spacing.base,
      justifyContent: "space-between",
    },
    balanceFlowSideLeft: {
      borderRightWidth: 0.5,
      borderRightColor: 'rgba(255, 255, 255, 0.08)', // Subtle divider
      backgroundColor: 'transparent', // Transparent to show gradient
    },
    balanceFlowSideRight: {
      backgroundColor: 'transparent', // Transparent to show gradient
    },
    balanceFlowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    balanceFlowIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.15)', // More glassy background
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.25)',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.white,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    balanceFlowLabel: {
      fontSize: theme.typography.fontSize.xs,
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
    balanceFlowLoader: {
      marginBottom: 8,
    },
    personalFinanceSection: {
      paddingTop: 12,
    },
    personalFinanceDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    personalFinanceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
    },
    personalFinanceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    personalFinanceIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    personalFinanceLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    personalFinanceAmount: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
    },
    personalFinanceLoader: {
      marginRight: 8,
    },
    balanceFlowDivider: {
      width: 1,
      backgroundColor: theme.colors.border,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      zIndex: 10,
    },
    balanceFlowConnector: {
      position: "absolute",
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      borderWidth: 3,
      borderColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
      left: -22.5,
      ...theme.shadows.lg,
    },
    buttonGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
    },
    featureButton: {
      flex: 1,
      minWidth: "47%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      ...theme.shadows.sm,
    },
    featureButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: -0.2,
    },
    friendButton: {
      backgroundColor: theme.colors.blue,
    },
    groupButton: {
      backgroundColor: theme.colors.primary,
    },
    messageButton: {
      backgroundColor: theme.colors.blue,
    },
    activityButton: {
      backgroundColor: theme.colors.primary,
    },
    financeButton: {
      backgroundColor: theme.colors.primary,
    },
    analyticsButton: {
      backgroundColor: theme.colors.primary,
    },
    leaderboardButton: {
      backgroundColor: theme.colors.warning,
    },
  });
