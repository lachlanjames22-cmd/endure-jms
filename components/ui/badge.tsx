import { cn } from '@/lib/utils'

type BadgeVariant = 'green' | 'amber' | 'red' | 'gold' | 'muted' | 'outline'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  green:   'bg-green-400/10 text-green-400 border border-green-400/20',
  amber:   'bg-amber-400/10 text-amber-400 border border-amber-400/20',
  red:     'bg-red-400/10 text-red-400 border border-red-400/20',
  gold:    'bg-[#b8935a]/10 text-[#b8935a] border border-[#b8935a]/20',
  muted:   'bg-[#161616] text-[#444] border border-[#161616]',
  outline: 'bg-transparent text-[#e8ddd0] border border-[#222]',
}

export function Badge({ children, variant = 'muted', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
