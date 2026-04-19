import { create } from "zustand";
import { MOCK_TRANSACTIONS } from "@/services/personalFinanceApi";

export interface Transaction {
  id: string;
  date: string;           // ISO yyyy-mm-dd
  description: string;
  amount: number;         // positive = income, negative = expense
  type: "income" | "expense" | "transfer";
  category: string;
  source: "csv" | "manual";
}

export type FlowStep = "empty" | "review" | "dashboard";

interface PersonalFinanceState {
  flowStep: FlowStep;
  activeTab: string;

  // Confirmed transactions live here
  transactions: Transaction[];
  // Transactions parsed from CSV awaiting category review
  pendingTransactions: Transaction[];
  // category → monthly budget limit
  budgets: Record<string, number>;

  apiLoading: boolean;
  apiError: string | null;

  // Actions
  setFlowStep: (step: FlowStep) => void;
  setActiveTab: (tab: string) => void;
  setPendingTransactions: (txs: Transaction[]) => void;
  confirmPendingTransactions: () => void;
  addTransaction: (tx: Transaction) => void;
  updateTransactionCategory: (id: string, category: string) => void;
  updatePendingCategory: (id: string, category: string) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (category: string, limit: number) => void;
  setApiLoading: (v: boolean) => void;
  setApiError: (e: string | null) => void;
  /** Loads all mock transactions at once and navigates to the dashboard view */
  loadDemoData: () => void;
  reset: () => void;
}

export const usePersonalFinanceStore = create<PersonalFinanceState>((set) => ({
  flowStep: "empty",
  activeTab: "overview",
  transactions: [],
  pendingTransactions: [],
  budgets: {},
  apiLoading: false,
  apiError: null,

  setFlowStep: (flowStep) => set({ flowStep }),
  setActiveTab: (activeTab) => set({ activeTab }),

  setPendingTransactions: (pendingTransactions) =>
    set({ pendingTransactions, flowStep: "review" }),

  confirmPendingTransactions: () =>
    set((s) => ({
      transactions: [...s.transactions, ...s.pendingTransactions],
      pendingTransactions: [],
      flowStep: "dashboard",
    })),

  addTransaction: (tx) =>
    set((s) => ({
      transactions: [tx, ...s.transactions],
      flowStep: "dashboard",
    })),

  updateTransactionCategory: (id, category) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, category } : t
      ),
    })),

  updatePendingCategory: (id, category) =>
    set((s) => ({
      pendingTransactions: s.pendingTransactions.map((t) =>
        t.id === id ? { ...t, category } : t
      ),
    })),

  deleteTransaction: (id) =>
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

  setBudget: (category, limit) =>
    set((s) => ({ budgets: { ...s.budgets, [category]: limit } })),

  setApiLoading: (apiLoading) => set({ apiLoading }),
  setApiError: (apiError) => set({ apiError }),

  loadDemoData: () =>
    set({
      transactions: [...MOCK_TRANSACTIONS],
      flowStep: "dashboard",
      activeTab: "overview",
    }),

  reset: () =>
    set({
      flowStep: "empty",
      activeTab: "overview",
      transactions: [],
      pendingTransactions: [],
      budgets: {},
      apiLoading: false,
      apiError: null,
    }),
}));
