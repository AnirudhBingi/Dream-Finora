import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getLoanById, Loan, deleteLoan, updateLoan } from '../api/financeApi';
import { getProfile } from '../api/profileApi';
import { SkeletonDetailScreen } from '../components/SkeletonLoader';
import { ErrorState, getUserFriendlyErrorMessage } from '../components/ErrorState';

interface LoanDetailScreenProps {
  loanId: string;
  onBack: () => void;
  onRecordPayment: () => void;
  onLoanUpdated: () => void;
}

export function LoanDetailScreen({
  loanId,
  onBack,
  onRecordPayment,
  onLoanUpdated,
}: LoanDetailScreenProps) {
  const { token } = useAuth();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('USD');
  const [homeCountryCurrency, setHomeCountryCurrency] = useState<string>('USD');

  useEffect(() => {
    loadCurrencies();
  }, [token]);

  useEffect(() => {
    loadLoan();
  }, [token, loanId]);

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

  async function loadLoan() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getLoanById(token, loanId);
      setLoan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number | undefined | null): string {
    if (!loan || amount === undefined || amount === null || isNaN(amount)) {
      return '$0.00';
    }
    const displayCurrency =
      loan.context === 'local' ? primaryCurrency : homeCountryCurrency;
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

  async function handleMarkCompleted() {
    if (!token || !loan) return;

    Alert.alert('Mark as completed', 'Are you sure this loan is fully paid off?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, mark completed',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            const updated = await updateLoan(token, loan.id, { status: 'completed' });
            setLoan(updated);
            onLoanUpdated();
          } catch (err) {
            Alert.alert(
              'Error',
              err instanceof Error ? err.message : 'Failed to update loan status',
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!token || !loan) return;

    Alert.alert(
      'Delete loan',
      'Are you sure you want to delete this loan? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await deleteLoan(token, loan.id);
              onLoanUpdated();
              onBack();
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete loan',
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loan Details</Text>
          <View style={styles.placeholder} />
        </View>
        <SkeletonDetailScreen />
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loan Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState message={error || 'Loan not found'} onRetry={loadLoan} />
      </SafeAreaView>
    );
  }

  const totalPaid = loan.principalAmount - loan.remainingAmount;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Loan Detail</Text>
            <View style={styles.placeholder} />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Loan Header */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.loanName}>{loan.name}</Text>
                <Text style={styles.loanLender}>{loan.lender}</Text>
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
                <Text style={styles.statusBadgeText}>{getStatusLabel(loan.status)}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Remaining</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(loan.remainingAmount)}
                </Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Principal</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(loan.principalAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Paid so far</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalPaid)}</Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Interest Rate</Text>
                <Text style={styles.summaryValue}>{loan.interestRate}% p.a.</Text>
              </View>
            </View>
          </View>

          {/* EMI Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EMI Overview</Text>
            <View style={styles.emiRow}>
              <View style={styles.emiItem}>
                <Text style={styles.emiLabel}>EMI Amount</Text>
                <Text style={styles.emiValue}>{formatCurrency(loan.emi)}</Text>
              </View>
              <View style={styles.emiItem}>
                <Text style={styles.emiLabel}>Remaining Months</Text>
                <Text style={styles.emiValue}>{loan.remainingMonths}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialIcons name="event" size={16} color="#6B7280" />
                <Text style={styles.metaText}>
                  Started {formatDate(loan.startDate) || 'N/A'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="date-range" size={16} color="#6B7280" />
                <Text style={styles.metaText}>
                  Next Payment {formatDate(loan.nextPaymentDate) || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Payments History */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Recent Payments</Text>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={onRecordPayment}
                disabled={saving}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={styles.smallButtonText}>Record Payment</Text>
              </TouchableOpacity>
            </View>

            {loan.payments && loan.payments.length > 0 ? (
              loan.payments.map((payment) => (
                <View key={payment.id} style={styles.paymentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                    <Text style={styles.paymentMeta}>
                      {formatDate(payment.paymentDate)} • Principal{' '}
                      {formatCurrency(payment.principalPaid)} • Interest{' '}
                      {formatCurrency(payment.interestPaid)}
                    </Text>
                    {payment.notes && (
                      <Text style={styles.paymentNotes} numberOfLines={1}>
                        {payment.notes}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyTextSmall}>
                No payments recorded yet. Record your first EMI to start tracking.
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {loan.status === 'active' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleMarkCompleted}
                disabled={saving}
                activeOpacity={0.7}
              >
                <MaterialIcons name="check-circle" size={20} color="#047857" />
                <Text style={styles.completeButtonText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={saving}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete" size={20} color="#B91C1C" />
              <Text style={styles.deleteButtonText}>Delete Loan</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
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
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loanName: {
    fontSize: 18,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryColumn: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  emiItem: {
    flex: 1,
  },
  emiLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  emiValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  metaRow: {
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    gap: 4,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  paymentRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  paymentMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  paymentNotes: {
    marginTop: 2,
    fontSize: 12,
    color: '#4B5563',
  },
  emptyTextSmall: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  completeButton: {
    borderColor: '#34D399',
    backgroundColor: '#ECFDF5',
  },
  completeButtonText: {
    color: '#047857',
    fontWeight: '600',
  },
  deleteButton: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
});


