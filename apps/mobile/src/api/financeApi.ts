import { api } from "./client";

export interface FinanceTransaction {
  id: string;
  userId: string;
  accountId?: string | null; // Optional for backward compatibility
  type: "income" | "expense";
  amount: number;
  context: "local" | "home";
  // Income fields
  source?: string | null; // For income: "Salary", "Freelance", "Gift", etc.
  // Expense fields
  category?: string | null; // For expense: auto-populated from description
  description?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  expenseSplit?: {
    expense: {
      id: string;
      description: string;
      category: string | null;
    };
  } | null;
}

export interface CreateTransactionDto {
  type: "income" | "expense";
  amount: number;
  context: "local" | "home";
  // Income fields
  source?: string; // For income: "Salary", "Freelance", "Gift", etc.
  // Expense fields
  category?: string; // For expense: auto-populated from description (optional)
  description?: string;
  date?: string; // Defaults to today if not provided
}

export interface BalanceInfo {
  totalBalance: number;
  totalAvailableBalance: number; // Includes Billchop balance for local context
  balancesByContext: {
    local: number;
    home: number;
  };
  billchopBalance?: number; // Only for local context
  billchopOwedToUser?: number; // Only for local context
  localCurrency?: string;
  homeCurrency?: string;
}

export interface CombinedBalanceInfo {
  combinedTotal: number;
  localBalance: {
    amount: number;
    currency: string;
  };
  homeBalance: {
    amount: number;
    currency: string;
    convertedAmount: number;
    convertedCurrency: string;
  };
  billchopBalance: number;
}

export interface Categories {
  income: string[];
  expense: string[];
}

export async function createTransaction(
  token: string,
  data: CreateTransactionDto,
): Promise<FinanceTransaction> {
  return api.post<FinanceTransaction>("/finance/transactions", data, { token });
}

export async function getTransactions(
  token: string,
  context?: "local" | "home",
  includeBillchop?: boolean,
): Promise<FinanceTransaction[]> {
  const params = new URLSearchParams();
  if (context) params.append("context", context);
  if (includeBillchop) params.append("includeBillchop", "true");
  const endpoint = params.toString()
    ? `/finance/transactions?${params.toString()}`
    : "/finance/transactions";
  return api.get<FinanceTransaction[]>(endpoint, { token });
}

export async function getTransactionById(
  token: string,
  transactionId: string,
): Promise<FinanceTransaction> {
  return api.get<FinanceTransaction>(`/finance/transactions/${transactionId}`, {
    token,
  });
}

export async function getBalance(
  token: string,
  context?: "local" | "home",
  includeBillchop?: boolean,
): Promise<BalanceInfo> {
  const params = new URLSearchParams();
  if (context) params.append("context", context);
  if (includeBillchop !== undefined)
    params.append("includeBillchop", includeBillchop ? "true" : "false");
  const endpoint = params.toString()
    ? `/finance/balance?${params.toString()}`
    : "/finance/balance";
  return api.get<BalanceInfo>(endpoint, { token });
}

export async function getCombinedBalance(
  token: string,
  primaryCurrency?: string,
): Promise<CombinedBalanceInfo> {
  const params = new URLSearchParams();
  params.append("combined", "true");
  if (primaryCurrency) params.append("primaryCurrency", primaryCurrency);
  return api.get<CombinedBalanceInfo>(`/finance/balance?${params.toString()}`, {
    token,
  });
}

export async function suggestCategory(
  token: string,
  description: string,
  type: "income" | "expense",
): Promise<{ category: string | null }> {
  try {
    return await api.get<{ category: string | null }>(
      `/finance/suggest-category?description=${encodeURIComponent(description)}&type=${type}`,
      { token },
    );
  } catch {
    return { category: null };
  }
}

export async function getCategories(token: string): Promise<Categories> {
  return api.get<Categories>("/finance/categories", { token });
}

export interface UpdateTransactionDto {
  amount?: number;
  context?: "local" | "home";
  source?: string; // For income
  category?: string; // For expense
  description?: string;
  date?: string;
}

export async function updateTransaction(
  token: string,
  transactionId: string,
  data: UpdateTransactionDto,
): Promise<FinanceTransaction> {
  return api.patch<FinanceTransaction>(
    `/finance/transactions/${transactionId}`,
    data,
    { token },
  );
}

