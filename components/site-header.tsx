"use client"

import Link from "next/link"
import { ShoppingBag, User, LogOut, Home, ScanLine, Award } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { User as SupabaseUser, UserResponse, AuthChangeEvent, Session } from "@supabase/supabase-js"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Manejo de scroll para efecto glassmorphism
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)

    // Auth state management
    const supabase = createClient()
    if (!supabase) return

    supabase.auth.getUser().then((response: UserResponse) => {
      if (response.data?.user) setUser(response.data.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
    })

    return () => {
      window.removeEventListener("scroll", handleScroll)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    router.push("/")
    router.refresh()
  }

  const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/scan", label: "Escanear", icon: ScanLine },
    { href: "/profile", label: "Perfil", icon: Award },
  ]

  return (
    <>
      <header className={`glass-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container header">
          {/* Logo Section */}
          <Link href="/" className="logo">
            <ShoppingBag size={24} color="var(--primary)" />
            <span>EcoCupon</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "nav-link flex items-center gap-2",
                    isActive && "text-primary font-semibold"
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User Actions */}
          <div className="user-actions">
            {user ? (
              <div className="user-menu" tabIndex={0}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{user.email?.split("@")[0]}</span>
                </div>

                <div className="user-dropdown">
                  <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
                    {user.email}
                  </div>
                  <button onClick={handleSignOut} className="dropdown-item danger">
                    <LogOut size={16} />
                    Salir
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className="btn btn-primary">
                <User size={16} style={{ marginRight: '8px' }} />
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
        <div className="grid grid-cols-3 h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon size={20} />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
