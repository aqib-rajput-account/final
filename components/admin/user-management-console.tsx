"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Search,
  Shield,
  UserCheck,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminListResponse, AdminLookupOption } from "@/lib/admin/types";
import { useAuth, type UserRole, getManageableRoles, getRoleBadgeVariant, getRoleDisplayName } from "@/lib/auth";
import type { Profile } from "@/lib/database.types";
import { useAdminPanelMetadata } from "@/lib/hooks/use-admin-panel";
import { useRealtimeGateway } from "@/lib/hooks/use-realtime-gateway";

const ITEMS_PER_PAGE = 10;
const ALL_FILTER_VALUE = "all";

interface UserManagementConsoleProps {
  title?: string;
  description?: string;
  primaryActionHref?: string;
  primaryActionLabel?: string;
}

function getInitials(name: string | null, email: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "??";
}

function getLookupLabel(
  lookups: Record<string, AdminLookupOption[]>,
  lookupKey: string,
  value: string | null
) {
  if (!value) {
    return "-";
  }

  const option = lookups[lookupKey]?.find((entry) => entry.value === value);
  return option?.label ?? value;
}

export function UserManagementConsole({
  title = "User Management",
  description = "Search profiles, manage roles, and handle account state through the shared admin APIs instead of direct browser writes.",
  primaryActionHref = "/admin/community",
  primaryActionLabel = "Open Community Control",
}: UserManagementConsoleProps) {
  const { profile: currentUser } = useAuth();
  const { data: metadata, loading: metadataLoading, refresh: refreshMetadata } =
    useAdminPanelMetadata();
  const [users, setUsers] = useState<Profile[]>([]);
  const [lookups, setLookups] = useState<Record<string, AdminLookupOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | typeof ALL_FILTER_VALUE>(
    ALL_FILTER_VALUE
  );
  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | typeof ALL_FILTER_VALUE
  >(ALL_FILTER_VALUE);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole | "">("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [realtimeIssue, setRealtimeIssue] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchQuery);
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const manageableRoles = currentUser ? getManageableRoles(currentUser.role) : [];
  const profileEntity = metadata?.entities.find((entity) => entity.key === "profiles");
  const canEditProfiles = Boolean(profileEntity?.capability.update);
  const hasProfilesAccess = Boolean(profileEntity?.capability.read);
  const activeUsersOnPage = users.filter((user) => user.is_active).length;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, roleFilter, statusFilter]);

  useEffect(() => {
    if (!hasProfilesAccess && !metadataLoading) {
      setUsers([]);
      setLookups({});
      setTotalCount(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchUsers() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(ITEMS_PER_PAGE),
          offset: String((page - 1) * ITEMS_PER_PAGE),
        });

        if (deferredSearch.trim()) {
          params.set("search", deferredSearch.trim());
        }

        if (roleFilter !== ALL_FILTER_VALUE) {
          params.set("role", roleFilter);
        }

        if (statusFilter !== ALL_FILTER_VALUE) {
          params.set("is_active", statusFilter === "active" ? "true" : "false");
        }

        const response = await fetch(`/api/admin/entities/profiles?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as
          | AdminListResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            ("error" in payload ? payload.error : undefined) ||
              "Failed to load users"
          );
        }

        if (!cancelled) {
          const listPayload = payload as AdminListResponse;
          setUsers(listPayload.items as unknown as Profile[]);
          setLookups(listPayload.lookups);
          setTotalCount(listPayload.total);
          setRealtimeIssue((current) =>
            current?.includes("Failed to catch up") ? null : current
          );
        }
      } catch (error) {
        if (!cancelled) {
          setUsers([]);
          setLookups({});
          setTotalCount(0);
          toast.error(error instanceof Error ? error.message : "Failed to load users");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchUsers();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, hasProfilesAccess, metadataLoading, page, refreshTick, roleFilter, statusFilter]);

  useRealtimeGateway({
    enabled: Boolean(metadata?.realtimeFeed),
    feedStreamId: metadata?.realtimeFeed,
    onEvent: (event) => {
      if (event.entityType !== "profiles" && event.entityType !== "settings") {
        return;
      }

      setRealtimeIssue(null);
      startTransition(() => {
        refreshMetadata();
        setRefreshTick((current) => current + 1);
      });
    },
    onError: (error) => {
      setRealtimeIssue(error.message);
    },
  });

  function refreshUsers() {
    startTransition(() => {
      refreshMetadata();
      setRefreshTick((current) => current + 1);
    });
  }

  function canManageTarget(user: Profile) {
    if (!currentUser) return false;
    if (user.id === currentUser.id) return false;

    if (currentUser.role === "super_admin") {
      return true;
    }

    if (currentUser.role === "admin") {
      return user.role !== "admin" && user.role !== "super_admin";
    }

    return false;
  }

  function openRoleDialog(user: Profile) {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsDialogOpen(true);
  }

  async function handleRoleChange() {
    if (!selectedUser || !newRole) return;

    setIsUpdatingRole(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update role");
      }

      toast.success(
        payload.message ||
          `${selectedUser.full_name || selectedUser.email}'s role updated`
      );
      setIsDialogOpen(false);
      setSelectedUser(null);
      setNewRole("");
      refreshUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setIsUpdatingRole(false);
    }
  }

  async function handleProfileFlagUpdate(
    user: Profile,
    payload: Partial<Pick<Profile, "is_active" | "is_verified">>,
    successMessage: string
  ) {
    setPendingUserId(user.id);
    try {
      const response = await fetch(`/api/admin/entities/profiles/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(responsePayload.error || "Failed to update profile");
      }

      toast.success(successMessage);
      refreshUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setPendingUserId(null);
    }
  }

  const summaryCards = useMemo(
    () => [
      {
        title: "Total Profiles",
        value: profileEntity?.count ?? totalCount,
        description: "Profiles currently visible from the admin registry",
        icon: Users,
      },
      {
        title: "Filtered Results",
        value: totalCount,
        description: "Users matching the current filters",
        icon: Search,
      },
      {
        title: "Active On Page",
        value: activeUsersOnPage,
        description: "Accounts currently active in this result set",
        icon: UserCheck,
      },
      {
        title: "Manageable Roles",
        value: manageableRoles.length,
        description: "Roles the current admin can assign",
        icon: Shield,
      },
    ],
    [activeUsersOnPage, manageableRoles.length, profileEntity?.count, totalCount]
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Live Directory</Badge>
            <Badge variant="secondary">Role Guarded</Badge>
            {realtimeIssue ? <Badge variant="outline">Manual Refresh Fallback</Badge> : null}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshUsers}>
            Refresh
          </Button>
          <Link href={primaryActionHref}>
            <Button>
              <UserCog className="mr-2 h-4 w-4" />
              {primaryActionLabel}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading || metadataLoading ? "..." : card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasProfilesAccess && !metadataLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Profiles Unavailable</CardTitle>
            <CardDescription>
              Your current admin surface does not expose the profiles entity.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Platform Users
            </CardTitle>
            <CardDescription>
              {totalCount} users match the current search and filter set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or username..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) =>
                  setRoleFilter(value as UserRole | typeof ALL_FILTER_VALUE)
                }
              >
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All Roles</SelectItem>
                  {(["super_admin", "admin", "shura", "imam", "member"] as const).map(
                    (role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleDisplayName(role)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(
                    value as "active" | "inactive" | typeof ALL_FILTER_VALUE
                  )
                }
              >
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                No users found for the current filters.
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Mosque</TableHead>
                        <TableHead className="hidden lg:table-cell">Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const canManage = canManageTarget(user) && canEditProfiles;
                        const isPending = pendingUserId === user.id;

                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage
                                    src={user.avatar_url || undefined}
                                    alt={user.full_name || ""}
                                  />
                                  <AvatarFallback>
                                    {getInitials(user.full_name, user.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate font-medium">
                                    {user.full_name || "No name"}
                                  </span>
                                  <span className="truncate text-sm text-muted-foreground">
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {user.role === "super_admin" ? (
                                  <Shield className="mr-1 h-3 w-3" />
                                ) : null}
                                {getRoleDisplayName(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={user.is_active ? "outline" : "secondary"}>
                                  {user.is_active ? "Active" : "Inactive"}
                                </Badge>
                                {user.is_verified ? (
                                  <Badge variant="secondary">Verified</Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {getLookupLabel(lookups, "mosques", user.mosque_id)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={isPending}>
                                    {isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href={primaryActionHref}>Open Management Surface</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openRoleDialog(user)}
                                    disabled={!canManage}
                                  >
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleProfileFlagUpdate(
                                        user,
                                        { is_active: !user.is_active },
                                        user.is_active
                                          ? "User deactivated"
                                          : "User reactivated"
                                      )
                                    }
                                    disabled={!canManage}
                                  >
                                    {user.is_active ? (
                                      <UserX className="mr-2 h-4 w-4" />
                                    ) : (
                                      <UserCheck className="mr-2 h-4 w-4" />
                                    )}
                                    {user.is_active ? "Deactivate" : "Reactivate"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleProfileFlagUpdate(
                                        user,
                                        { is_verified: !user.is_verified },
                                        user.is_verified
                                          ? "Verification removed"
                                          : "User verified"
                                      )
                                    }
                                    disabled={!canManage}
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    {user.is_verified ? "Remove Verification" : "Verify User"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
                      {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} users
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((current) => Math.min(totalPages, current + 1))
                        }
                        disabled={page === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.full_name || selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser?.avatar_url || undefined} />
                <AvatarFallback>
                  {getInitials(selectedUser?.full_name || null, selectedUser?.email || null)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedUser?.full_name || "No name"}</p>
                <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
              </div>
            </div>

            {/* Current Role */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Role</label>
              <Badge
                variant={
                  selectedUser ? getRoleBadgeVariant(selectedUser.role) : "outline"
                }
                className="w-fit"
              >
                {selectedUser ? getRoleDisplayName(selectedUser.role) : ""}
              </Badge>
            </div>

            {/* New Role */}
            <div className="space-y-2">
              <label htmlFor="role-select" className="text-sm font-medium">New Role</label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {manageableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                      {role === "super_admin" ? " (Full Access)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warning */}
            {newRole === "super_admin" && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Warning:</strong> Super Admin has full access to all features.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUpdatingRole}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={
                isUpdatingRole || !newRole || newRole === selectedUser?.role
              }
            >
              {isUpdatingRole && <Spinner className="mr-2 h-4 w-4" />}
              {isUpdatingRole ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