export async function deleteTransaction(
  token: string,
  transactionId: string,
): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(
    `/finance/transactions/${transactionId}`,
    { token },
  );
}

// Account interfaces and functions
export interface FinanceAccount {
  id: string;
  userId: string;
  name: string;
  currency: string;
  balance: number;
  context: "local" | "home";
  accountType: string;
  createdAt: string;
  updatedAt: string;
  transactions?: FinanceTransaction[];
}

export interface CreateAccountDto {
  name: string;
  currency?: string;
  context?: "local" | "home";
  accountType?: string;
}

export interface UpdateAccountDto {
  name?: string;
  currency?: string;
  context?: "local" | "home";
  accountType?: string;
}

export async function createAccount(
  token: string,
  data: CreateAccountDto,
): Promise<FinanceAccount> {
  return api.post<FinanceAccount>("/finance/accounts", data, { token });
}

export async function getAccounts(
  token: string,
  context?: "local" | "home",
): Promise<FinanceAccount[]> {
  const endpoint = context
    ? `/finance/accounts?context=${context}`
    : "/finance/accounts";
  return api.get<FinanceAccount[]>(endpoint, { token });
}

export async function getAccountById(
  token: string,
  accountId: string,
): Promise<FinanceAccount> {
  return api.get<FinanceAccount>(`/finance/accounts/${accountId}`, { token });
}

export async function updateAccount(
  token: string,
  accountId: string,
  data: UpdateAccountDto,
): Promise<FinanceAccount> {
  return api.patch<FinanceAccount>(`/finance/accounts/${accountId}`, data, {
    token,
  });
}

export async function deleteAccount(
  token: string,
  accountId: string,
): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/finance/accounts/${accountId}`, {
    token,
  });
}

// Finance History interfaces and functions
export interface FinanceHistory {
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function getFinanceHistory(
  token: string,
  context?: "local" | "home",
  accountId?: string,
  limit?: number,
  offset?: number,
): Promise<FinanceHistory> {
  const params = new URLSearchParams();
  if (context) params.append("context", context);
  if (accountId) params.append("accountId", accountId);
  if (limit !== undefined) params.append("limit", limit.toString());
  if (offset !== undefined) params.append("offset", offset.toString());
  const endpoint = params.toString()
    ? `/finance/history?${params.toString()}`
    : "/finance/history";
  return api.get<FinanceHistory>(endpoint, { token });
}

// Budget interfaces and functions
export interface Budget {
  id: string;
  userId: string;
  context: "local" | "home";
  name: string;
  category?: string | null;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate?: string | null;
  accountId?: string | null;
  warningThreshold: number;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
    currency: string;
  } | null;
  tracking?: BudgetTracking[];
  currentTracking?: BudgetTracking;
  transactions?: FinanceTransaction[];
}

export interface BudgetTracking {
  id: string;
  budgetId: string;
  period: string;
  spent: number;
  budgeted: number;
  status: "on_track" | "warning" | "exceeded";
  lastWarningAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetDto {
  name: string;
  category?: string;
  amount: number;
  period?: "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate?: string;
  accountId?: string;
  warningThreshold?: number;
  context?: "local" | "home";
}

export interface UpdateBudgetDto {
  name?: string;
  category?: string;
  amount?: number;
  period?: "weekly" | "monthly" | "yearly";
  startDate?: string;
  endDate?: string;
  accountId?: string;
  warningThreshold?: number;
}

export async function createBudget(
  token: string,
  data: CreateBudgetDto,
): Promise<Budget> {
  return api.post<Budget>("/finance/budgets", data, { token });
}

export async function getBudgets(
  token: string,
  context?: "local" | "home",
): Promise<Budget[]> {
  const endpoint = context
    ? `/finance/budgets?context=${context}`
    : "/finance/budgets";
  return api.get<Budget[]>(endpoint, { token });
}

export async function getBudgetById(
  token: string,
  budgetId: string,
): Promise<Budget> {
  return api.get<Budget>(`/finance/budgets/${budgetId}`, { token });
}

export async function updateBudget(
  token: string,
  budgetId: string,
  data: UpdateBudgetDto,
): Promise<Budget> {
  return api.patch<Budget>(`/finance/budgets/${budgetId}`, data, { token });
}

export async function deleteBudget(
  token: string,
  budgetId: string,
): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/finance/budgets/${budgetId}`, {
    token,
  });
}

