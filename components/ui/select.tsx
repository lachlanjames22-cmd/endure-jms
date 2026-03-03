import { cn } from '@/lib/utils'
import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs text-[#444] uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'h-9 w-full rounded-md border border-[#222] bg-[#111] px-3 text-sm text-[#e8ddd0]',
          'focus:outline-none focus:border-[#b8935a]/50',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          error && 'border-red-400/50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'
