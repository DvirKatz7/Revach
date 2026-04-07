'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/dashboard',             icon: '📊', label: 'דשבורד' },
  { href: '/dashboard/ingredients', icon: '🧅', label: 'מצרכים' },
  { href: '/dashboard/recipes',     icon: '🍽', label: 'מתכונים' },
  { href: '/dashboard/settings',    icon: '⚙️', label: 'הגדרות' },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-100">
        <span className="text-2xl font-bold" style={{ color: '#1D9E75' }}>
          רווח
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: '#E1F5EE', color: '#1D9E75' }
                  : { color: '#6B7280' }
              }
            >
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex flex-row-reverse min-h-screen bg-gray-50">

      {/* ── Desktop sidebar (right side) ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-l border-gray-100 shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (slides in from right) ── */}
      <aside
        className={`fixed top-0 right-0 z-40 h-full w-56 bg-white border-l border-gray-100 transform transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <span className="text-xl font-bold" style={{ color: '#1D9E75' }}>
            רווח
          </span>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="פתח תפריט"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