export async function getBudgetTracking(
  token: string,
  budgetId: string,
  period?: string,
): Promise<BudgetTracking> {
  const endpoint = period
    ? `/finance/budgets/${budgetId}/tracking?period=${period}`
    : `/finance/budgets/${budgetId}/tracking`;
  return api.get<BudgetTracking>(endpoint, { token });
}

// Financial Goal interfaces and functions
export interface FinancialGoal {
  id: string;
  userId: string;
  context: "local" | "home";
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  category: "savings" | "debt" | "purchase" | "investment";
  priority: "low" | "medium" | "high";
  status: "active" | "completed" | "paused" | "cancelled";
  accountId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  account?: {
    id: string;
    name: string;
    currency: string;
  } | null;
  contributions?: GoalContribution[];
  transactions?: FinanceTransaction[];
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  transactionId?: string | null;
  date: string;
  notes?: string | null;
  createdAt: string;
  transaction?: {
    id: string;
    type: string;
    amount: number;
    description?: string | null;
    date: string;
  } | null;
}

export interface CreateGoalDto {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  category?: "savings" | "debt" | "purchase" | "investment";
  priority?: "low" | "medium" | "high";
  accountId?: string;
  context?: "local" | "home";
}

export interface UpdateGoalDto {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  category?: "savings" | "debt" | "purchase" | "investment";
  priority?: "low" | "medium" | "high";
  accountId?: string;
  status?: "active" | "completed" | "paused" | "cancelled";
}

export interface AddContributionDto {
  amount: number;
  date?: string;
  transactionId?: string;
  notes?: string;
}

export async function createGoal(
  token: string,
  data: CreateGoalDto,
): Promise<FinancialGoal> {
  return api.post<FinancialGoal>("/finance/goals", data, { token });
}

export async function getGoals(
  token: string,
  context?: "local" | "home",
  status?: string,
): Promise<FinancialGoal[]> {
  const params = new URLSearchParams();
  if (context) params.append("context", context);
  if (status) params.append("status", status);
  const endpoint = params.toString()
    ? `/finance/goals?${params.toString()}`
    : "/finance/goals";
  return api.get<FinancialGoal[]>(endpoint, { token });
}

export async function getGoalById(
  token: string,
  goalId: string,
): Promise<FinancialGoal> {
  return api.get<FinancialGoal>(`/finance/goals/${goalId}`, { token });
}

export async function updateGoal(
  token: string,
  goalId: string,
  data: UpdateGoalDto,
): Promise<FinancialGoal> {
  return api.patch<FinancialGoal>(`/finance/goals/${goalId}`, data, { token });
}

