"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Building2,
  ChevronLeft,
  Crown,
  Database,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, getRoleDisplayName } from "@/lib/auth";
import { useAdminPanelMetadata } from "@/lib/hooks/use-admin-panel";
import { cn } from "@/lib/utils";

type SuperAdminSidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: "entities" | "profiles";
  alwaysVisible?: boolean;
};

const sidebarItems: SuperAdminSidebarItem[] = [
  { name: "Overview", href: "/super-admin", icon: LayoutDashboard, alwaysVisible: true },
  {
    name: "Control Center",
    href: "/super-admin/control-center",
    icon: Database,
    badgeKey: "entities",
    alwaysVisible: true,
  },
  {
    name: "User Governance",
    href: "/super-admin/users",
    icon: UserCog,
    badgeKey: "profiles",
    alwaysVisible: true,
  },
  {
    name: "Global Settings",
    href: "/super-admin/settings",
    icon: Settings,
    alwaysVisible: true,
  },
  {
    name: "Admin Panel",
    href: "/admin",
    icon: Building2,
    alwaysVisible: true,
  },
];

function SidebarContent({ pathname }: { pathname: string }) {
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { data: metadata, loading: metadataLoading } = useAdminPanelMetadata();

  const profileCount = useMemo(() => {
    const profileEntity = metadata?.entities.find((entity) => entity.key === "profiles");
    return typeof profileEntity?.count === "number" ? profileEntity.count : null;
  }, [metadata?.entities]);

  function getBadgeValue(item: SuperAdminSidebarItem) {
    if (item.badgeKey === "entities") {
      return metadata?.entities.length ?? null;
    }

    if (item.badgeKey === "profiles") {
      return profileCount;
    }

    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Crown className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg">Super Admin</span>
              <span className="text-xs text-sidebar-foreground/60">
                Platform governance
              </span>
            </div>
          </div>
          {metadataLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/60" />
          ) : (
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              Elevated
            </Badge>
          )}
        </div>
        {metadata ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge
              variant="outline"
              className="border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/80"
            >
              {metadata.entities.length} surfaces
            </Badge>
            <Badge
              variant="outline"
              className="border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/80"
            >
              {Object.values(metadata.moduleSettings).filter(Boolean).length} modules
            </Badge>
          </div>
        ) : null}
      </div>

      {profile ? (
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {profile.full_name || profile.email}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300"
            >
              {getRoleDisplayName(profile.role)}
            </Badge>
          </div>
        </div>
      ) : null}

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/super-admin" && pathname.startsWith(item.href));
            const badgeValue = getBadgeValue(item);

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
                {typeof badgeValue === "number" ? (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 bg-amber-500/15 px-1.5 text-xs text-amber-700 dark:text-amber-300"
                  >
                    {badgeValue}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="space-y-2 border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Site
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute requiredRoles={["super_admin"]}>
      <div className="flex min-h-screen bg-background">
        <aside className="fixed inset-y-0 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
          <SidebarContent pathname={pathname} />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-64 bg-sidebar p-0 text-sidebar-foreground"
          >
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>

        <div className="flex-1 lg:pl-64">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
            </Sheet>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold">MosqueConnect Super Admin</span>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden">
            <div className="min-h-[calc(100vh-4rem)] lg:min-h-screen">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
