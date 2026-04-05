"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Spinner } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth, UserRole, ROLE_HIERARCHY } from "@/lib/auth";
import { getRoleDisplayName, getRoleBadgeVariant, getManageableRoles, canManageUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseBrowserEnv } from "@/lib/config";
import { Search, MoreHorizontal, UserCog, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/database.types";

const ITEMS_PER_PAGE = 10;

export default function UserManagementPage() {
  const { profile: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole | "">("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = hasSupabaseBrowserEnv ? createClient() : null;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        setUsers([]);
        setTotalCount(0);
        return;
      }

      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" });

      // Apply search filter
      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
      }

      // Apply role filter
      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      // Apply pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to).order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
        return;
      }

      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, page]);

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || !currentUser || !supabase) return;

    // Validate permission
    if (!canManageUser(currentUser.role, selectedUser.role)) {
      toast.error("You don't have permission to manage this user");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", selectedUser.id);

      if (error) {
        console.error("Error updating role:", error);
        toast.error("Failed to update user role");
        return;
      }

      toast.success(`${selectedUser.full_name || selectedUser.email}'s role updated to ${getRoleDisplayName(newRole)}`);
      setIsDialogOpen(false);
      setSelectedUser(null);
      setNewRole("");
      fetchUsers();
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while updating the role");
    } finally {
      setIsUpdating(false);
    }
  };

  const openRoleDialog = (user: Profile) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsDialogOpen(true);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const manageableRoles = currentUser ? getManageableRoles(currentUser.role) : [];

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  return (
    <ProtectedRoute requiredRoles={["super_admin"]}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions across the platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              All Users
            </CardTitle>
            <CardDescription>
              {totalCount} total users registered on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or username..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value as UserRole | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLE_HIERARCHY.slice().reverse().map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No users found</p>
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
                        <TableHead className="hidden lg:table-cell">Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ""} />
                                <AvatarFallback>{getInitials(user.full_name, user.email)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.full_name || "No name"}</span>
                                <span className="text-sm text-muted-foreground">{user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role === "super_admin" && <Shield className="mr-1 h-3 w-3" />}
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant={user.is_active ? "outline" : "secondary"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {canManageUser(currentUser?.role, user.role) && user.id !== currentUser?.id ? (
                                  <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Change Role
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    {user.id === currentUser?.id ? "Cannot edit self" : "No permission"}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} users
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
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
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

        {/* Role Change Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedUser?.full_name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser?.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(selectedUser?.full_name || null, selectedUser?.email || null)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser?.full_name || "No name"}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Role</label>
                <Badge variant={selectedUser ? getRoleBadgeVariant(selectedUser.role) : "outline"}>
                  {selectedUser ? getRoleDisplayName(selectedUser.role) : ""}
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">New Role</label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_HIERARCHY.slice().reverse().map((role) => (
                      <SelectItem 
                        key={role} 
                        value={role}
                        disabled={!isSuperAdmin && role === "super_admin"}
                      >
                        {getRoleDisplayName(role)}
                        {role === "super_admin" && " (Full Access)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newRole === "super_admin" && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <strong>Warning:</strong> Super Admin has full access to all features and can manage all users including other Super Admins.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button 
                onClick={handleRoleChange} 
                disabled={isUpdating || !newRole || newRole === selectedUser?.role}
              >
                {isUpdating ? <Spinner className="h-4 w-4 mr-2" /> : null}
                {isUpdating ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

