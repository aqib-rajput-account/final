"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  ClipboardCheck,
  FileText,
  UserPlus,
  Star,
  Settings,
  Menu,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  Shield,
  Mic,
  BarChart3,
} from "lucide-react"
import { useTheme } from "next-themes"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth"
import { getRoleDisplayName } from "@/lib/auth"

const sidebarItems = [
  { name: "Dashboard", href: "/shura", icon: LayoutDashboard },
  { name: "Mosque Visits", href: "/shura/visits", icon: ClipboardCheck, badge: "3" },
  { name: "Meetings", href: "/shura/meetings", icon: Calendar, badge: "2" },
  { name: "Lectures", href: "/shura/lectures", icon: Mic },
  { name: "Registrations", href: "/shura/registrations", icon: FileText, badge: "4" },
  { name: "Assessments", href: "/shura/assessments", icon: Star },
  { name: "Imam Appointments", href: "/shura/imam-appointments", icon: UserPlus, badge: "2" },
  { name: "Shura Members", href: "/shura/members", icon: Users },
  { name: "Mosques", href: "/shura/mosques", icon: Building2 },
  { name: "Reports", href: "/shura/reports", icon: BarChart3 },
  { name: "Settings", href: "/shura/settings", icon: Settings },
]

function SidebarContent({ pathname }: { pathname: string }) {
  const { theme, setTheme } = useTheme()
  const { profile, signOut } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/20">
          <Shield className="h-5 w-5 text-sidebar-primary" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Shura Council</span>
          <span className="text-xs text-sidebar-foreground/60">Management Panel</span>
        </div>
      </div>

      {/* User info */}
      {profile && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name || profile.email}</p>
          <Badge variant="outline" className="mt-1 text-xs bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/30">
            {getRoleDisplayName(profile.role)}
          </Badge>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/shura" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </span>
                {item.badge && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs bg-sidebar-primary/20 text-sidebar-primary">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Site
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

export default function ShuraLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute requiredRoles={["shura", "admin", "super_admin"]}>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar text-sidebar-foreground">
          <SidebarContent pathname={pathname} />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 lg:pl-64">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:hidden">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
            </Sheet>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">Shura Council Panel</span>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden">
            <div className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

