import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  getTrustScoreInsights,
  TrustScoreInsights,
} from "../api/trustScoreApi";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme } from "../theme";

interface TrustScoreInsightsScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function TrustScoreInsightsScreen({
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: TrustScoreInsightsScreenProps) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    data: insights,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<TrustScoreInsights>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getTrustScoreInsights(token);
    },
    immediate: true,
    deps: [token],
  });

  function getTrustScoreColor(score: number): string {
    if (score >= 90) return theme.colors.success;
    if (score >= 70) return theme.colors.blue;
    if (score >= 50) return theme.colors.warning;
    return theme.colors.error;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="FinScore Insights"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !insights) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="FinScore Insights"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || "Insights are unavailable right now."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const historySorted = [...insights.history].sort(
    (a: { timestamp: string }, b: { timestamp: string }) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const recentHistory = historySorted.slice(-7);
  const chartData = {
    labels: recentHistory.map((h: { timestamp: string }) =>
      formatDate(h.timestamp),
    ),
    datasets: [
      {
        data: recentHistory.map((h: { score: number }) => h.score),
        color: () => getTrustScoreColor(insights.currentScore),
        strokeWidth: 2,
      },
    ],
  };
  const screenWidth = Dimensions.get("window").width;
  const chartWidth =
    screenWidth - theme.spacing.base * 2 - theme.spacing.base * 2;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="FinScore Insights"
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
        {/* Score Summary */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreLabel}>Current FinScore</Text>
            <View style={styles.trendPill}>
              <MaterialIcons
                name={
                  insights.trend.direction === "up"
                    ? "trending-up"
                    : insights.trend.direction === "down"
                      ? "trending-down"
                      : "trending-flat"
                }
                size={16}
                color={
                  insights.trend.direction === "up"
                    ? theme.colors.success
                    : insights.trend.direction === "down"
                      ? theme.colors.error
                      : theme.colors.textSecondary
                }
              />
              <Text style={styles.trendText}>
                {insights.trend.direction === "up"
                  ? "+"
                  : insights.trend.direction === "down"
                    ? "-"
                    : ""}
                {Math.abs(insights.trend.change).toFixed(1)} last week
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.scoreValue,
              { color: getTrustScoreColor(insights.currentScore) },
            ]}
          >
            {insights.currentScore}
          </Text>
        </View>

        {/* Trend Chart */}
        {insights.history.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>FinScore Trend (Last 7 Days)</Text>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={200}
              chartConfig={{
                backgroundColor: theme.colors.background,
                backgroundGradientFrom: theme.colors.background,
                backgroundGradientTo: theme.colors.background,
                decimalPlaces: 0,
                color: () => theme.colors.textPrimary,
                labelColor: () => theme.colors.textSecondary,
                paddingRight: theme.spacing.base,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: getTrustScoreColor(insights.currentScore),
                },
              }}
              bezier
              style={styles.chart}
              withDots
              withShadow={false}
            />
          </View>
        )}

        {/* How FinScore Works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How FinScore Works</Text>
          <View style={styles.componentItem}>
            <Text style={styles.componentName}>Reliability</Text>
            <Text style={styles.componentImpact}>
              {(
                insights.affectsScore.expense.weight +
                insights.affectsScore.chore.weight
              ).toFixed(0)}
              %
            </Text>
          </View>
          <View style={styles.componentItem}>
            <Text style={styles.componentName}>Billchop expenses</Text>
            <Text style={styles.componentImpact}>
              {insights.affectsScore.expense.weight.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.componentItem}>
            <Text style={styles.componentName}>Chores</Text>
            <Text style={styles.componentImpact}>
              {insights.affectsScore.chore.weight.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.componentItem}>
            <Text style={styles.componentName}>Community</Text>
            <Text style={styles.componentImpact}>
              {insights.affectsScore.community.weight.toFixed(0)}%
            </Text>
          </View>
          {insights.affectsScore.responsiveness && (
            <View style={styles.componentItem}>
              <Text style={styles.componentName}>Responsiveness</Text>
              <Text style={styles.componentImpact}>
                {insights.affectsScore.responsiveness.weight.toFixed(0)}%
              </Text>
            </View>
          )}
          {insights.affectsScore.accountTrust && (
            <View style={styles.componentItem}>
              <Text style={styles.componentName}>Account trust</Text>
              <Text style={styles.componentImpact}>
                {insights.affectsScore.accountTrust.weight.toFixed(0)}%
              </Text>
            </View>
          )}
          <Text style={styles.helpText}>
            Reliability matters most. Organizing shared bills and getting them
            settled, plus creating chores that others complete, boosts your
            reliability score.
          </Text>
        </View>

        {/* What Affects Your Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Affects Your Score</Text>

          {/* Expense Score */}
          <View style={styles.breakdownSection}>
            <View style={styles.breakdownHeader}>
              <MaterialIcons
                name="receipt"
                size={20}
                color={theme.colors.blue}
              />
              <Text style={styles.breakdownSectionTitle}>
                Billchop Score ({insights.affectsScore.expense.weight}%)
              </Text>
            </View>
            {insights.affectsScore.expense.components.map(
              (component: { name: string; impact: number }, index: number) => (
                <View key={index} style={styles.componentItem}>
                  <Text style={styles.componentName}>{component.name}</Text>
                  <Text style={styles.componentImpact}>
                    {component.impact.toFixed(1)} points
                  </Text>
                </View>
              ),
            )}
          </View>

          {/* Chore Score */}
          <View style={styles.breakdownSection}>
            <View style={styles.breakdownHeader}>
              <MaterialIcons
                name="task"
                size={20}
                color={theme.colors.success}
              />
              <Text style={styles.breakdownSectionTitle}>
                Chore Board Score ({insights.affectsScore.chore.weight}%)
              </Text>
            </View>
            {insights.affectsScore.chore.components.map(
              (component: { name: string; impact: number }, index: number) => (
                <View key={index} style={styles.componentItem}>
                  <Text style={styles.componentName}>{component.name}</Text>
                  <Text style={styles.componentImpact}>
                    {component.impact.toFixed(1)} points
                  </Text>
                </View>
              ),
            )}
          </View>

          {/* Community Score */}
          <View style={styles.breakdownSection}>
            <View style={styles.breakdownHeader}>
              <MaterialIcons
                name="group"
                size={20}
                color={theme.colors.warning}
              />
              <Text style={styles.breakdownSectionTitle}>
                Community Score ({insights.affectsScore.community.weight}%)
              </Text>
            </View>
            {insights.affectsScore.community.components.map(
              (component: { name: string; impact: number }, index: number) => (
                <View key={index} style={styles.componentItem}>
                  <Text style={styles.componentName}>{component.name}</Text>
                  <Text style={styles.componentImpact}>
                    {component.impact.toFixed(1)} points
                  </Text>
                </View>
              ),
            )}
          </View>

          {insights.affectsScore.responsiveness && (
            <View style={styles.breakdownSection}>
              <View style={styles.breakdownHeader}>
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={20}
                  color={theme.colors.info}
                />
                <Text style={styles.breakdownSectionTitle}>
                  Responsiveness ({insights.affectsScore.responsiveness.weight}
                  %)
                </Text>
              </View>
              {insights.affectsScore.responsiveness.components.map(
                (
                  component: { name: string; impact: number },
                  index: number,
                ) => (
                  <View key={index} style={styles.componentItem}>
                    <Text style={styles.componentName}>{component.name}</Text>
                    <Text style={styles.componentImpact}>
                      {component.impact.toFixed(1)} points
                    </Text>
                  </View>
                ),
              )}
            </View>
          )}

          {insights.affectsScore.accountTrust && (
            <View style={styles.breakdownSection}>
              <View style={styles.breakdownHeader}>
                <MaterialIcons
                  name="verified-user"
                  size={20}
                  color={theme.colors.gray600}
                />
                <Text style={styles.breakdownSectionTitle}>
                  Account Trust ({insights.affectsScore.accountTrust.weight}%)
                </Text>
              </View>
              {insights.affectsScore.accountTrust.components.map(
                (
                  component: { name: string; impact: number },
                  index: number,
                ) => (
                  <View key={index} style={styles.componentItem}>
                    <Text style={styles.componentName}>{component.name}</Text>
                    <Text style={styles.componentImpact}>
                      {component.impact.toFixed(1)} points
                    </Text>
                  </View>
                ),
              )}
            </View>
          )}
        </View>

        {/* Improvement Suggestions */}
        {insights.suggestions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to Improve</Text>
            {insights.suggestions.map((suggestion: string, index: number) => (
              <View key={index} style={styles.suggestionCard}>
                <MaterialIcons
                  name="lightbulb"
                  size={20}
                  color={theme.colors.warning}
                />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Common Questions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Common Questions</Text>
          {[
            {
              question: "Why is reliability weighted the most?",
              answer:
                "People choose roommates or teammates based on who is consistent with bills and responsibilities.",
            },
            {
              question: "Do all posts and listings count?",
              answer:
                "Community activity helps, but reliability carries the most weight. Quality matters more than volume.",
            },
            {
              question: "How does messaging affect my score?",
              answer:
                "Only timely responses to others matter. Sending lots of messages alone does not increase your score.",
            },
          ].map((item) => (
            <View key={item.question} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
      padding: theme.spacing.base,
      backgroundColor: theme.colors.errorBackground,
      borderRadius: theme.spacing.sm,
      margin: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    scoreCard: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.base,
      marginTop: theme.spacing.base,
      borderRadius: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      ...theme.shadows.sm,
    },
    scoreHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.base,
    },
    scoreLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    scoreValue: {
      fontSize: theme.typography.fontSize["4xl"],
      fontWeight: theme.typography.fontWeight.bold,
    },
    trendPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 999,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    trendText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    chartCard: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
      marginHorizontal: theme.spacing.base,
      marginTop: theme.spacing.base,
      borderRadius: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
      ...theme.shadows.sm,
    },
    chart: {
      marginVertical: theme.spacing.sm,
      borderRadius: theme.spacing.base,
    },
    card: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
      marginHorizontal: theme.spacing.base,
      marginTop: theme.spacing.base,
      borderRadius: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    breakdownSection: {
      marginBottom: theme.spacing.xl,
    },
    breakdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    breakdownSectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    componentItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    componentName: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      flex: 1,
    },
    componentImpact: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    helpText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    suggestionCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    suggestionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      flex: 1,
      lineHeight: 20,
    },
    faqItem: {
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    faqQuestion: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    faqAnswer: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
  });
}
