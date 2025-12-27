// Shared TypeScript types

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
}

// More types will be added as we build

