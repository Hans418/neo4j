const BASE = '/api'

const get = async <T>(url: string): Promise<T> => {
  const res = await fetch(`${BASE}${url}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const post = async <T>(url: string, body: unknown): Promise<T> => {
  const res = await fetch(`${BASE}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const put = async <T>(url: string, body: unknown): Promise<T> => {
  const res = await fetch(`${BASE}${url}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const del = async (url: string) => {
  const res = await fetch(`${BASE}${url}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  // Accounts
  accounts: {
    list: () => get<Account[]>('/accounts'),
    get: (id: string) => get<Account>(`/accounts/${id}`),
    create: (data: Partial<Account>) => post<Account>('/accounts', data),
    update: (id: string, data: Partial<Account>) => put<Account>(`/accounts/${id}`, data),
    delete: (id: string) => del(`/accounts/${id}`),
  },
  // Transactions
  transactions: {
    list: (params?: Record<string, string>) => get<Transaction[]>(`/transactions${params ? '?' + new URLSearchParams(params) : ''}`),
    get: (id: string) => get<Transaction>(`/transactions/${id}`),
    create: (data: Partial<Transaction>) => post<Transaction>('/transactions', data),
    update: (id: string, data: Partial<Transaction>) => put<Transaction>(`/transactions/${id}`, data),
    delete: (id: string) => del(`/transactions/${id}`),
  },
  // Categories
  categories: {
    list: () => get<Category[]>('/categories'),
  },
  // Goals
  goals: {
    list: () => get<Goal[]>('/goals'),
    get: (id: string) => get<Goal>(`/goals/${id}`),
    create: (data: Partial<Goal>) => post<Goal>('/goals', data),
    update: (id: string, data: Partial<Goal>) => put<Goal>(`/goals/${id}`, data),
    forecast: (id: string) => get<GoalForecast>(`/goals/${id}/forecast`),
  },
  // Budgets
  budgets: {
    list: () => get<BudgetPlan[]>('/budgets'),
    get: (id: string) => get<BudgetPlan>(`/budgets/${id}`),
    vsActual: (id: string, category?: string) =>
      get<BudgetVsActual[]>(`/budgets/${id}/vs-actual${category ? `?category=${category}` : ''}`),
  },
  // Analytics
  analytics: {
    cashflow: (month: string) => get<CashflowResponse>(`/analytics/cashflow?month=${month}`),
    cashflowBreakdown: (month: string) => get<CashflowBreakdown>(`/analytics/cashflow-breakdown?month=${month}`),
    spendingByCategory: (months: number) => get<SpendingByCategory[]>(`/analytics/spending-by-category?months=${months}`),
    anomalies: (threshold?: number) => get<AnomaliesResponse>(`/analytics/anomalies${threshold ? `?threshold=${threshold}` : ''}`),
    spendingFlow: (month: string) => get<SpendingFlow>(`/analytics/spending-flow?month=${month}`),
    yearInReview: (year: number) => get<YearInReview>(`/analytics/year-in-review?year=${year}`),
    spendingPatterns: (months: number) => get<SpendingPatternsResponse>(`/analytics/spending-patterns?months=${months}`),
  },
  // Recommendations
  recommendations: {
    savings: () => get<SavingsResponse>('/recommendations/savings'),
    investment: () => get<InvestmentResponse>('/recommendations/investment'),
    budgetAdjustment: (category?: string) =>
      get<BudgetAdjustmentResponse>(`/recommendations/budget-adjustment${category ? `?category=${category}` : ''}`),
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Account {
  id: string; name: string; type: string; balance: number; bank: string; createdAt: string
}

export interface Transaction {
  id: string; date: string; amount: number; description: string
  type: 'expense' | 'income' | 'transfer'; status: string
  accountId?: string; categoryId?: string | null; categoryName?: string | null
  categoryColor?: string | null; merchantName?: string | null
}

export interface Category {
  id: string; name: string; type: string; color: string; budget: number | null; parentId?: string | null
}

export interface Goal {
  id: string; name: string; type: string; targetAmount: number
  currentAmount: number; deadline: string; riskProfile: string; progressPercent?: number
}

export interface GoalForecast {
  goalId: string; targetAmount: number; currentAmount: number; remaining: number
  avgMonthlySavings: number; monthsNeeded: number; estimatedDate: string
  requiredMonthlyAmount: number; onTrack: boolean
}

export interface BudgetPlan {
  id: string; month: string; notes?: string; adherence?: number
}

export interface BudgetVsActual {
  categoryId: string; categoryName: string; color: string
  planned: number; actual: number; remaining: number; percentageUsed: number
}

export interface CashflowResponse {
  month: string
  income: { source: string; amount: number; account: string }[]
  totalIncome: number
  expenses: { category: string; amount: number; percentage: number }[]
  totalExpenses: number; netCashflow: number; savingsRate: number
}

export interface CashflowBreakdown {
  month: string; totalExpenses: number
  categories: { id: string; name: string; color: string; amount: number; percentage: number; subcategories: { id: string; name: string; amount: number }[] }[]
}

export interface SpendingByCategory {
  categoryId: string; categoryName: string; color: string
  thisMonth: number; lastMonth: number; trend: number
}

export interface AnomaliesResponse {
  anomalies: { transaction: Transaction; categoryName: string | null; merchantName: string | null; anomalyScore: number; reasons: string[]; recommendation: string }[]
  threshold: number
}

export interface SpendingFlow {
  month: string
  nodes: { id: string; type: string; label: string; color?: string }[]
  edges: { from: string; to: string; amount: number }[]
}

export interface YearInReview {
  year: string; totalIncome: number; totalExpenses: number; netSavings: number; savingsRate: number
  topExpenseCategories: { category: string; amount: number }[]
  monthlyBreakdown: { month: string; income: number; expenses: number }[]
}

export interface SpendingPatternsResponse {
  months: number
  patterns: { month: string; category: string; total: number; count: number }[]
}

export interface SavingsResponse {
  recommendations: { title: string; currentSpending: number; suggestion: string; potentialSavings: number; priority: string; services?: { name: string; amount: number }[] }[]
  totalPotentialSavings: number
}

export interface InvestmentResponse {
  estimatedFreeCash: number
  recommendations: { asset: string; expectedReturn: string; risk: string; reason: string }[]
}

export interface BudgetAdjustmentResponse {
  suggestions: { categoryId: string; categoryName: string; currentBudget: number; avgSpending: number; recommendedBudget: number; difference: number; reason: string }[]
}
