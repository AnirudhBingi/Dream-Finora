import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getLoans, Loan } from '../api/financeApi';
import { getProfile } from '../api/profileApi';
import { SkeletonLoanList } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';
import { Header } from '../components/Header';

interface LoansListScreenProps {
  context: 'local' | 'home';
  onCreateLoan: () => void;
  onViewLoan: (loanId: string) => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

type LoanStatusFilter = 'all' | 'active' | 'completed' | 'paused';

export function LoansListScreen({
  context,
  onCreateLoan,
  onViewLoan,
  onBack,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: LoansListScreenProps) {
  const { token } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LoanStatusFilter>('active');
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('USD');
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>('USD');

  useEffect(() => {
    loadCurrencies();
  }, [token]);

  useEffect(() => {
    loadLoans();
  }, [token, context, statusFilter]);

  async function loadCurrencies() {
    if (!token) return;

    try {
      const profile = await getProfile(token);
      if (profile) {
        setPrimaryCurrency(profile.primaryCurrency || 'USD');
        setHomeCountryCurrency(profile.homeCountryCurrency || 'USD');
      } else {
        setPrimaryCurrency('USD');
        setHomeCountryCurrency('USD');
      }
    } catch {
      setPrimaryCurrency('USD');
      setHomeCountryCurrency('USD');
    }
  }

  async function loadLoans() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const data = await getLoans(token, context, status);
      setLoans(data);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLoans();
  }, []);

  function formatCurrency(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      const displayCurrency = context === 'local' ? primaryCurrency : homeCountryCurrency;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: displayCurrency,
      }).format(0);
    }
    const displayCurrency = context === 'local' ? primaryCurrency : homeCountryCurrency;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(amount);
  }

  function formatDate(dateString: string | undefined | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }

  function getStatusLabel(status: Loan['status']): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'paused':
        return 'Paused';
      default:
        return status;
    }
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title={context === 'local' ? 'Local Loans' : 'Home Country Loans'}
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading loans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title={context === 'local' ? 'Local Loans' : 'Home Country Loans'}
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadLoans}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.contextBadge}>
            <MaterialIcons
              name={context === 'local' ? 'location-on' : 'home'}
              size={16}
              color="#2563EB"
            />
            <Text style={styles.contextBadgeText}>
              {context === 'local' ? 'Local Finance' : 'Home Country Finance'}
            </Text>
          </View>

          {/* Status Filter */}
          <View style={styles.filterContainer}>
            {(['all', 'active', 'completed', 'paused'] as LoanStatusFilter[]).map(
              (filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    statusFilter === filter && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(filter)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === filter && styles.filterChipTextActive,
                    ]}
                  >
                    {filter === 'all'
                      ? 'All'
                      : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>

          {/* Add Loan Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={onCreateLoan}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add Loan</Text>
          </TouchableOpacity>

          {/* Loans List */}
          {loans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="account-balance" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No loans yet</Text>
              <Text style={styles.emptySubtext}>
                Track your home, car, student, or personal loans in one place.
              </Text>
            </View>
          ) : (
            loans.map((loan) => (
              <TouchableOpacity
                key={loan.id}
                style={styles.loanCard}
                onPress={() => onViewLoan(loan.id)}
                activeOpacity={0.7}
              >
                <View style={styles.loanHeader}>
                  <View style={styles.loanTitleContainer}>
                    <Text style={styles.loanName} numberOfLines={1}>
                      {loan.name}
                    </Text>
                    <Text style={styles.loanLender} numberOfLines={1}>
                      {loan.lender}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      loan.status === 'active'
                        ? styles.statusBadgeActive
                        : loan.status === 'completed'
                        ? styles.statusBadgeCompleted
                        : styles.statusBadgePaused,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {getStatusLabel(loan.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.loanAmountsRow}>
                  <View style={styles.amountColumn}>
                    <Text style={styles.amountLabel}>Remaining</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(loan.remainingAmount)}
                    </Text>
                  </View>
                  <View style={styles.amountColumn}>
                    <Text style={styles.amountLabel}>EMI</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(loan.emi)}
                    </Text>
                  </View>
                </View>

                <View style={styles.loanMetaRow}>
                  <View style={styles.metaItem}>
                    <MaterialIcons name="date-range" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      Next: {formatDate(loan.nextPaymentDate) || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MaterialIcons name="schedule" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {loan.remainingMonths} months left
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
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
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FCA5A5',
  },
  retryButtonText: {
    color: '#7F1D1D',
    fontWeight: '500',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    marginBottom: 16,
    gap: 6,
  },
  contextBadgeText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  loanCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loanTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  loanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  loanLender: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeCompleted: {
    backgroundColor: '#E0F2FE',
  },
  statusBadgePaused: {
    backgroundColor: '#FEF9C3',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  loanAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  amountColumn: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  amountValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  loanMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
});


