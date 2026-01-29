import { api } from "./client";
import type { BalanceInfo } from "./types";

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

export type SplitType = "EQUAL" | "CUSTOM" | "PERCENTAGE";

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
  rideId?: string | null; // Link to Ride if this expense was created from a ride
  ride?: {
    id: string;
    origin: string;
    destination: string;
    type: "giveRide" | "rideshare";
    date: string;
  } | null; // Ride summary if expense was created from a ride
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
    avatarUrl?: string | null;
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

export async function createExpense(
  token: string,
  data: CreateExpenseDto,
): Promise<Expense> {
  return api.post<Expense>("/expenses", data, { token });
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
  const data = await api.get<PaginatedResponse<Expense> | Expense[]>(
    `/expenses?limit=${limit}&offset=${offset}`,
    { token },
  );
  // Check if response has pagination structure
  if (
    data &&
    typeof data === "object" &&
    "expenses" in data &&
    Array.isArray((data as any).expenses)
  ) {
    return data as PaginatedResponse<Expense>;
  }
  // Backward compatibility: return array if not paginated
  return data as Expense[];
}

export async function getExpenseById(
  token: string,
  expenseId: string,
): Promise<Expense> {
  return api.get<Expense>(`/expenses/${expenseId}`, { token });
}

export async function getBalances(
  token: string,
  primaryCurrency?: string,
): Promise<BalanceInfo> {
  const endpoint = primaryCurrency
    ? `/expenses/balances?primaryCurrency=${encodeURIComponent(primaryCurrency)}`
    : "/expenses/balances";
  return api.get<BalanceInfo>(endpoint, { token });
}

export async function markSplitAsPaid(
  token: string,
  expenseId: string,
  splitId: string,
): Promise<Expense> {
  return api.put<Expense>(
    `/expenses/${expenseId}/splits/${splitId}/pay`,
    undefined,
    { token },
  );
}

export async function uploadReceipt(
  token: string,
  expenseId: string,
  imageUri: string,
): Promise<Expense> {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "receipt.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append("file", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  return api.post<Expense>(`/expenses/${expenseId}/receipt`, formData, {
    token,
  });
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
  payerId?: string; // Optional: if not provided, defaults to current user
  amount: number;
  currency?: string;
  paymentMethod: string;
  notes?: string;
  splitIds?: string[];
  groupId?: string; // Optional: filter splits to only those within this group (for group-specific settlements)
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

export async function simplifyDebts(
  token: string,
): Promise<SimplifiedDebtsResponse> {
  return api.get<SimplifiedDebtsResponse>("/expenses/simplify-debts", {
    token,
  });
}

export async function createSettlement(
  token: string,
  data: CreateSettlementDto,
): Promise<Settlement> {
  return api.post<Settlement>("/expenses/settlements", data, { token });
}

export async function getSettlements(token: string): Promise<Settlement[]> {
  return api.get<Settlement[]>("/expenses/settlements", { token });
}

export async function suggestCategory(
  token: string,
  description: string,
): Promise<{ category: string | null }> {
  try {
    return await api.post<{ category: string | null }>(
      "/expenses/suggest-category",
      { description },
      { token },
    );
  } catch {
    return { category: null };
  }
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
  return api.put<Expense>(`/expenses/${expenseId}`, data, { token });
}

export async function deleteExpense(
  token: string,
  expenseId: string,
): Promise<void> {
  return api.delete<void>(`/expenses/${expenseId}`, { token });
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

export async function getExpenseHistory(
  token: string,
  expenseId: string,
): Promise<ExpenseHistory[]> {
  return api.get<ExpenseHistory[]>(`/expenses/${expenseId}/history`, { token });
}

export type { BalanceInfo } from "./types";
