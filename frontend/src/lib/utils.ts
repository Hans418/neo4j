import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatCZK = (amount: number) =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount)

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))

export const formatPercent = (value: number) => `${value.toFixed(1)} %`
