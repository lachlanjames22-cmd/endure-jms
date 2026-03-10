'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Wrench,
  DollarSign,
  Users,
  Megaphone,
  Bot,
  Settings,
  LogOut,
  CalendarDays,
  Calculator,
  ClipboardList,
  Dna,
  ChevronRight,
  TrendingUp,
  Crown,
  Target,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import type { UserRole } from '@/lib/types/database'

interface NavChild {
  href: string
  label: string
  icon: React.ElementType
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
  children?: NavChild[]
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['owner', 'ops', 'finance'],
  },
  {
    href: '/ops',
    label: 'Ops',
    icon: Wrench,
    roles: ['owner', 'ops'],
    children: [
      { href: '/ops',          label: 'Overview',    icon: Wrench       },
      { href: '/planner',      label: 'Planner',     icon: CalendarDays },
      { href: '/job-costing',  label: 'Job Costing', icon: ClipboardList },
      { href: '/job-dna',      label: 'Job DNA',     icon: Dna          },
    ],
  },
  {
    href: '/finance',
    label: 'Finance',
    icon: DollarSign,
    roles: ['owner', 'finance'],
    children: [
      { href: '/finance',  label: 'Overview',        icon: DollarSign },
      { href: '/quote',    label: 'Business Engine', icon: Calculator  },
      { href: '/cashflow', label: 'Cashflow',        icon: TrendingUp  },
      { href: '/profit-first', label: 'Profit First', icon: Target    },
    ],
  },
  {
    href: '/hr',
    label: 'Team',
    icon: Users,
    roles: ['owner'],
    children: [
      { href: '/hr',   label: 'Overview', icon: Users    },
      { href: '/crew', label: 'Crew Portal', icon: Users },
    ],
  },
  {
    href: '/ceo',
    label: 'CEO',
    icon: Crown,
    roles: ['owner'],
    children: [
      { href: '/ceo',       label: 'Overview',    icon: Crown       },
      { href: '/goals',     label: 'CEO Goals',   icon: Target      },
      { href: '/job-dna',   label: 'Job DNA',     icon: Dna         },
    ],
  },
  {
    href: '/sales',
    label: 'Sales',
    icon: FileText,
    roles: ['owner', 'ops'],
  },
  {
    href: '/marketing',
    label: 'Marketing',
    icon: Megaphone,
    roles: ['owner'],
  },
  {
    href: '/jarvis',
    label: 'Jarvis',
    icon: Bot,
    roles: ['owner', 'ops', 'finance'],
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['owner'],
  },
]

interface SidebarProps {
  role: UserRole
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleItems = navItems.filter(item => item.roles.includes(role))

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleMouseEnter(href: string, hasChildren: boolean) {
    if (!hasChildren) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenGroup(href)
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpenGroup(null), 200)
  }

  function handleDropdownMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  return (
    <aside className="flex h-screen w-14 flex-col items-center border-r border-[#161616] bg-[#080808] py-4 lg:w-48 lg:items-start lg:px-3">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2 px-1 lg:px-0">
        <div className="h-7 w-7 rounded bg-[#b8935a] flex items-center justify-center shrink-0">
          <span className="text-[#080808] text-xs font-bold">E</span>
        </div>
        <span className="hidden lg:block text-sm font-medium text-[#e8ddd0] font-['Georgia',serif]">
          Endure OS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 w-full">
        {visibleItems.map(({ href, label, icon: Icon, children }) => {
          const hasChildren = !!children?.length
          const isGroupActive = hasChildren
            ? children!.some(c => pathname.startsWith(c.href))
            : pathname.startsWith(href)
          const isOpen = openGroup === href

          return (
            <div
              key={href}
              className="relative"
              onMouseEnter={() => handleMouseEnter(href, hasChildren)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Main item */}
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors w-full',
                  'justify-center lg:justify-start',
                  isGroupActive
                    ? 'bg-[#b8935a]/10 text-[#b8935a]'
                    : 'text-[#444] hover:bg-[#111] hover:text-[#e8ddd0]'
                )}
                title={label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden lg:block flex-1">{label}</span>
                {hasChildren && (
                  <ChevronRight
                    className={cn(
                      'hidden lg:block h-3 w-3 shrink-0 transition-transform duration-150',
                      isOpen ? 'rotate-90' : ''
                    )}
                  />
                )}
              </Link>

              {/* Dropdown — inline on lg, flyout on mobile */}
              {hasChildren && isOpen && (
                <>
                  {/* lg: inline expand below */}
                  <div
                    className="hidden lg:block overflow-hidden"
                    onMouseEnter={handleDropdownMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="ml-3 mt-0.5 border-l border-[#222] pl-3 flex flex-col gap-0.5 pb-1">
                      {children!.map(child => {
                        const childActive = pathname.startsWith(child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors',
                              childActive
                                ? 'text-[#b8935a]'
                                : 'text-[#3a3a3a] hover:text-[#e8ddd0]'
                            )}
                          >
                            <child.icon className="h-3 w-3 shrink-0" />
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>

                  {/* mobile: floating panel to the right */}
                  <div
                    className="lg:hidden absolute left-full top-0 z-50 ml-2 w-44 rounded-md border border-[#222] bg-[#0c0c0f] py-1 shadow-xl"
                    onMouseEnter={handleDropdownMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="px-3 py-1.5 mb-1 border-b border-[#1a1a20]">
                      <span className="text-[10px] font-medium text-[#b8935a] uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>{label}</span>
                    </div>
                    {children!.map(child => {
                      const childActive = pathname.startsWith(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                            childActive
                              ? 'text-[#b8935a]'
                              : 'text-[#555] hover:text-[#e8ddd0] hover:bg-[#111]'
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5 shrink-0" />
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </nav>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-[#444] hover:bg-[#111] hover:text-red-400 transition-colors justify-center lg:justify-start w-full"
        title="Sign out"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span className="hidden lg:block">Sign out</span>
      </button>
    </aside>
  )
}
