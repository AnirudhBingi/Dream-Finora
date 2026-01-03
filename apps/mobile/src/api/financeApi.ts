import { getApiBaseUrl } from './getApiBaseUrl';

export interface FinanceTransaction {
  id: string;
  userId: string;
  accountId?: string | null; // Optional for backward compatibility
  type: 'income' | 'expense';
  amount: number;
  context: 'local' | 'home';
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
  type: 'income' | 'expense';
  amount: number;
  context: 'local' | 'home';
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
  const response = await fetch(`${getApiBaseUrl()}/finance/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create transaction' }));
    throw new Error(error.message || `Failed to create transaction: ${response.status}`);
  }

  return response.json();
}

export async function getTransactions(
  token: string,
  context?: 'local' | 'home',
  includeBillchop?: boolean,
): Promise<FinanceTransaction[]> {
  const params = new URLSearchParams();
  if (context) {
    params.append('context', context);
  }
  if (includeBillchop) {
    params.append('includeBillchop', 'true');
  }
  const url = `${getApiBaseUrl()}/finance/transactions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch transactions' }));
    throw new Error(error.message || `Failed to fetch transactions: ${response.status}`);
  }

  return response.json();
}

export async function getTransactionById(
  token: string,
  transactionId: string,
): Promise<FinanceTransaction> {
  const response = await fetch(`${getApiBaseUrl()}/finance/transactions/${transactionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch transaction' }));
    throw new Error(error.message || `Failed to fetch transaction: ${response.status}`);
  }

  return response.json();
}

export async function getBalance(
  token: string,
  context?: 'local' | 'home',
  includeBillchop?: boolean,
): Promise<BalanceInfo> {
  const params = new URLSearchParams();
  if (context) {
    params.append('context', context);
  }
  if (includeBillchop !== undefined) {
    params.append('includeBillchop', includeBillchop ? 'true' : 'false');
  }
  const url = `${getApiBaseUrl()}/finance/balance${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch balance' }));
    throw new Error(error.message || `Failed to fetch balance: ${response.status}`);
  }

  return response.json();
}

export async function getCombinedBalance(
  token: string,
  primaryCurrency?: string,
): Promise<CombinedBalanceInfo> {
  const params = new URLSearchParams();
  params.append('combined', 'true');
  if (primaryCurrency) {
    params.append('primaryCurrency', primaryCurrency);
  }
  const url = `${getApiBaseUrl()}/finance/balance?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch combined balance' }));
    throw new Error(error.message || `Failed to fetch combined balance: ${response.status}`);
  }

  return response.json();
}

export async function suggestCategory(
  token: string,
  description: string,
  type: 'income' | 'expense',
): Promise<{ category: string | null }> {
  const params = new URLSearchParams({ description, type });
  const response = await fetch(`${getApiBaseUrl()}/finance/suggest-category?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { category: null };
  }

  return response.json();
}

export async function getCategories(token: string): Promise<Categories> {
  const response = await fetch(`${getApiBaseUrl()}/finance/categories`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch categories' }));
    throw new Error(error.message || `Failed to fetch categories: ${response.status}`);
  }

  return response.json();
}

export interface UpdateTransactionDto {
  amount?: number;
  context?: 'local' | 'home';
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
  const response = await fetch(`${getApiBaseUrl()}/finance/transactions/${transactionId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update transaction' }));
    throw new Error(error.message || `Failed to update transaction: ${response.status}`);
  }

  return response.json();
}

export async function deleteTransaction(
  token: string,
  transactionId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/finance/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete transaction' }));
    throw new Error(error.message || `Failed to delete transaction: ${response.status}`);
  }

  return response.json();
}

// Account interfaces and functions
export interface FinanceAccount {
  id: string;
  userId: string;
  name: string;
  currency: string;
  balance: number;
  context: 'local' | 'home';
  accountType: string;
  createdAt: string;
  updatedAt: string;
  transactions?: FinanceTransaction[];
}

export interface CreateAccountDto {
  name: string;
  currency?: string;
  context?: 'local' | 'home';
  accountType?: string;
}

export interface UpdateAccountDto {
  name?: string;
  currency?: string;
  context?: 'local' | 'home';
  accountType?: string;
}

export async function createAccount(
  token: string,
  data: CreateAccountDto,
): Promise<FinanceAccount> {
  const response = await fetch(`${getApiBaseUrl()}/finance/accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create account' }));
    throw new Error(error.message || `Failed to create account: ${response.status}`);
  }

