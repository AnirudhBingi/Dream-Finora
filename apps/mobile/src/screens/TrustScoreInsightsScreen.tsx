import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getTrustScoreInsights, TrustScoreInsights } from '../api/trustScoreApi';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Header } from '../components/Header';

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
  const [insights, setInsights] = useState<TrustScoreInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [token]);

  async function loadInsights() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getTrustScoreInsights(token);
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trust score insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getTrustScoreColor(score: number): string {
    if (score >= 90) return '#10B981';
    if (score >= 70) return '#3B82F6';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Trust Score Insights"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !insights) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Trust Score Insights"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Failed to load insights'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInsights}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const chartData = {
    labels: insights.history.slice(-7).map((h) => formatDate(h.timestamp)),
    datasets: [
      {
        data: insights.history.slice(-7).map((h) => h.score),
        color: (opacity = 1) => getTrustScoreColor(insights.currentScore),
        strokeWidth: 2,
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Trust Score Insights"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadInsights} />
        }
      >
        {/* Current Score & Trend */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Current Score</Text>
          <Text style={[styles.scoreValue, { color: getTrustScoreColor(insights.currentScore) }]}>
            {insights.currentScore}
          </Text>
          <View style={styles.trendContainer}>
            <MaterialIcons
              name={insights.trend.direction === 'up' ? 'trending-up' : insights.trend.direction === 'down' ? 'trending-down' : 'trending-flat'}
              size={20}
              color={insights.trend.direction === 'up' ? '#10B981' : insights.trend.direction === 'down' ? '#EF4444' : '#6B7280'}
            />
            <Text
              style={[
                styles.trendText,
                {
                  color:
                    insights.trend.direction === 'up'
                      ? '#10B981'
                      : insights.trend.direction === 'down'
                        ? '#EF4444'
                        : '#6B7280',
                },
              ]}
            >
              {insights.trend.direction === 'up' ? '+' : insights.trend.direction === 'down' ? '-' : ''}
              {Math.abs(insights.trend.change).toFixed(1)} from last week
            </Text>
          </View>
        </View>

        {/* Trend Chart */}
        {insights.history.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Score Trend (Last 7 Days)</Text>
            <LineChart
              data={chartData}
              width={Dimensions.get('window').width - 48}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
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

        {/* What Affects Your Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Affects Your Score</Text>

          {/* Expense Score */}
          <View style={styles.breakdownSection}>
            <View style={styles.breakdownHeader}>
              <MaterialIcons name="receipt" size={20} color="#2563EB" />
              <Text style={styles.breakdownSectionTitle}>
                Billchop Score ({insights.affectsScore.expense.weight}%)
              </Text>
            </View>
            {insights.affectsScore.expense.components.map((component, index) => (
              <View key={index} style={styles.componentItem}>
                <Text style={styles.componentName}>{component.name}</Text>
                <Text style={styles.componentImpact}>
                  {component.impact.toFixed(1)} points
                </Text>
              </View>
            ))}
          </View>

          {/* Chore Score */}
          <View style={styles.breakdownSection}>
            <View style={styles.breakdownHeader}>
              <MaterialIcons name="task" size={20} color="#10B981" />
              <Text style={styles.breakdownSectionTitle}>
                Chore Board Score ({insights.affectsScore.chore.weight}%)
              </Text>
            </View>
            {insights.affectsScore.chore.components.map((component, index) => (
              <View key={index} style={styles.componentItem}>
                <Text style={styles.componentName}>{component.name}</Text>
                <Text style={styles.componentImpact}>
                  {component.impact.toFixed(1)} points
                </Text>
              </View>
            ))}
          </View>

          {/* Community Score */}
          <View style={styles.breakdownSection}>
            <View style={styles.breakdownHeader}>
              <MaterialIcons name="group" size={20} color="#F59E0B" />
              <Text style={styles.breakdownSectionTitle}>
                Community Score ({insights.affectsScore.community.weight}%)
              </Text>
            </View>
            {insights.affectsScore.community.components.map((component, index) => (
              <View key={index} style={styles.componentItem}>
                <Text style={styles.componentName}>{component.name}</Text>
                <Text style={styles.componentImpact}>
                  {component.impact.toFixed(1)} points
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Improvement Suggestions */}
        {insights.suggestions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to Improve</Text>
            {insights.suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionCard}>
                <MaterialIcons name="lightbulb" size={20} color="#F59E0B" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  scoreCard: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '700',
    marginBottom: 12,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  breakdownSection: {
    marginBottom: 24,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  breakdownSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  componentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  componentName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  componentImpact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
});

