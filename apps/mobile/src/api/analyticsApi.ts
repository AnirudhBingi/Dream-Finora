import { api } from "./client";

export interface SpendingByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string; // Format: "YYYY-MM"
  income: number;
  expense: number;
  net: number; // income - expense
}

export interface BalanceOverTime {
  date: string; // Format: "YYYY-MM-DD"
  balance: number;
}

export async function getSpendingByCategory(
  token: string,
  startDate?: string,
  endDate?: string,
): Promise<SpendingByCategory[]> {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const endpoint = params.toString()
    ? `/analytics/spending-by-category?${params.toString()}`
    : "/analytics/spending-by-category";
  return api.get<SpendingByCategory[]>(endpoint, { token });
}

export async function getMonthlyTrends(
  token: string,
  months?: number,
): Promise<MonthlyTrend[]> {
  const endpoint = months
    ? `/analytics/monthly-trends?months=${months}`
    : "/analytics/monthly-trends";
  return api.get<MonthlyTrend[]>(endpoint, { token });
}

export async function getBalanceOverTime(
  token: string,
  days?: number,
): Promise<BalanceOverTime[]> {
  const endpoint = days
    ? `/analytics/balance-over-time?days=${days}`
    : "/analytics/balance-over-time";
  return api.get<BalanceOverTime[]>(endpoint, { token });
}

// Expense Analytics (Billchop Analytics)
export interface ExpenseSpendingByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface ExpenseMonthlyTrend {
  month: string; // Format: "YYYY-MM"
  amount: number; // Total split expenses for this user in this month
}

export interface TopSpender {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  totalSpent: number;
}

export async function getExpenseSpendingByCategory(
  token: string,
  startDate?: string,
  endDate?: string,
): Promise<ExpenseSpendingByCategory[]> {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const endpoint = params.toString()
    ? `/analytics/expense-spending-by-category?${params.toString()}`
    : "/analytics/expense-spending-by-category";
  return api.get<ExpenseSpendingByCategory[]>(endpoint, { token });
}

export async function getExpenseMonthlyTrends(
  token: string,
  months?: number,
): Promise<ExpenseMonthlyTrend[]> {
  const endpoint = months
    ? `/analytics/expense-monthly-trends?months=${months}`
    : "/analytics/expense-monthly-trends";
  return api.get<ExpenseMonthlyTrend[]>(endpoint, { token });
}

export async function getTopSpendersInGroup(
  token: string,
  groupId: string,
  limit?: number,
): Promise<TopSpender[]> {
  const endpoint = limit
    ? `/analytics/top-spenders/${groupId}?limit=${limit}`
    : `/analytics/top-spenders/${groupId}`;
  return api.get<TopSpender[]>(endpoint, { token });
}

// Ride Analytics
export interface RideAnalyticsSummary {
  totalRides: number;
  ridesAsDriver: number;
  ridesAsPassenger: number;
  totalSpent: number;
}

export interface RideMonthlyTrend {
  month: string; // Format: "YYYY-MM"
  amount: number;
  rides: number;
}

export interface RideSpendingByType {
  type: "giveRide" | "rideshare";
  amount: number;
  count: number;
}

export interface TopRoute {
  route: string;
  origin: string;
  destination: string;
  count: number;
}

export interface TopCompanion {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rides: number;
  totalSpent: number;
}

export interface RideSpendingByGroup {
  groupId: string;
  groupName: string;
  amount: number;
  rides: number;
}

export interface RideAnalytics {
  summary: RideAnalyticsSummary;
  monthlyTrends: RideMonthlyTrend[];
  spendingByType: RideSpendingByType[];
  topRoutes: TopRoute[];
  topCompanions: TopCompanion[];
  spendingByGroup: RideSpendingByGroup[];
}

export async function getRideAnalytics(
  token: string,
  months?: number,
  startDate?: string,
  endDate?: string,
): Promise<RideAnalytics> {
  const params = new URLSearchParams();
  if (months) params.append("months", months.toString());
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const endpoint = params.toString()
    ? `/analytics/rides?${params.toString()}`
    : "/analytics/rides";
  return api.get<RideAnalytics>(endpoint, { token });
}

// Enhanced Analytics (Context-based)
export interface IncomeVsExpenses {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  savingsRate: number;
  periodCount: number;
}

export interface BudgetPerformance {
  totalBudgets: number;
  budgetsOnTrack: number;
  budgetsWarning: number;
  budgetsExceeded: number;
  totalBudgeted: number;
  totalSpent: number;
  adherenceRate: number;
  averageAdherence: number;
}

export interface GoalsProgress {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  averageProgress: number;
}

export interface LoanSummary {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  totalPrincipal: number;
  totalRemaining: number;
  totalPaid: number;
  totalInterestPaid: number;
  progressPercentage: number;
}

export interface ContextAnalytics {
  context: "local" | "home";
  spendingByCategory: SpendingByCategory[];
  monthlyTrends: MonthlyTrend[];
  balanceOverTime: BalanceOverTime[];
  incomeVsExpenses: IncomeVsExpenses;
  budgetPerformance: BudgetPerformance;
  goalsProgress: GoalsProgress;
  loanSummary: LoanSummary;
}

export interface CombinedAnalytics {
  context: "combined";
  local: ContextAnalytics;
  home: ContextAnalytics;
  combined: ContextAnalytics;
}

export async function getLocalAnalytics(
  token: string,
  months?: number,
  days?: number,
): Promise<ContextAnalytics> {
  const params = new URLSearchParams();
  if (months) params.append("months", months.toString());
  if (days) params.append("days", days.toString());
  const endpoint = params.toString()
    ? `/finance/analytics/local?${params.toString()}`
    : "/finance/analytics/local";
  return api.get<ContextAnalytics>(endpoint, { token });
}

export async function getHomeAnalytics(
  token: string,
  months?: number,
  days?: number,
): Promise<ContextAnalytics> {
  const params = new URLSearchParams();
  if (months) params.append("months", months.toString());
  if (days) params.append("days", days.toString());
  const endpoint = params.toString()
    ? `/finance/analytics/home?${params.toString()}`
    : "/finance/analytics/home";
  return api.get<ContextAnalytics>(endpoint, { token });
}

export async function getCombinedAnalytics(
  token: string,
  months?: number,
  days?: number,
  primaryCurrency?: string,
): Promise<CombinedAnalytics> {
  const params = new URLSearchParams();
  if (months) params.append("months", months.toString());
  if (days) params.append("days", days.toString());
  if (primaryCurrency) params.append("primaryCurrency", primaryCurrency);
  const endpoint = params.toString()
    ? `/finance/analytics/combined?${params.toString()}`
    : "/finance/analytics/combined";
  return api.get<CombinedAnalytics>(endpoint, { token });
}
