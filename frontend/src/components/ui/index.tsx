import { cn } from '@/lib/utils'

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('rounded-xl border bg-white shadow-sm', className)}>{children}</div>
)
export const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('p-6 pb-3', className)}>{children}</div>
)
export const CardTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <h3 className={cn('text-sm font-medium text-gray-500', className)}>{children}</h3>
)
export const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('p-6 pt-0', className)}>{children}</div>
)

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeVariants = {
  default: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  muted: 'bg-gray-100 text-gray-600',
}

export const Badge = ({ variant = 'default', children, className }: { variant?: keyof typeof badgeVariants; children: React.ReactNode; className?: string }) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeVariants[variant], className)}>
    {children}
  </span>
)

// ─── Button ───────────────────────────────────────────────────────────────────
const btnVariants = {
  default: 'bg-blue-600 text-white hover:bg-blue-700',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export const Button = ({ variant = 'default', className, children, onClick, disabled, size = 'md' }: {
  variant?: keyof typeof btnVariants; className?: string; children: React.ReactNode
  onClick?: () => void; disabled?: boolean; size?: 'sm' | 'md'
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'inline-flex items-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50',
      size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
      btnVariants[variant], className
    )}
  >
    {children}
  </button>
)

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner = ({ className }: { className?: string }) => (
  <div className={cn('h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600', className)} />
)

export const LoadingState = ({ text = 'Načítání...' }: { text?: string }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
    <Spinner /> <span>{text}</span>
  </div>
)

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center gap-3 py-16 text-red-500">
    <p>{message}</p>
    {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Zkusit znovu</Button>}
  </div>
)

// ─── Progress ─────────────────────────────────────────────────────────────────
export const Progress = ({ value, className, color = 'bg-blue-500' }: { value: number; className?: string; color?: string }) => (
  <div className={cn('h-2 w-full rounded-full bg-gray-100', className)}>
    <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(value, 100)}%` }} />
  </div>
)

// ─── Stat card ────────────────────────────────────────────────────────────────
export const StatCard = ({ title, value, sub, icon, color = 'text-blue-600', bg = 'bg-blue-50' }: {
  title: string; value: string; sub?: string; icon: React.ReactNode; color?: string; bg?: string
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5', bg, color)}>{icon}</div>
      </div>
    </CardContent>
  </Card>
)
