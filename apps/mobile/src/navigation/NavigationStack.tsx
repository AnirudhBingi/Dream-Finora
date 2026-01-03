import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ScreenName =
  | 'home'
  | 'profile'
  | 'editProfile'
  | 'expenses'
  | 'createExpense'
  | 'editExpense'
  | 'expenseDetail'
  | 'activity'
  | 'balanceSummary'
  | 'settleUp'
  | 'groups'
  | 'createGroup'
  | 'groupDetail'
  | 'groupSettings'
  | 'addGroupMember'
  | 'finance'
  | 'addTransaction'
  | 'editTransaction'
  | 'editAccount'
  | 'financeHistory'
  | 'budgets'
  | 'createBudget'
  | 'editBudget'
  | 'goals'
  | 'createGoal'
  | 'editGoal'
  | 'goalDetail'
  | 'addContribution'
  | 'loans'
  | 'createLoan'
  | 'loanDetail'
  | 'recordLoanPayment'
  | 'advisor'
  | 'chores'
  | 'createChore'
  | 'choreDetail'
  | 'editChore'
  | 'choreHistory'
  | 'rides'
  | 'createRide'
  | 'rideDetail'
  | 'spacev'
  | 'createSpaceV'
  | 'spacevDetail'
  | 'conversations'
  | 'messageThread'
  | 'analytics'
  | 'billchopAnalytics'
  | 'friends'
  | 'friendSearch'
  | 'notifications'
  | 'settings';

export interface ScreenParams {
  selectedContext?: 'local' | 'home' | null;
  selectedTransactionType?: 'income' | 'expense' | null;
  selectedGroupId?: string | null;
  selectedChoreId?: string | null;
  selectedRideId?: string | null;
  selectedSpaceVId?: string | null;
  selectedChatId?: string | null;
  selectedOtherUser?: any | null;
  selectedPayeeId?: string | null;
  selectedPayeeName?: string;
  selectedSettlementAmount?: number;
  selectedExpenseId?: string | null;
  selectedFriendId?: string | null;
  selectedFriendName?: string;
  selectedBudgetId?: string | null;
  selectedGoalId?: string | null;
  selectedLoanId?: string | null;
  selectedTransactionId?: string | null;
  selectedAccountId?: string | null;
  goalPrefill?: { name: string; targetAmount: number; category: 'savings' | 'debt' | 'purchase' | 'investment' };
  contributionAmount?: number;
  loanPaymentAmount?: number;
  expenseRefreshKey?: number;
  groupRefreshKey?: number;
  financeRefreshKey?: number;
  spacevRefreshKey?: number;
  choreRefreshKey?: number;
  rideRefreshKey?: number;
  budgetRefreshKey?: number;
  goalRefreshKey?: number;
  loanRefreshKey?: number;
}

export interface NavigationEntry {
  screen: ScreenName;
  params: ScreenParams;
}

interface NavigationContextType {
  stack: NavigationEntry[];
  currentScreen: ScreenName;
  currentParams: ScreenParams;
  push: (screen: ScreenName, params?: Partial<ScreenParams>) => void;
  pop: () => void;
  replace: (screen: ScreenName, params?: Partial<ScreenParams>) => void;
  reset: (screen: ScreenName, params?: Partial<ScreenParams>) => void;
  canGoBack: () => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<NavigationEntry[]>([
    { screen: 'home', params: {} },
  ]);

  const push = useCallback((screen: ScreenName, params?: Partial<ScreenParams>) => {
    setStack((prev) => {
      const currentEntry = prev[prev.length - 1];
      const newParams: ScreenParams = {
        ...currentEntry.params,
        ...params,
      };
      return [...prev, { screen, params: newParams }];
    });
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const replace = useCallback((screen: ScreenName, params?: Partial<ScreenParams>) => {
    setStack((prev) => {
      if (prev.length === 0) return [{ screen, params: params || {} }];
      const currentEntry = prev[prev.length - 1];
      const newParams: ScreenParams = {
        ...currentEntry.params,
        ...params,
      };
      return [...prev.slice(0, -1), { screen, params: newParams }];
    });
  }, []);

  const reset = useCallback((screen: ScreenName, params?: Partial<ScreenParams>) => {
    setStack([{ screen, params: params || {} }]);
  }, []);

  const canGoBack = useCallback(() => {
    return stack.length > 1;
  }, [stack.length]);

  const currentEntry = stack[stack.length - 1];

  return (
    <NavigationContext.Provider
      value={{
        stack,
        currentScreen: currentEntry.screen,
        currentParams: currentEntry.params,
        push,
        pop,
        replace,
        reset,
        canGoBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

