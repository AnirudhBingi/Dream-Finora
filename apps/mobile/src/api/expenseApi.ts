import { getApiBaseUrl } from './getApiBaseUrl';

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  isPaid: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export type SplitType = 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';

export interface Expense {
  id: string;
  createdBy: string;
  description: string;
  amount: number;
  currency: string;
  category?: string | null;
  date: string;
  createdAt: string;
  groupId?: string | null;
  receiptUrl?: string | null;
  paidBy?: string | null;
  splitType: SplitType;
  splits: ExpenseSplit[];
  createdByUser: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  paidByUser?: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
  group?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export interface CreateExpenseDto {
  description: string;
  amount: number;
  currency?: string;
  splits: {
    userId: string;
    amount: number;
    percentage?: number; // For percentage splits (0-100)
  }[];
  receiptUrl?: string;
  category?: string;
  paidBy?: string; // User ID who paid
  splitType?: SplitType; // EQUAL, CUSTOM, or PERCENTAGE
}

export interface BalanceInfo {
  totalOwed: number;
  totalOwedToUser: number;
  netBalance: number;
  primaryCurrency?: string;
  owedByUser: Array<{
    user: {
      id: string;
      email: string;
      profile?: {
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    };
    amount: number;
    originalAmount?: number;
    originalCurrency?: string;
    splits: ExpenseSplit[];
  }>;
  owedToUser: Array<{
    user: {
      id: string;
      email: string;
      profile?: {
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    };
    amount: number;
    originalAmount?: number;
    originalCurrency?: string;
    splits: ExpenseSplit[];
  }>;
}

export async function createExpense(
  token: string,
  data: CreateExpenseDto,
): Promise<Expense> {
  const response = await fetch(`${getApiBaseUrl()}/expenses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create expense' }));
    throw new Error(error.message || `Failed to create expense: ${response.status}`);
  }

  return response.json();
}

export interface PaginatedResponse<T> {
  expenses?: T[];
  chores?: T[];
  groups?: T[];
  listings?: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export async function getExpenses(
  token: string,
  limit: number = 50,
  offset: number = 0,
): Promise<PaginatedResponse<Expense> | Expense[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('offset', offset.toString());

  const response = await fetch(`${getApiBaseUrl()}/expenses?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch expenses' }));
    throw new Error(error.message || `Failed to fetch expenses: ${response.status}`);
  }

  const data = await response.json();
  // Check if response has pagination structure
  if (data.expenses && Array.isArray(data.expenses)) {
    return data as PaginatedResponse<Expense>;
  }
  // Backward compatibility: return array if not paginated
  return data as Expense[];
}

export async function getExpenseById(token: string, expenseId: string): Promise<Expense> {
  const response = await fetch(`${getApiBaseUrl()}/expenses/${expenseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch expense' }));
    throw new Error(error.message || `Failed to fetch expense: ${response.status}`);
  }

  return response.json();
}

export async function getBalances(token: string, primaryCurrency?: string): Promise<BalanceInfo> {
  const url = new URL(`${getApiBaseUrl()}/expenses/balances`);
  if (primaryCurrency) {
    url.searchParams.append('primaryCurrency', primaryCurrency);
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch balances' }));
    throw new Error(error.message || `Failed to fetch balances: ${response.status}`);
  }

  return response.json();
}

export async function markSplitAsPaid(
  token: string,
  expenseId: string,
  splitId: string,
): Promise<Expense> {
  const response = await fetch(
    `${getApiBaseUrl()}/expenses/${expenseId}/splits/${splitId}/pay`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to mark as paid' }));
    throw new Error(error.message || `Failed to mark as paid: ${response.status}`);
  }

  return response.json();
}

export async function uploadReceipt(
  token: string,
  expenseId: string,
  imageUri: string,
): Promise<Expense> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'receipt.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const response = await fetch(`${getApiBaseUrl()}/expenses/${expenseId}/receipt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload receipt' }));
    throw new Error(error.message || `Failed to upload receipt: ${response.status}`);
  }

  return response.json();
}

// Settlement-related interfaces and functions
export interface SimplifiedDebt {
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromUser: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  toUser: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface SimplifiedDebtsResponse {
  originalCount: number;
  simplifiedCount: number;
  simplifiedDebts: SimplifiedDebt[];
}

export interface CreateSettlementDto {
  payeeId: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  notes?: string;
  splitIds?: string[];
}

export interface Settlement {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  notes?: string | null;
  settledAt: string;
  createdAt: string;
  payer: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  payee: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export async function simplifyDebts(token: string): Promise<SimplifiedDebtsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/expenses/simplify-debts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to simplify debts' }));
    throw new Error(error.message || `Failed to simplify debts: ${response.status}`);
  }

  return response.json();
}

export async function createSettlement(
  token: string,
  data: CreateSettlementDto,
): Promise<Settlement> {
  const response = await fetch(`${getApiBaseUrl()}/expenses/settlements`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create settlement' }));
    throw new Error(error.message || `Failed to create settlement: ${response.status}`);
  }

  return response.json();
}

export async function getSettlements(token: string): Promise<Settlement[]> {
  const response = await fetch(`${getApiBaseUrl()}/expenses/settlements`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch settlements' }));
    throw new Error(error.message || `Failed to fetch settlements: ${response.status}`);
  }

  return response.json();
}

export async function suggestCategory(token: string, description: string): Promise<{ category: string | null }> {
  const response = await fetch(`${getApiBaseUrl()}/expenses/suggest-category`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    return { category: null };
  }

  return response.json();
}

export interface UpdateExpenseDto {
  description?: string;
  amount?: number;
  currency?: string;
  category?: string;
  date?: string;
  splits?: {
    userId: string;
    amount: number;
    percentage?: number; // For percentage splits (0-100)
  }[];
  receiptUrl?: string;
  paidBy?: string; // User ID who paid
  splitType?: SplitType; // EQUAL, CUSTOM, or PERCENTAGE
}

export async function updateExpense(
  token: string,
  expenseId: string,
  data: UpdateExpenseDto,
): Promise<Expense> {
  const response = await fetch(`${getApiBaseUrl()}/expenses/${expenseId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update expense' }));
    throw new Error(error.message || `Failed to update expense: ${response.status}`);
  }

  return response.json();
}

export async function deleteExpense(token: string, expenseId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/expenses/${expenseId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete expense' }));
    throw new Error(error.message || `Failed to delete expense: ${response.status}`);
  }
}

export interface ExpenseHistory {
  id: string;
  expenseId: string | null;
  action: string; // "created", "updated", "deleted", "settled"
  userId: string;
  changes?: any; // JSON object with before/after values
  notes?: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export async function getExpenseHistory(token: string, expenseId: string): Promise<ExpenseHistory[]> {
  const response = await fetch(`${getApiBaseUrl()}/expenses/${expenseId}/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get expense history' }));
    throw new Error(error.message || `Failed to get expense history: ${response.status}`);
  }

  return response.json();
}

