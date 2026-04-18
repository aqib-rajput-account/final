"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Moon, 
  Sun, 
  Menu, 
  X, 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  LayoutDashboard,
  Building2,
  Shield,
  Rss,
  LogIn,
  LogOut,
  User,
  Settings,
  MessageSquare,
  ChevronDown,
  PanelTop,
  Crown
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Home', href: '/', icon: Building2 },
  { name: 'Mosques', href: '/mosques', icon: MapPin },
  { name: 'Feed', href: '/feed', icon: Rss, requiresAuth: true },
  { name: 'Messages', href: '/messages', icon: MessageSquare, requiresAuth: true },
  { name: 'Prayer Times', href: '/prayer-times', icon: Clock },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Community', href: '/community', icon: Users },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { setTheme } = useTheme()
  const { profile, signOut, loading, isAdmin, isShura, isSignedIn, resolvedRole, isSuperAdmin } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const canAccessAdminPanel = resolvedRole === 'admin' || resolvedRole === 'super_admin'
  const canAccessSuperAdminPanel = isSuperAdmin
  const canAccessShuraPanel = isShura

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/" className="flex items-center gap-2 group transition-all active:scale-95">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-all">
              <MosqueIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Mosque<span className="text-primary">Connect</span>
            </span>
          </Link>

          <div className="hidden lg:flex lg:items-center lg:gap-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              // Hide auth-required links for unauthenticated users
              if (item.requiresAuth && !isSignedIn) return null
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all",
                    isActive 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-y-[-1px]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Role-based navigation */}
          {mounted && isSignedIn && (canAccessShuraPanel || canAccessAdminPanel || canAccessSuperAdminPanel) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:inline-flex gap-2 rounded-xl border-border/60">
                  <PanelTop className="h-4 w-4" />
                  Manage
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/60">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Panel
                </div>
                {canAccessSuperAdminPanel && (
                  <DropdownMenuItem asChild className="rounded-lg my-0.5">
                    <Link href="/super-admin" className="flex items-center cursor-pointer">
                      <Crown className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Super Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                {canAccessAdminPanel && (
                  <DropdownMenuItem asChild className="rounded-lg my-0.5">
                    <Link href="/admin" className="flex items-center cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                {canAccessShuraPanel && (
                  <DropdownMenuItem asChild className="rounded-lg my-0.5">
                    <Link href="/shura" className="flex items-center cursor-pointer">
                      <Shield className="mr-2 h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Shura Panel
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!mounted ? (
            <div className="h-9 w-9" /> // Placeholder to prevent layout shift
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted/80">
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-border/60">
                <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-lg">
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-lg">
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-lg">
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Auth section */}
          {!loading && (
            <>
              {isSignedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                        <AvatarFallback className="text-xs bg-primary/5 text-primary font-bold">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-2xl border-border/60 p-2 shadow-xl">
                    <div className="px-3 py-3 mb-1 bg-muted/30 rounded-xl">
                      <p className="text-sm font-bold truncate">{profile?.full_name || 'User'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5 opacity-70">
                        {resolvedRole || profile?.role || 'Member'} Role
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1.5 opacity-80">{profile?.email || 'Guest access'}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-border/40" />
                    <DropdownMenuItem asChild className="rounded-lg my-0.5">
                      <Link href="/profile" className="flex items-center cursor-pointer">
                        <User className="mr-3 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg my-0.5">
                      <Link href="/messages" className="flex items-center cursor-pointer md:hidden">
                        <MessageSquare className="mr-3 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">My Messages</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg my-0.5">
                      <Link href="/settings" className="flex items-center cursor-pointer">
                        <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/40" />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg font-bold">
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex sm:gap-2">
                  <Link href="/sign-in">
                    <Button variant="ghost" size="sm" className="rounded-xl font-medium px-4">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button size="sm" className="rounded-xl font-bold px-5 shadow-lg shadow-primary/20">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl active:bg-muted transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5 px-4 pb-6 pt-2 bg-background border-b border-border/40 shadow-2xl">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              if (item.requiresAuth && !isSignedIn) return null
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-3 text-base font-semibold transition-all active:scale-95",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-primary/70")} />
                  {item.name}
                </Link>
              )
            })}
            
            <div className="my-4 border-t border-border/40" />

            {isSignedIn && (canAccessShuraPanel || canAccessAdminPanel || canAccessSuperAdminPanel) && (
              <div className="space-y-1.5 mb-4">
                <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">Management</p>
                {canAccessSuperAdminPanel && (
                  <Link
                    href="/super-admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 text-base font-semibold text-amber-700 bg-amber-50/80 dark:bg-amber-950/30 dark:text-amber-300 active:scale-95 transition-all"
                  >
                    <Crown className="h-5 w-5" />
                    Super Admin Panel
                  </Link>
                )}
                {canAccessShuraPanel && (
                  <Link
                    href="/shura"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 text-base font-semibold text-teal-600 bg-teal-50/50 dark:bg-teal-950/30 active:scale-95 transition-all"
                  >
                    <Shield className="h-5 w-5" />
                    Shura Panel
                  </Link>
                )}
                {canAccessAdminPanel && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 text-base font-semibold text-primary bg-primary/5 active:scale-95 transition-all"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Admin Panel
                  </Link>
                )}
              </div>
            )}

            <div className="space-y-2">
              {isSignedIn ? (
                <button
                  onClick={() => {
                    handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-base font-bold text-destructive bg-destructive/5 active:scale-95 transition-all border border-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-muted-foreground bg-muted hover:bg-muted/80 active:scale-95 transition-all"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-primary-foreground bg-primary shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    <User className="h-4 w-4" />
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function MosqueIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3c-1.5 2-3 3.5-3 5.5a3 3 0 1 0 6 0c0-2-1.5-3.5-3-5.5z" />
      <path d="M4 21V10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
      <path d="M3 21h18" />
      <path d="M4 10l8-6 8 6" />
    </svg>
  )
}
