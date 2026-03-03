import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs text-[#444] uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-md border border-[#222] bg-[#111] px-3 text-sm text-[#e8ddd0]',
          'placeholder:text-[#333]',
          'focus:outline-none focus:border-[#b8935a]/50 focus:ring-1 focus:ring-[#b8935a]/20',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          error && 'border-red-400/50',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-[#444]">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
