'use client'

import { cn, trafficLightClass, type TrafficLight } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  traffic?: TrafficLight
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function MetricCard({
  label,
  value,
  sub,
  traffic,
  trend,
  trendLabel,
  className,
  size = 'md',
  onClick,
}: MetricCardProps) {
  const trafficDot = traffic ? {
    green: 'bg-green-400',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
  }[traffic] : null

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up'
    ? 'text-green-400'
    : trend === 'down'
    ? 'text-red-400'
    : 'text-[#444]'

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-[#0c0c0c] p-4 transition-colors',
        traffic === 'green' && 'border-green-400/40 shadow-[0_0_14px_rgba(74,222,128,0.12)]',
        traffic === 'amber' && 'border-amber-400/40 shadow-[0_0_14px_rgba(251,191,36,0.12)]',
        traffic === 'red'   && 'border-red-400/40 shadow-[0_0_14px_rgba(248,113,113,0.18)]',
        !traffic && 'border-[#161616]',
        onClick && 'cursor-pointer hover:bg-[#111]',
        className
      )}
      onClick={onClick}
    >
      {/* Traffic light dot */}
      {trafficDot && (
        <span
          className={cn('absolute top-3 right-3 h-2 w-2 rounded-full', trafficDot)}
        />
      )}

      <p className="text-xs text-[#444] uppercase tracking-wider mb-1">{label}</p>

      <p className={cn(
        'font-mono font-semibold',
        traffic ? trafficLightClass(traffic) : 'text-[#e8ddd0]',
        size === 'lg' && 'text-3xl',
        size === 'md' && 'text-2xl',
        size === 'sm' && 'text-lg',
      )}>
        {value}
      </p>

      {sub && (
        <p className="text-xs text-[#444] mt-1">{sub}</p>
      )}

      {trend && trendLabel && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs', trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  )
}
