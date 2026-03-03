import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Traffic light system ──────────────────────────────────────────────────────

export type TrafficLight = 'green' | 'amber' | 'red'

export function gpTrafficLight(gp: number): TrafficLight {
  if (gp >= 0.45) return 'green'
  if (gp >= 0.36) return 'amber'
  return 'red'
}

export function cashTrafficLight(balance: number): TrafficLight {
  if (balance >= 20000) return 'green'
  if (balance >= 10000) return 'amber'
  return 'red'
}

export function revenuePerHourTrafficLight(rph: number): TrafficLight {
  if (rph >= 100) return 'green'
  if (rph >= 80) return 'amber'
  return 'red'
}

export function winRateTrafficLight(rate: number): TrafficLight {
  if (rate >= 0.40) return 'green'
  if (rate >= 0.30) return 'amber'
  return 'red'
}

export function sentimentTrafficLight(score: number): TrafficLight {
  if (score >= 7) return 'green'
  if (score >= 5) return 'amber'
  return 'red'
}

export function trafficLightColor(light: TrafficLight): string {
  return {
    green: '#4ade80',
    amber: '#fbbf24',
    red: '#f87171',
  }[light]
}

export function trafficLightClass(light: TrafficLight): string {
  return {
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }[light]
}

export function trafficLightBgClass(light: TrafficLight): string {
  return {
    green: 'bg-green-400/10 border-green-400/20',
    amber: 'bg-amber-400/10 border-amber-400/20',
    red: 'bg-red-400/10 border-red-400/20',
  }[light]
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatCurrency(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  })
}

export function daysSince(date: string | null | undefined): number | null {
  if (!date) return null
  const diff = Date.now() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
