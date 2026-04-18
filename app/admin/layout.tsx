"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Building2,
  Calendar,
  ChevronLeft,
  Database,
  DollarSign,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Settings,
  Sun,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { AdminEntitiesResponse, AdminEntityKey } from "@/lib/admin/types";
import { useAuth, getRoleDisplayName } from "@/lib/auth";
import { useAdminPanelMetadata } from "@/lib/hooks/use-admin-panel";
import { cn } from "@/lib/utils";

type AdminSidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  entityKey?: AdminEntityKey;
  entityKeys?: AdminEntityKey[];
  moduleKey?: string;
  superAdminOnly?: boolean;
  alwaysVisible?: boolean;
};

const sidebarItems: AdminSidebarItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, alwaysVisible: true },
  {
    name: "Control Center",
    href: "/admin/control-center",
    icon: Database,
    moduleKey: "adminControlCenter",
    alwaysVisible: true,
  },
  {
    name: "Mosques",
    href: "/admin/mosques",
    icon: Building2,
    entityKey: "mosques",
    moduleKey: "mosques",
  },
  {
    name: "Events",
    href: "/admin/events",
    icon: Calendar,
    entityKey: "events",
    moduleKey: "events",
  },
  {
    name: "Finance",
    href: "/admin/finance",
    icon: DollarSign,
    entityKey: "donations",
    moduleKey: "donations",
  },
  {
    name: "Announcements",
    href: "/admin/announcements",
    icon: Megaphone,
    entityKey: "announcements",
    moduleKey: "announcements",
  },
  {
    name: "Community",
    href: "/admin/community",
    icon: Users,
    entityKeys: ["profiles", "posts"],
    moduleKey: "community",
  },
  {
    name: "User Management",
    href: "/admin/users",
    icon: UserCog,
    entityKey: "profiles",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    alwaysVisible: true,
  },
];

function hasVisibleEntity(
  metadata: AdminEntitiesResponse | null,
  entityKey: AdminEntityKey
): boolean {
  return Boolean(metadata?.entities.some((entity) => entity.key === entityKey));
}

function getSidebarBadgeCount(
  metadata: AdminEntitiesResponse | null,
  item: AdminSidebarItem
): number | null {
  if (!metadata) {
    return null;
  }

  if (item.entityKey) {
    const entity = metadata.entities.find((entry) => entry.key === item.entityKey);
    return typeof entity?.count === "number" ? entity.count : null;
  }

  if (!item.entityKeys?.length) {
    return null;
  }

  const counts = item.entityKeys
    .map((entityKey) => metadata.entities.find((entry) => entry.key === entityKey))
    .map((entity) => entity?.count)
    .filter((count): count is number => typeof count === "number");

  return counts.length > 0 ? counts.reduce((sum, count) => sum + count, 0) : null;
}

function SidebarContent({
  pathname,
  isSuperAdmin,
}: {
  pathname: string;
  isSuperAdmin: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { data: metadata, loading: metadataLoading } = useAdminPanelMetadata();

  const filteredItems = useMemo(
    () =>
      sidebarItems.filter((item) => {
        if (item.superAdminOnly && !isSuperAdmin) {
          return false;
        }

        if (!metadata) {
          return true;
        }

        if (item.moduleKey && metadata.moduleSettings[item.moduleKey] === false) {
          return false;
        }

        if (item.entityKey && !hasVisibleEntity(metadata, item.entityKey)) {
          return false;
        }

        if (
          item.entityKeys &&
          !item.entityKeys.some((entityKey) => hasVisibleEntity(metadata, entityKey))
        ) {
          return false;
        }

        return item.alwaysVisible ?? true;
      }),
    [isSuperAdmin, metadata]
  );

  const enabledModuleCount = Object.values(metadata?.moduleSettings ?? {}).filter(Boolean)
    .length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-sidebar-primary" />
            <div className="flex flex-col">
              <span className="font-semibold text-lg">Admin Panel</span>
              <span className="text-xs text-sidebar-foreground/60">
                Live control plane
              </span>
            </div>
          </div>
          {metadataLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/60" />
          ) : (
            <Badge
              variant="outline"
              className="border-sidebar-primary/30 bg-sidebar-primary/10 text-sidebar-primary"
            >
              Live
            </Badge>
          )}
        </div>
        {metadata && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge
              variant="outline"
              className="border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/80"
            >
              {enabledModuleCount} modules
            </Badge>
            <Badge
              variant="outline"
              className="border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/80"
            >
              {metadata.entities.length} surfaces
            </Badge>
          </div>
        )}
      </div>

      {profile && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {profile.full_name || profile.email}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-sidebar-primary/30 bg-sidebar-primary/20 text-xs text-sidebar-primary"
            >
              {getRoleDisplayName(profile.role)}
            </Badge>
            {metadata?.realtimeFeed ? (
              <span className="text-xs text-sidebar-foreground/60">
                Feed: {metadata.realtimeFeed}
              </span>
            ) : null}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const badgeCount = getSidebarBadgeCount(metadata, item);

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
                {badgeCount != null && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 bg-sidebar-primary/15 px-1.5 text-xs text-sidebar-primary"
                  >
                    {badgeCount}
                  </Badge>
                )}
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSuperAdmin } = useAuth();

  return (
    <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
      <div className="flex min-h-screen bg-background">
        <aside className="fixed inset-y-0 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
          <SidebarContent pathname={pathname} isSuperAdmin={isSuperAdmin} />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-64 bg-sidebar p-0 text-sidebar-foreground"
          >
            <SidebarContent pathname={pathname} isSuperAdmin={isSuperAdmin} />
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
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">MosqueConnect Admin</span>
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
