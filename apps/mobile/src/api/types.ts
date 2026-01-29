export interface UserSummary {
  id: string;
  email: string;
  profile?: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface BalanceSplitSummary {
  id?: string;
  userId?: string;
  amount?: number;
  isPaid?: boolean;
}

export interface BalanceInfo {
  totalOwed: number;
  totalOwedToUser: number;
  netBalance: number;
  primaryCurrency?: string;
  owedByUser: Array<{
    user: UserSummary;
    amount: number;
    originalAmount?: number;
    originalCurrency?: string;
    splits: BalanceSplitSummary[];
    breakdown?: {
      byGroup?: Array<{
        groupId: string;
        groupName: string;
        amount: number;
      }>;
      rideshare?: number;
      individual?: number;
    };
  }>;
  owedToUser: Array<{
    user: UserSummary;
    amount: number;
    originalAmount?: number;
    originalCurrency?: string;
    splits: BalanceSplitSummary[];
    breakdown?: {
      byGroup?: Array<{
        groupId: string;
        groupName: string;
        amount: number;
      }>;
      rideshare?: number;
      individual?: number;
    };
  }>;
}
