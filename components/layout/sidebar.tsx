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
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/lib/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, roles: ['owner', 'ops', 'finance'] },
  { href: '/sales',     label: 'Sales',       icon: FileText,        roles: ['owner', 'ops'] },
  { href: '/ops',       label: 'Ops',         icon: Wrench,          roles: ['owner', 'ops'] },
  { href: '/finance',   label: 'Finance',     icon: DollarSign,      roles: ['owner', 'finance'] },
  { href: '/hr',        label: 'Team',        icon: Users,           roles: ['owner'] },
  { href: '/marketing', label: 'Marketing',   icon: Megaphone,       roles: ['owner'] },
  { href: '/jarvis',     label: 'Jarvis',      icon: Bot,          roles: ['owner', 'ops', 'finance'] },
  { href: '/ceo',        label: 'CEO',         icon: TrendingUp,   roles: ['owner'] },
  { href: '/compliance', label: 'Compliance',  icon: ShieldCheck,  roles: ['owner'] },
  { href: '/settings',   label: 'Settings',    icon: Settings,     roles: ['owner'] },
]

interface SidebarProps {
  role: UserRole
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const visibleItems = navItems.filter(item => item.roles.includes(role))

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
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
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                'justify-center lg:justify-start',
                'border-r-2',
                active
                  ? 'bg-[#b8935a]/10 text-[#b8935a] border-r-[#b8935a]'
                  : 'text-[#444] hover:bg-[#111] hover:text-[#e8ddd0] border-r-transparent'
              )}
              title={label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </Link>
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