export async function deleteGoal(
  token: string,
  goalId: string,
): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/finance/goals/${goalId}`, {
    token,
  });
}

export async function addContribution(
  token: string,
  goalId: string,
  data: AddContributionDto,
): Promise<FinancialGoal> {
  return api.post<FinancialGoal>(
    `/finance/goals/${goalId}/contributions`,
    data,
    { token },
  );
}

export async function deleteContribution(
  token: string,
  goalId: string,
  contributionId: string,
): Promise<FinancialGoal> {
  return api.delete<FinancialGoal>(
    `/finance/goals/${goalId}/contributions/${contributionId}`,
    { token },
  );
}

// Loan interfaces and functions
export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  paymentDate: string;
  transactionId?: string | null;
  notes?: string | null;
  createdAt: string;
  transaction?: {
    id: string;
    type: string;
    amount: number;
    description?: string | null;
    date: string;
  } | null;
}

export interface Loan {
  id: string;
  userId: string;
  context: "local" | "home";
  name: string;
  lender: string;
  principalAmount: number;
  remainingAmount: number;
  interestRate: number;
  emi: number;
  loanTerm: number;
  remainingMonths: number;
  startDate: string;
  nextPaymentDate: string;
  paymentFrequency: "monthly" | "quarterly" | "yearly";
  accountId?: string | null;
  status: "active" | "completed" | "paused";
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  account?: {
    id: string;
    name: string;
    currency: string;
  } | null;
  payments?: LoanPayment[];
  transactions?: FinanceTransaction[];
}

export interface CreateLoanDto {
  name: string;
  lender: string;
  principalAmount: number;
  remainingAmount?: number;
  interestRate: number;
  emi: number;
  loanTerm: number;
  remainingMonths?: number;
  startDate: string;
  nextPaymentDate: string;
  paymentFrequency?: "monthly" | "quarterly" | "yearly";
  accountId?: string;
  context?: "local" | "home";
}

export interface UpdateLoanDto {
  name?: string;
  lender?: string;
  principalAmount?: number;
  remainingAmount?: number;
  interestRate?: number;
  emi?: number;
  loanTerm?: number;
  remainingMonths?: number;
  startDate?: string;
  nextPaymentDate?: string;
  paymentFrequency?: "monthly" | "quarterly" | "yearly";
  accountId?: string;
  status?: "active" | "completed" | "paused";
}

export interface AddLoanPaymentDto {
  amount: number;
  principalPaid: number;
  interestPaid: number;
  paymentDate: string;
  transactionId?: string;
  notes?: string;
}

export async function createLoan(
  token: string,
  data: CreateLoanDto,
): Promise<Loan> {
  return api.post<Loan>("/finance/loans", data, { token });
}

export async function getLoans(
  token: string,
  context?: "local" | "home",
  status?: string,
): Promise<Loan[]> {
  const params = new URLSearchParams();
  if (context) params.append("context", context);
  if (status) params.append("status", status);
  const endpoint = params.toString()
    ? `/finance/loans?${params.toString()}`
    : "/finance/loans";
  return api.get<Loan[]>(endpoint, { token });
}

export async function getLoanById(
  token: string,
  loanId: string,
): Promise<Loan> {
  return api.get<Loan>(`/finance/loans/${loanId}`, { token });
}

export async function updateLoan(
  token: string,
  loanId: string,
  data: UpdateLoanDto,
): Promise<Loan> {
  return api.patch<Loan>(`/finance/loans/${loanId}`, data, { token });
}

export async function deleteLoan(
  token: string,
  loanId: string,
): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/finance/loans/${loanId}`, { token });
}

export async function addLoanPayment(
  token: string,
  loanId: string,
  data: AddLoanPaymentDto,
): Promise<Loan> {
  return api.post<Loan>(`/finance/loans/${loanId}/payments`, data, { token });
}

export async function deleteLoanPayment(
  token: string,
  loanId: string,
  paymentId: string,
): Promise<Loan> {
  return api.delete<Loan>(`/finance/loans/${loanId}/payments/${paymentId}`, {
    token,
  });
}

// Financial Advisor Interfaces
export interface FinancialRecommendation {
  id: string;
  type: "budget" | "goal" | "spending" | "savings" | "debt" | "emergency";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: string;
  impact?: "high" | "medium" | "low";
  metrics?: {
    current?: number;
    target?: number;
    difference?: number;
    percentage?: number;
    trend?: "increasing" | "decreasing" | "stable";
    daysRemaining?: number;
    projectedDate?: string;
  };
  details?: string[];
}

export interface FinancialHealthScore {
  overall: number;
  breakdown: {
    budgetAdherence: number;
    goalProgress: number;
    savingsRate: number;
    debtToIncome: number;
    emergencyFund: number;
  };
  insights: string[];
  trends?: {
    spendingTrend?: "increasing" | "decreasing" | "stable";
    savingsTrend?: "increasing" | "decreasing" | "stable";
    incomeTrend?: "increasing" | "decreasing" | "stable";
  };
  projections?: {
    budgetBurnRate?: number;
    goalCompletionDate?: string;
    emergencyFundTargetDate?: string;
  };
}

/**
 * Get personalized financial recommendations
 */
export async function getRecommendations(
  token: string,
  context: "local" | "home" | "combined" = "local",
): Promise<FinancialRecommendation[]> {
  const endpoint = `/finance/advisor/recommendations?context=${context}`;
  return api.get<FinancialRecommendation[]>(endpoint, { token });
}

/**
 * Get financial health score with breakdown
 */
export async function getHealthScore(
  token: string,
  context: "local" | "home" | "combined" = "local",
): Promise<FinancialHealthScore> {
  const endpoint = `/finance/advisor/health-score?context=${context}`;
  return api.get<FinancialHealthScore>(endpoint, { token });
}
