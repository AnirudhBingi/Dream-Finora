/**
 * String Constants for Localization
 *
 * This file contains all user-facing strings in the application.
 * In the future, this will be replaced with a proper i18n library (e.g., react-i18next, i18n-js)
 *
 * Structure:
 * - Organized by feature/screen
 * - Use descriptive keys
 * - Keep related strings together
 *
 * Usage:
 * import { strings } from '../constants/strings';
 * <Text>{strings.expense.create}</Text>
 */

export const strings = {
  // Navigation
  nav: {
    home: "Home",
    billchop: "Billchop",
    chores: "Chores",
    market: "Market",
    rides: "Rides",
    back: "Back",
  },

  // Common Actions
  common: {
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save",
    create: "Create",
    update: "Update",
    confirm: "Confirm",
    close: "Close",
    retry: "Retry",
    loading: "Loading...",
    error: "Error",
    success: "Success",
  },

  // Expenses (Billchop)
  expense: {
    create: "Chop a bill",
    edit: "Edit expense",
    delete: "Delete expense",
    title: "Expenses",
    description: "Description",
    amount: "Amount",
    date: "Date",
    category: "Category",
    splitType: "Split type",
    whoPaid: "Who paid",
    participants: "Participants",
    receipt: "Receipt",
    receiptOptional: "Receipt (Optional)",
    uploadReceipt: "Upload Receipt",
    change: "Change",
    remove: "Remove",
    balances: "Balances",
    settleUp: "Settle Up",
    simplifyDebts: "Simplify Debts",
  },

  // Chores
  chore: {
    create: "Create Chore",
    edit: "Edit chore",
    delete: "Delete chore",
    complete: "Mark as Complete",
    assign: "Assign to Member",
    grab: "Grab Chore",
    title: "Chores",
    description: "Description",
    points: "Points",
    dueDate: "Due date",
    assignedTo: "Assigned to",
  },

  // Groups
  group: {
    create: "Create Circle",
    edit: "Edit group",
    delete: "Delete group",
    title: "Groups",
    name: "Name",
    description: "Description",
    members: "Members",
    addMember: "Add Member",
  },

  // Listings
  listing: {
    create: "List Item",
    edit: "Edit listing",
    delete: "Delete listing",
    title: "Listings",
    name: "Title",
    description: "Description",
    price: "Price",
    images: "Images",
    addImages: "Add Images",
    addMoreImages: "Add More Images",
  },

  // Accounts
  account: {
    create: "Create Account",
    edit: "Edit account",
    delete: "Delete account",
    title: "Accounts",
    name: "Name",
    currency: "Currency",
    balance: "Balance",
  },

  // Messages
  message: {
    send: "Send",
    edit: "Edit message",
    delete: "Delete message",
    title: "Messages",
    conversations: "Conversations",
    newMessage: "New Message",
    typeMessage: "Type a message...",
  },

  // Profile
  profile: {
    title: "Profile",
    edit: "Edit Profile",
    settings: "Settings",
    trustScore: "Trust Score",
    friends: "Friends",
    notifications: "Notifications",
  },

  // Errors
  error: {
    networkError: "Network request failed",
    genericError: "Something went wrong. Please try again.",
    validationError: "Please check your input and try again.",
    notFound: "Item not found",
    unauthorized: "Unauthorized access",
  },

  // Info Messages
  info: {
    expenseSplitEqual: (count: number) =>
      `This expense will be split equally among you and ${count} other${count !== 1 ? "s" : ""}.`,
    expenseSplitCustom:
      "Enter custom amounts for each participant. The total must equal the expense amount.",
    expenseSplitPercentage:
      "Enter percentages for each participant. The total must equal 100%.",
    groupCreation:
      "You'll be automatically added as a member. Adding other members will be available soon!",
    accountCreation:
      "This account will start with a balance of $0.00. Add transactions to track your finances!",
  },
};

/**
 * Helper function to get localized string
 * Future implementation will use i18n library
 */
export function t(key: string, params?: Record<string, any>): string {
  // Simple implementation for now
  // In the future, replace with i18n library
  const keys = key.split(".");
  let value: any = strings;

  for (const k of keys) {
    value = value?.[k];
  }

  if (typeof value === "function" && params) {
    return value(params);
  }

  return typeof value === "string" ? value : key;
}
