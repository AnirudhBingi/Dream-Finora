import React, { useEffect, useState, useMemo } from "react";
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
import { useAuth } from "../auth/authContext";
import {
  getRecommendations,
  getHealthScore,
  FinancialRecommendation,
  FinancialHealthScore,
} from "../api/financeApi";
import { getProfile, Profile } from "../api/profileApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { ErrorState } from "../components/ErrorState";
import { useDataFetch } from "../hooks/useDataFetch";
import { useTheme, getBackgroundVariant } from "../theme";

interface FinancialAdvisorScreenProps {
  context: "local" | "home";
  onBack: () => void;
  onViewBudgets?: (context: "local" | "home") => void;
  onViewGoals?: (context: "local" | "home") => void;
  onViewLoans?: (context: "local" | "home") => void;
  onAddTransaction?: (
    context: "local" | "home",
    type: "income" | "expense",
  ) => void;
  onCreateGoal?: (
    context: "local" | "home",
    prefill?: {
      name: string;
      targetAmount: number;
      category: "savings" | "debt" | "purchase" | "investment";
    },
  ) => void;
  onAddContribution?: (goalId?: string, suggestedAmount?: number) => void;
  onRecordLoanPayment?: (loanId?: string, suggestedAmount?: number) => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function FinancialAdvisorScreen({
  context,
  onBack,
  onViewBudgets,
  onViewGoals,
  onViewLoans,
  onAddTransaction,
  onCreateGoal,
  onAddContribution,
  onRecordLoanPayment,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: FinancialAdvisorScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  interface AdvisorData {
    recommendations: FinancialRecommendation[];
    healthScore: FinancialHealthScore;
  }

  const { data, loading, refreshing, error, refresh, refetch } =
    useDataFetch<AdvisorData>({
      fetchFn: async () => {
        if (!token) throw new Error("No authentication token");
        const [recommendationsData, healthScoreData] = await Promise.all([
          getRecommendations(token, context),
          getHealthScore(token, context),
        ]);
        return {
          recommendations: recommendationsData,
          healthScore: healthScoreData,
        };
      },
      immediate: true,
      deps: [token, context],
    });

  useEffect(() => {
    async function loadProfile() {
      if (!token) return;
      try {
        const profileData = await getProfile(token);
        setProfile(profileData || null);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setProfile(null);
      }
    }
    loadProfile();
  }, [token]);

  const recommendations = data?.recommendations ?? [];
  const healthScore = data?.healthScore ?? null;

  function getCurrencyForContext(): string {
    if (!profile) return "USD";
    return context === "local"
      ? profile.primaryCurrency || "USD"
      : profile.homeCountryCurrency || "USD";
  }

  function getPriorityColor(priority: "high" | "medium" | "low"): string {
    switch (priority) {
      case "high":
        return theme.colors.error;
      case "medium":
        return theme.colors.warning;
      case "low":
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  }

  function getTypeIcon(type: string): string {
    switch (type) {
      case "budget":
        return "account-balance-wallet";
      case "goal":
        return "flag";
      case "spending":
        return "shopping-cart";
      case "savings":
        return "savings";
      case "debt":
        return "account-balance";
      case "emergency":
        return "emergency";
      default:
        return "info";
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  }

  function getScoreLabel(score: number): string {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  }

  function formatCurrency(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: getCurrencyForContext(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getTrendColor(
    trend: "increasing" | "decreasing" | "stable",
  ): string {
    switch (trend) {
      case "increasing":
        return theme.colors.error;
      case "decreasing":
        return theme.colors.success;
      case "stable":
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  }

  function getTrendIcon(trend: "increasing" | "decreasing" | "stable"): string {
    switch (trend) {
      case "increasing":
        return "trending-up";
      case "decreasing":
        return "trending-down";
      case "stable":
        return "trending-flat";
      default:
        return "trending-flat";
    }
  }

  function handleRecommendationPress(rec: FinancialRecommendation) {
    // Extract suggested amount from metrics if available
    const suggestedAmount = rec.metrics?.target
      ? (rec.metrics.target as number)
      : rec.metrics?.difference
        ? Math.abs(rec.metrics.difference as number)
        : undefined;

    switch (rec.type) {
      case "budget":
        if (onViewBudgets) {
          onViewBudgets(context);
        }
        break;
      case "goal":
        // If it's about increasing contributions, navigate to goals list
        // User can select the goal and add contribution
        if (onViewGoals) {
          onViewGoals(context);
        }
        break;
      case "savings":
        // Savings recommendations should create a savings goal
        if (onCreateGoal && suggestedAmount) {
          onCreateGoal(context, {
            name: "Savings Goal",
            targetAmount: suggestedAmount,
            category: "savings",
          });
        } else if (onViewGoals) {
          // Fallback to goals list if no amount
          onViewGoals(context);
        }
        break;
      case "emergency":
        // Emergency fund recommendations should create an emergency fund goal
        if (onCreateGoal && rec.metrics?.target) {
          onCreateGoal(context, {
            name: "Emergency Fund",
            targetAmount: rec.metrics.target as number,
            category: "savings",
          });
        } else if (onViewGoals) {
          // Fallback to goals list
          onViewGoals(context);
        }
        break;
      case "debt":
        // Debt recommendations navigate to loans list
        // User can select a loan and record extra payment
        if (onViewLoans) {
          onViewLoans(context);
        }
        break;
      case "spending":
        // Spending recommendations - could navigate to analytics or expense list
        // For now, navigate to add expense to track spending
        if (onAddTransaction) {
          onAddTransaction(context, "expense");
        }
        break;
      default:
        break;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="AI Financial Advisor"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.blue} />
          <Text style={styles.loadingText}>Loading financial insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="AI Financial Advisor"
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
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Health Score Card */}
          {healthScore && (
            <View style={styles.healthScoreCard}>
              <Text style={styles.healthScoreTitle}>
                Financial Health Score
              </Text>
              <View style={styles.scoreContainer}>
                <View
                  style={[
                    styles.scoreCircle,
                    { borderColor: getScoreColor(healthScore.overall) },
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreValue,
                      { color: getScoreColor(healthScore.overall) },
                    ]}
                  >
                    {healthScore.overall}
                  </Text>
                  <Text style={styles.scoreLabel}>
                    {getScoreLabel(healthScore.overall)}
                  </Text>
                </View>
              </View>

              {/* Score Breakdown */}
              <View style={styles.breakdownContainer}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Budget Adherence</Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${healthScore.breakdown.budgetAdherence}%`,
                          backgroundColor: getScoreColor(
                            healthScore.breakdown.budgetAdherence,
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownValue}>
                    {healthScore.breakdown.budgetAdherence}%
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Goal Progress</Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${healthScore.breakdown.goalProgress}%`,
                          backgroundColor: getScoreColor(
                            healthScore.breakdown.goalProgress,
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownValue}>
                    {healthScore.breakdown.goalProgress}%
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Savings Rate</Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${healthScore.breakdown.savingsRate}%`,
                          backgroundColor: getScoreColor(
                            healthScore.breakdown.savingsRate,
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownValue}>
                    {healthScore.breakdown.savingsRate}%
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Debt Management</Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${healthScore.breakdown.debtToIncome}%`,
                          backgroundColor: getScoreColor(
                            healthScore.breakdown.debtToIncome,
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownValue}>
                    {healthScore.breakdown.debtToIncome}%
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Emergency Fund</Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${healthScore.breakdown.emergencyFund}%`,
                          backgroundColor: getScoreColor(
                            healthScore.breakdown.emergencyFund,
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownValue}>
                    {healthScore.breakdown.emergencyFund}%
                  </Text>
                </View>
              </View>

              {/* Trends */}
              {healthScore.trends &&
                Object.keys(healthScore.trends).length > 0 && (
                  <View style={styles.trendsContainer}>
                    <Text style={styles.trendsTitle}>Trends</Text>
                    {healthScore.trends.spendingTrend && (
                      <View style={styles.trendItem}>
                        <Text style={styles.trendLabel}>Spending:</Text>
                        <View
                          style={[
                            styles.trendBadge,
                            {
                              backgroundColor: getBackgroundVariant(
                                getTrendColor(healthScore.trends.spendingTrend),
                              ),
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={
                              getTrendIcon(
                                healthScore.trends.spendingTrend,
                              ) as any
                            }
                            size={14}
                            color={getTrendColor(
                              healthScore.trends.spendingTrend,
                            )}
                          />
                          <Text
                            style={[
                              styles.trendText,
                              {
                                color: getTrendColor(
                                  healthScore.trends.spendingTrend,
                                ),
                              },
                            ]}
                          >
                            {healthScore.trends.spendingTrend.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    )}
                    {healthScore.trends.incomeTrend && (
                      <View style={styles.trendItem}>
                        <Text style={styles.trendLabel}>Income:</Text>
                        <View
                          style={[
                            styles.trendBadge,
                            {
                              backgroundColor: getBackgroundVariant(
                                getTrendColor(healthScore.trends.incomeTrend),
                              ),
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={
                              getTrendIcon(
                                healthScore.trends.incomeTrend,
                              ) as any
                            }
                            size={14}
                            color={getTrendColor(
                              healthScore.trends.incomeTrend,
                            )}
                          />
                          <Text
                            style={[
                              styles.trendText,
                              {
                                color: getTrendColor(
                                  healthScore.trends.incomeTrend,
                                ),
                              },
                            ]}
                          >
                            {healthScore.trends.incomeTrend.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    )}
                    {healthScore.trends.savingsTrend && (
                      <View style={styles.trendItem}>
                        <Text style={styles.trendLabel}>Savings:</Text>
                        <View
                          style={[
                            styles.trendBadge,
                            {
                              backgroundColor: getBackgroundVariant(
                                getTrendColor(healthScore.trends.savingsTrend),
                              ),
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={
                              getTrendIcon(
                                healthScore.trends.savingsTrend,
                              ) as any
                            }
                            size={14}
                            color={getTrendColor(
                              healthScore.trends.savingsTrend,
                            )}
                          />
                          <Text
                            style={[
                              styles.trendText,
                              {
                                color: getTrendColor(
                                  healthScore.trends.savingsTrend,
                                ),
                              },
                            ]}
                          >
                            {healthScore.trends.savingsTrend.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

              {/* Projections */}
              {healthScore.projections &&
                Object.keys(healthScore.projections).length > 0 && (
                  <View style={styles.projectionsContainer}>
                    <Text style={styles.projectionsTitle}>Projections</Text>
                    {healthScore.projections.budgetBurnRate && (
                      <View style={styles.projectionItem}>
                        <MaterialIcons
                          name="schedule"
                          size={16}
                          color={theme.colors.warning}
                        />
                        <Text style={styles.projectionText}>
                          Budget may be exceeded in approximately{" "}
                          {healthScore.projections.budgetBurnRate} days at
                          current spending rate
                        </Text>
                      </View>
                    )}
                    {healthScore.projections.goalCompletionDate && (
                      <View style={styles.projectionItem}>
                        <MaterialIcons
                          name="event"
                          size={16}
                          color={theme.colors.success}
                        />
                        <Text style={styles.projectionText}>
                          Goal projected completion:{" "}
                          {new Date(
                            healthScore.projections.goalCompletionDate,
                          ).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    {healthScore.projections.emergencyFundTargetDate && (
                      <View style={styles.projectionItem}>
                        <MaterialIcons
                          name="savings"
                          size={16}
                          color={theme.colors.blue}
                        />
                        <Text style={styles.projectionText}>
                          Emergency fund target date:{" "}
                          {new Date(
                            healthScore.projections.emergencyFundTargetDate,
                          ).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

              {/* Insights */}
              {healthScore.insights.length > 0 && (
                <View style={styles.insightsContainer}>
                  <Text style={styles.insightsTitle}>Key Insights</Text>
                  {healthScore.insights.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <MaterialIcons
                        name="lightbulb"
                        size={16}
                        color={theme.colors.warning}
                      />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Recommendations */}
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>
              Personalized Recommendations
            </Text>
            {recommendations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons
                  name="check-circle"
                  size={48}
                  color={theme.colors.success}
                />
                <Text style={styles.emptyText}>Great job!</Text>
                <Text style={styles.emptySubtext}>
                  You're on track. Keep up the good financial habits!
                </Text>
              </View>
            ) : (
              recommendations.map((rec) => (
                <TouchableOpacity
                  key={rec.id}
                  style={styles.recommendationCard}
                  onPress={() => handleRecommendationPress(rec)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recommendationHeader}>
                    <View style={styles.recommendationIconContainer}>
                      <MaterialIcons
                        name={getTypeIcon(rec.type) as any}
                        size={24}
                        color={getPriorityColor(rec.priority)}
                      />
                    </View>
                    <View style={styles.recommendationContent}>
                      <View style={styles.recommendationTitleRow}>
                        <Text style={styles.recommendationTitle}>
                          {rec.title}
                        </Text>
                        <View
                          style={[
                            styles.priorityBadge,
                            {
                              backgroundColor: getBackgroundVariant(
                                getPriorityColor(rec.priority),
                              ),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityBadgeText,
                              { color: getPriorityColor(rec.priority) },
                            ]}
                          >
                            {rec.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recommendationDescription}>
                        {rec.description}
                      </Text>

                      {/* Metrics Display */}
                      {rec.metrics && (
                        <View style={styles.metricsContainer}>
                          {rec.metrics.current !== undefined &&
                            rec.metrics.target !== undefined && (
                              <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Current:</Text>
                                <Text style={styles.metricValue}>
                                  {formatCurrency(rec.metrics.current)}
                                </Text>
                                <Text style={styles.metricLabel}>Target:</Text>
                                <Text style={styles.metricValue}>
                                  {formatCurrency(rec.metrics.target)}
                                </Text>
                              </View>
                            )}
                          {rec.metrics.difference !== undefined && (
                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>
                                Difference:
                              </Text>
                              <Text
                                style={[
                                  styles.metricValue,
                                  {
                                    color:
                                      rec.metrics.difference < 0
                                        ? theme.colors.error
                                        : theme.colors.success,
                                  },
                                ]}
                              >
                                {rec.metrics.difference < 0 ? "-" : "+"}
                                {formatCurrency(
                                  Math.abs(rec.metrics.difference),
                                )}
                              </Text>
                            </View>
                          )}
                          {rec.metrics.percentage !== undefined && (
                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>Progress:</Text>
                              <Text style={styles.metricValue}>
                                {rec.metrics.percentage.toFixed(1)}%
                              </Text>
                            </View>
                          )}
                          {rec.metrics.daysRemaining !== undefined && (
                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>
                                Days Remaining:
                              </Text>
                              <Text style={styles.metricValue}>
                                {rec.metrics.daysRemaining} days
                              </Text>
                            </View>
                          )}
                          {rec.metrics.projectedDate && (
                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>
                                Projected Date:
                              </Text>
                              <Text style={styles.metricValue}>
                                {new Date(
                                  rec.metrics.projectedDate,
                                ).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                          {rec.metrics.trend && (
                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>Trend:</Text>
                              <View
                                style={[
                                  styles.trendBadge,
                                  {
                                    backgroundColor: getBackgroundVariant(
                                      getTrendColor(rec.metrics.trend),
                                    ),
                                  },
                                ]}
                              >
                                <MaterialIcons
                                  name={getTrendIcon(rec.metrics.trend) as any}
                                  size={14}
                                  color={getTrendColor(rec.metrics.trend)}
                                />
                                <Text
                                  style={[
                                    styles.trendText,
                                    { color: getTrendColor(rec.metrics.trend) },
                                  ]}
                                >
                                  {rec.metrics.trend.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Details List */}
                      {rec.details && rec.details.length > 0 && (
                        <View style={styles.detailsContainer}>
                          {rec.details.map((detail, idx) => (
                            <View key={idx} style={styles.detailItem}>
                              <MaterialIcons
                                name="info"
                                size={14}
                                color={theme.colors.textSecondary}
                              />
                              <Text style={styles.detailText}>{detail}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {rec.action && (
                        <View style={styles.actionContainer}>
                          <MaterialIcons
                            name="arrow-forward"
                            size={16}
                            color={theme.colors.blue}
                          />
                          <Text style={styles.actionText}>{rec.action}</Text>
                          <MaterialIcons
                            name="chevron-right"
                            size={20}
                            color={theme.colors.blue}
                            style={{ marginLeft: "auto" }}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
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
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      padding: theme.spacing.base,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    backButton: {
      padding: 8,
    },
    backButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.medium,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flex: 1,
      textAlign: "center",
    },
    headerSpacer: {
      width: 60,
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
      color: theme.colors.gray500,
    },
    errorContainer: {
      backgroundColor: theme.colors.errorBackground,
      padding: theme.spacing.base,
      borderRadius: theme.spacing.md,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.errorBackground,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error,
      marginBottom: 12,
    },
    retryButton: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.error,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    healthScoreCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.md,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    healthScoreTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
      textAlign: "center",
    },
    scoreContainer: {
      alignItems: "center",
      marginBottom: 24,
    },
    scoreCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 4,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    scoreValue: {
      fontSize: 36,
      fontWeight: "700",
    },
    scoreLabel: {
      fontSize: 14,
      color: theme.colors.gray500,
      marginTop: 4,
      fontWeight: theme.typography.fontWeight.medium,
    },
    breakdownContainer: {
      marginTop: theme.spacing.base,
    },
    breakdownItem: {
      marginBottom: theme.spacing.base,
    },
    breakdownLabel: {
      fontSize: 14,
      color: theme.colors.gray700,
      marginBottom: 8,
      fontWeight: theme.typography.fontWeight.medium,
    },
    breakdownBar: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 4,
    },
    breakdownFill: {
      height: "100%",
      borderRadius: 4,
    },
    breakdownValue: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
      textAlign: "right",
    },
    insightsContainer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    insightsTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    insightItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    insightText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.gray700,
      marginLeft: 8,
      lineHeight: 20,
    },
    recommendationsSection: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.base,
    },
    emptyContainer: {
      alignItems: "center",
      padding: 32,
      backgroundColor: theme.colors.successBackground,
      borderRadius: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.successBackground,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.success,
      marginTop: theme.spacing.base,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.gray500,
      marginTop: 8,
      textAlign: "center",
    },
    recommendationCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.base,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    recommendationHeader: {
      flexDirection: "row",
    },
    recommendationIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundSecondary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    recommendationContent: {
      flex: 1,
    },
    recommendationTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    recommendationTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    priorityBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    recommendationDescription: {
      fontSize: 14,
      color: theme.colors.gray500,
      lineHeight: 20,
      marginBottom: 8,
    },
    actionContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionText: {
      fontSize: 14,
      color: theme.colors.blue,
      fontWeight: theme.typography.fontWeight.medium,
      marginLeft: 4,
    },
    metricsContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metricRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    metricLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
      fontWeight: theme.typography.fontWeight.medium,
    },
    metricValue: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textPrimary,
      fontWeight: "600",
    },
    detailsContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    detailText: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.gray500,
      marginLeft: 8,
      lineHeight: 18,
    },
    trendsContainer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    trendsTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    trendItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    trendLabel: {
      fontSize: 14,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    trendBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      gap: 4,
    },
    trendText: {
      fontSize: 11,
      fontWeight: "700",
    },
    projectionsContainer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    projectionsTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    projectionItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    projectionText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.gray700,
      marginLeft: 8,
      lineHeight: 20,
    },
  });
}
