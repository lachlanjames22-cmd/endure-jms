import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary:   'bg-[#b8935a] text-[#080808] font-semibold hover:bg-[#c9a46a] active:bg-[#a07848]',
  secondary: 'bg-[#111] text-[#e8ddd0] border border-[#222] hover:bg-[#161616] hover:border-[#333]',
  ghost:     'bg-transparent text-[#e8ddd0] hover:bg-[#111] hover:text-[#e8ddd0]',
  danger:    'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20',
  gold:      'bg-transparent text-[#b8935a] border border-[#b8935a]/30 hover:bg-[#b8935a]/10',
}

const sizes: Record<ButtonSize, string> = {
  sm:  'h-7 px-2.5 text-xs rounded',
  md:  'h-9 px-4 text-sm rounded-md',
  lg:  'h-11 px-6 text-base rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8935a]/50',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
