// ─── Entity typy ───────────────────────────────────────────────────────────

export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment' | 'crypto'
  balance: number
  bank: string
  createdAt: string
}

export interface Card {
  id: string
  name: string
  type: 'credit' | 'debit'
  lastDigits: string
  limit: number | null
  linkedAccount: string
}

export interface Category {
  id: string
  name: string
  type: 'expense' | 'income'
  color: string
  budget: number | null
}

export interface Transaction {
  id: string
  date: string
  amount: number
  description: string
  type: 'expense' | 'income' | 'transfer'
  status: 'pending' | 'completed' | 'failed'
  metadata?: string
}

export interface Goal {
  id: string
  name: string
  type: 'savings' | 'investment' | 'debt_payoff'
  targetAmount: number
  currentAmount: number
  deadline: string
  riskProfile: 'low' | 'medium' | 'high'
}

export interface BudgetPlan {
  id: string
  month: string
  notes?: string
}

// ─── API response typy ─────────────────────────────────────────────────────

export interface TransactionWithMeta extends Transaction {
  accountId: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  merchantName: string | null
}

export interface CashflowResponse {
  month: string
  income: { source: string; amount: number; account: string }[]
  totalIncome: number
  expenses: { category: string; amount: number; percentage: number }[]
  totalExpenses: number
  netCashflow: number
  savingsRate: number
}

export interface AnomalyResponse {
  transaction: Transaction
  categoryName: string | null
  merchantName: string | null
  anomalyScore: number
  reasons: string[]
  recommendation: string
}

export interface SpendingFlowNode {
  id: string
  type: 'income' | 'account' | 'category'
  label: string
  color?: string
}

export interface SpendingFlowEdge {
  from: string
  to: string
  amount: number
}

export interface GoalForecast {
  goalId: string
  targetAmount: number
  currentAmount: number
  remaining: number
  avgMonthlySavings: number
  monthsNeeded: number
  estimatedDate: string
  requiredMonthlyAmount: number
  onTrack: boolean
}

export interface BudgetVsActual {
  categoryId: string
  categoryName: string
  color: string
  planned: number
  actual: number
  remaining: number
  percentageUsed: number
}
