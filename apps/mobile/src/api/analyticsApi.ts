import { getApiBaseUrl } from './getApiBaseUrl';

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
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const url = `${getApiBaseUrl()}/analytics/spending-by-category${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch spending by category' }));
    throw new Error(error.message || `Failed to fetch spending by category: ${response.status}`);
  }

  return response.json();
}

export async function getMonthlyTrends(
  token: string,
  months?: number,
): Promise<MonthlyTrend[]> {
  const params = new URLSearchParams();
  if (months) params.append('months', months.toString());

  const url = `${getApiBaseUrl()}/analytics/monthly-trends${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch monthly trends' }));
    throw new Error(error.message || `Failed to fetch monthly trends: ${response.status}`);
  }

  return response.json();
}

export async function getBalanceOverTime(
  token: string,
  days?: number,
): Promise<BalanceOverTime[]> {
  const params = new URLSearchParams();
  if (days) params.append('days', days.toString());

  const url = `${getApiBaseUrl()}/analytics/balance-over-time${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch balance over time' }));
    throw new Error(error.message || `Failed to fetch balance over time: ${response.status}`);
  }

  return response.json();
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
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const url = `${getApiBaseUrl()}/analytics/expense-spending-by-category${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch expense spending by category' }));
    throw new Error(error.message || `Failed to fetch expense spending by category: ${response.status}`);
  }

  return response.json();
}

export async function getExpenseMonthlyTrends(
  token: string,
  months?: number,
): Promise<ExpenseMonthlyTrend[]> {
  const params = new URLSearchParams();
  if (months) params.append('months', months.toString());

  const url = `${getApiBaseUrl()}/analytics/expense-monthly-trends${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch expense monthly trends' }));
    throw new Error(error.message || `Failed to fetch expense monthly trends: ${response.status}`);
  }

  return response.json();
}

export async function getTopSpendersInGroup(
  token: string,
  groupId: string,
  limit?: number,
): Promise<TopSpender[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());

  const url = `${getApiBaseUrl()}/analytics/top-spenders/${groupId}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch top spenders' }));
    throw new Error(error.message || `Failed to fetch top spenders: ${response.status}`);
  }

  return response.json();
}

