import { cn } from '@/lib/utils'
import { AlertTriangle, Info, XCircle, CheckCircle, X } from 'lucide-react'

type AlertSeverity = 'critical' | 'warning' | 'info' | 'success'

interface AlertBannerProps {
  severity: AlertSeverity
  title: string
  message?: string
  onDismiss?: () => void
  action?: { label: string; onClick: () => void }
  className?: string
}

const config: Record<AlertSeverity, {
  border: string
  bg: string
  icon: React.ElementType
  iconColor: string
  titleColor: string
}> = {
  critical: {
    border: 'border-red-400/30',
    bg: 'bg-red-400/5',
    icon: XCircle,
    iconColor: 'text-red-400',
    titleColor: 'text-red-400',
  },
  warning: {
    border: 'border-amber-400/30',
    bg: 'bg-amber-400/5',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-400',
  },
  info: {
    border: 'border-[#b8935a]/30',
    bg: 'bg-[#b8935a]/5',
    icon: Info,
    iconColor: 'text-[#b8935a]',
    titleColor: 'text-[#b8935a]',
  },
  success: {
    border: 'border-green-400/30',
    bg: 'bg-green-400/5',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    titleColor: 'text-green-400',
  },
}

export function AlertBanner({ severity, title, message, onDismiss, action, className }: AlertBannerProps) {
  const { border, bg, icon: Icon, iconColor, titleColor } = config[severity]

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border p-3',
      border, bg, className
    )}>
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor)} />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', titleColor)}>{title}</p>
        {message && <p className="text-xs text-[#444] mt-0.5">{message}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className={cn('text-xs underline mt-1 hover:no-underline', titleColor)}
          >
            {action.label}
          </button>
        )}
      </div>

      {onDismiss && (
        <button onClick={onDismiss} className="text-[#444] hover:text-[#e8ddd0] shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