  return response.json();
}

export async function getAccounts(
  token: string,
  context?: 'local' | 'home',
): Promise<FinanceAccount[]> {
  const params = new URLSearchParams();
  if (context) {
    params.append('context', context);
  }
  const url = `${getApiBaseUrl()}/finance/accounts${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch accounts' }));
    throw new Error(error.message || `Failed to fetch accounts: ${response.status}`);
  }

  return response.json();
}

export async function getAccountById(
  token: string,
  accountId: string,
): Promise<FinanceAccount> {
  const response = await fetch(`${getApiBaseUrl()}/finance/accounts/${accountId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch account' }));
    throw new Error(error.message || `Failed to fetch account: ${response.status}`);
  }

  return response.json();
}

export async function updateAccount(
  token: string,
  accountId: string,
  data: UpdateAccountDto,
): Promise<FinanceAccount> {
  const response = await fetch(`${getApiBaseUrl()}/finance/accounts/${accountId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update account' }));
    throw new Error(error.message || `Failed to update account: ${response.status}`);
  }

  return response.json();
}

export async function deleteAccount(
  token: string,
  accountId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/finance/accounts/${accountId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete account' }));
    throw new Error(error.message || `Failed to delete account: ${response.status}`);
  }

  return response.json();
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
  context?: 'local' | 'home',
  accountId?: string,
  limit?: number,
  offset?: number,
): Promise<FinanceHistory> {
  const params = new URLSearchParams();
  if (context) {
    params.append('context', context);
  }
  if (accountId) {
    params.append('accountId', accountId);
  }
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }
  if (offset !== undefined) {
    params.append('offset', offset.toString());
  }
  const url = `${getApiBaseUrl()}/finance/history${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch finance history' }));
    throw new Error(error.message || `Failed to fetch finance history: ${response.status}`);
  }

  return response.json();
}

// Budget interfaces and functions
export interface Budget {
  id: string;
  userId: string;
  context: 'local' | 'home';
  name: string;
  category?: string | null;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
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
  status: 'on_track' | 'warning' | 'exceeded';
  lastWarningAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetDto {
  name: string;
  category?: string;
  amount: number;
  period?: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  accountId?: string;
  warningThreshold?: number;
  context?: 'local' | 'home';
}

export interface UpdateBudgetDto {
  name?: string;
  category?: string;
  amount?: number;
  period?: 'weekly' | 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
  accountId?: string;
  warningThreshold?: number;
}

export async function createBudget(
  token: string,
  data: CreateBudgetDto,
): Promise<Budget> {
  const response = await fetch(`${getApiBaseUrl()}/finance/budgets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create budget' }));
    throw new Error(error.message || `Failed to create budget: ${response.status}`);
  }

  return response.json();
}

export async function getBudgets(
  token: string,
  context?: 'local' | 'home',
): Promise<Budget[]> {
  const params = new URLSearchParams();
  if (context) {
    params.append('context', context);
  }
  const url = `${getApiBaseUrl()}/finance/budgets${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch budgets' }));
    throw new Error(error.message || `Failed to fetch budgets: ${response.status}`);
  }

  return response.json();
}

export async function getBudgetById(
  token: string,
  budgetId: string,
): Promise<Budget> {
  const response = await fetch(`${getApiBaseUrl()}/finance/budgets/${budgetId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch budget' }));
    throw new Error(error.message || `Failed to fetch budget: ${response.status}`);
  }

  return response.json();
}

export async function updateBudget(
  token: string,
  budgetId: string,
  data: UpdateBudgetDto,
): Promise<Budget> {
  const response = await fetch(`${getApiBaseUrl()}/finance/budgets/${budgetId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update budget' }));
    throw new Error(error.message || `Failed to update budget: ${response.status}`);
  }

  return response.json();
}

export async function deleteBudget(
  token: string,
  budgetId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/finance/budgets/${budgetId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete budget' }));
    throw new Error(error.message || `Failed to delete budget: ${response.status}`);
  }

  return response.json();
}

export async function getBudgetTracking(
  token: string,
  budgetId: string,
  period?: string,
): Promise<BudgetTracking> {
  const params = new URLSearchParams();
  if (period) {
    params.append('period', period);
  }
  const url = `${getApiBaseUrl()}/finance/budgets/${budgetId}/tracking${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch budget tracking' }));
    throw new Error(error.message || `Failed to fetch budget tracking: ${response.status}`);
  }

  return response.json();
}

// Financial Goal interfaces and functions
export interface FinancialGoal {
  id: string;
  userId: string;
  context: 'local' | 'home';
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  category: 'savings' | 'debt' | 'purchase' | 'investment';
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
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
  category?: 'savings' | 'debt' | 'purchase' | 'investment';
  priority?: 'low' | 'medium' | 'high';
  accountId?: string;
  context?: 'local' | 'home';
}

export interface UpdateGoalDto {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  category?: 'savings' | 'debt' | 'purchase' | 'investment';
  priority?: 'low' | 'medium' | 'high';
  accountId?: string;
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
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
  const response = await fetch(`${getApiBaseUrl()}/finance/goals`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create goal' }));
    throw new Error(error.message || `Failed to create goal: ${response.status}`);
  }

  return response.json();
}

export async function getGoals(
  token: string,
  context?: 'local' | 'home',
  status?: string,
): Promise<FinancialGoal[]> {
  const params = new URLSearchParams();
  if (context) {
    params.append('context', context);
  }
  if (status) {
    params.append('status', status);
  }
  const url = `${getApiBaseUrl()}/finance/goals${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch goals' }));
    throw new Error(error.message || `Failed to fetch goals: ${response.status}`);
  }

  return response.json();
}

export async function getGoalById(
  token: string,
  goalId: string,
): Promise<FinancialGoal> {
  const response = await fetch(`${getApiBaseUrl()}/finance/goals/${goalId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch goal' }));
    throw new Error(error.message || `Failed to fetch goal: ${response.status}`);
  }

  return response.json();
}

export async function updateGoal(
  token: string,
  goalId: string,
  data: UpdateGoalDto,
): Promise<FinancialGoal> {
  const response = await fetch(`${getApiBaseUrl()}/finance/goals/${goalId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update goal' }));
    throw new Error(error.message || `Failed to update goal: ${response.status}`);
  }

  return response.json();
}

export async function deleteGoal(
  token: string,
  goalId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/finance/goals/${goalId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete goal' }));
    throw new Error(error.message || `Failed to delete goal: ${response.status}`);
  }

  return response.json();
}

export async function addContribution(
  token: string,
  goalId: string,
  data: AddContributionDto,
): Promise<FinancialGoal> {
  const response = await fetch(`${getApiBaseUrl()}/finance/goals/${goalId}/contributions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to add contribution' }));
    throw new Error(error.message || `Failed to add contribution: ${response.status}`);
  }

  return response.json();
}

export async function deleteContribution(
  token: string,
  goalId: string,
  contributionId: string,
): Promise<FinancialGoal> {
  const response = await fetch(`${getApiBaseUrl()}/finance/goals/${goalId}/contributions/${contributionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete contribution' }));
    throw new Error(error.message || `Failed to delete contribution: ${response.status}`);
  }

  return response.json();
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
  context: 'local' | 'home';
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
  paymentFrequency: 'monthly' | 'quarterly' | 'yearly';
  accountId?: string | null;
  status: 'active' | 'completed' | 'paused';
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
  paymentFrequency?: 'monthly' | 'quarterly' | 'yearly';
  accountId?: string;
  context?: 'local' | 'home';
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
  paymentFrequency?: 'monthly' | 'quarterly' | 'yearly';
  accountId?: string;
  status?: 'active' | 'completed' | 'paused';
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
  const response = await fetch(`${getApiBaseUrl()}/finance/loans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create loan' }));
    throw new Error(error.message || `Failed to create loan: ${response.status}`);
  }

  return response.json();
}

export async function getLoans(
  token: string,
  context?: 'local' | 'home',
  status?: string,
): Promise<Loan[]> {
  const params = new URLSearchParams();
  if (context) {
    params.append('context', context);
  }
  if (status) {
    params.append('status', status);
  }
  const url = `${getApiBaseUrl()}/finance/loans${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch loans' }));
    throw new Error(error.message || `Failed to fetch loans: ${response.status}`);
  }

  return response.json();
}

export async function getLoanById(
  token: string,
  loanId: string,
): Promise<Loan> {
  const response = await fetch(`${getApiBaseUrl()}/finance/loans/${loanId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch loan' }));
    throw new Error(error.message || `Failed to fetch loan: ${response.status}`);
  }

  return response.json();
}

export async function updateLoan(
  token: string,
  loanId: string,
  data: UpdateLoanDto,
): Promise<Loan> {
  const response = await fetch(`${getApiBaseUrl()}/finance/loans/${loanId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update loan' }));
    throw new Error(error.message || `Failed to update loan: ${response.status}`);
  }

  return response.json();
}

export async function deleteLoan(
  token: string,
  loanId: string,
): Promise<{ message: string }> {
  const response = await fetch(`${getApiBaseUrl()}/finance/loans/${loanId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete loan' }));
    throw new Error(error.message || `Failed to delete loan: ${response.status}`);
  }

  return response.json();
}

export async function addLoanPayment(
  token: string,
  loanId: string,
  data: AddLoanPaymentDto,
): Promise<Loan> {
  const response = await fetch(`${getApiBaseUrl()}/finance/loans/${loanId}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to add loan payment' }));
    throw new Error(error.message || `Failed to add loan payment: ${response.status}`);
  }

  return response.json();
}

export async function deleteLoanPayment(
  token: string,
  loanId: string,
  paymentId: string,
): Promise<Loan> {
  const response = await fetch(`${getApiBaseUrl()}/finance/loans/${loanId}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete loan payment' }));
    throw new Error(error.message || `Failed to delete loan payment: ${response.status}`);
  }

  return response.json();
}

// Financial Advisor Interfaces
export interface FinancialRecommendation {
  id: string;
  type: 'budget' | 'goal' | 'spending' | 'savings' | 'debt' | 'emergency';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  impact?: 'high' | 'medium' | 'low';
  metrics?: {
    current?: number;
    target?: number;
    difference?: number;
    percentage?: number;
    trend?: 'increasing' | 'decreasing' | 'stable';
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
    spendingTrend?: 'increasing' | 'decreasing' | 'stable';
    savingsTrend?: 'increasing' | 'decreasing' | 'stable';
    incomeTrend?: 'increasing' | 'decreasing' | 'stable';
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
  context: 'local' | 'home' | 'combined' = 'local',
): Promise<FinancialRecommendation[]> {
  const params = new URLSearchParams();
  if (context) params.append('context', context);

  const url = `${getApiBaseUrl()}/finance/advisor/recommendations${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch recommendations' }));
    throw new Error(error.message || `Failed to fetch recommendations: ${response.status}`);
  }

  return response.json();
}

/**
 * Get financial health score with breakdown
 */
export async function getHealthScore(
  token: string,
  context: 'local' | 'home' | 'combined' = 'local',
): Promise<FinancialHealthScore> {
  const params = new URLSearchParams();
  if (context) params.append('context', context);

  const url = `${getApiBaseUrl()}/finance/advisor/health-score${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch health score' }));
    throw new Error(error.message || `Failed to fetch health score: ${response.status}`);
  }

  return response.json();
}

