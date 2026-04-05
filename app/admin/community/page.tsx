"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Users, UserPlus, MoreHorizontal, Mail, Shield, Search } from "lucide-react"
import { mosques } from "@/lib/data"
import type { User, UserRole } from "@/lib/types"
import { toast } from "sonner"
import { format } from "date-fns"

// Mock community members data
const mockMembers: User[] = [
  {
    id: "1",
    name: "Ahmad Hassan",
    email: "ahmad.hassan@email.com",
    role: "mosque_admin",
    mosqueId: "1",
    phone: "+1 (212) 555-0101",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Fatima Ali",
    email: "fatima.ali@email.com",
    role: "member",
    mosqueId: "1",
    phone: "+1 (212) 555-0102",
    createdAt: "2024-02-01",
  },
  {
    id: "3",
    name: "Omar Khan",
    email: "omar.khan@email.com",
    role: "member",
    mosqueId: "1",
    createdAt: "2024-02-15",
  },
  {
    id: "4",
    name: "Aisha Mohammed",
    email: "aisha.m@email.com",
    role: "member",
    mosqueId: "2",
    phone: "+1 (718) 555-0201",
    createdAt: "2024-03-01",
  },
  {
    id: "5",
    name: "Yusuf Ibrahim",
    email: "yusuf.ibrahim@email.com",
    role: "mosque_admin",
    mosqueId: "2",
    phone: "+1 (718) 555-0202",
    createdAt: "2024-01-20",
  },
  {
    id: "6",
    name: "Maryam Begum",
    email: "maryam.b@email.com",
    role: "member",
    mosqueId: "1",
    createdAt: "2024-03-05",
  },
  {
    id: "7",
    name: "Khalid Ahmed",
    email: "khalid.a@email.com",
    role: "member",
    mosqueId: "3",
    phone: "+1 (718) 555-0301",
    createdAt: "2024-02-20",
  },
  {
    id: "8",
    name: "Zainab Rahman",
    email: "zainab.r@email.com",
    role: "admin",
    createdAt: "2024-01-01",
  },
]

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  mosque_admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  member: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  visitor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

const roleLabels: Record<UserRole, string> = {
  admin: "Super Admin",
  mosque_admin: "Mosque Admin",
  member: "Member",
  visitor: "Visitor",
}

export default function AdminCommunityPage() {
  const [members, setMembers] = useState<User[]>(mockMembers)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterMosque, setFilterMosque] = useState<string>("all")

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === "all" || member.role === filterRole
    const matchesMosque = filterMosque === "all" || member.mosqueId === filterMosque
    return matchesSearch && matchesRole && matchesMosque
  })

  const totalMembers = members.length
  const adminCount = members.filter((m) => m.role === "admin" || m.role === "mosque_admin").length
  const newThisMonth = members.filter((m) => {
    const createdDate = new Date(m.createdAt)
    const now = new Date()
    return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()
  }).length

  const handleAddMember = (formData: FormData) => {
    const newMember: User = {
      id: `member-${Date.now()}`,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as UserRole,
      mosqueId: formData.get("mosqueId") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      createdAt: new Date().toISOString(),
    }
    setMembers([newMember, ...members])
    setIsAddMemberOpen(false)
    toast.success("Member added successfully")
  }

  const handleRoleChange = (memberId: string, newRole: UserRole) => {
    setMembers(
      members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    )
    toast.success("Member role updated")
  }

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter((m) => m.id !== memberId))
    toast.success("Member removed")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getMosqueName = (mosqueId?: string) => {
    if (!mosqueId) return "All Mosques"
    const mosque = mosques.find((m) => m.id === mosqueId)
    return mosque?.name || "Unknown"
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community Management</h1>
          <p className="text-muted-foreground">Manage members, roles, and community engagement</p>
        </div>
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>Add a new member to the community. Fill in their details below.</DialogDescription>
            </DialogHeader>
            <form action={handleAddMember} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue="member">
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="mosque_admin">Mosque Admin</SelectItem>
                      <SelectItem value="admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mosqueId">Mosque (optional)</Label>
                <Select name="mosqueId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select mosque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific mosque</SelectItem>
                    {mosques.map((mosque) => (
                      <SelectItem key={mosque.id} value={mosque.id}>
                        {mosque.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Add Member
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">Across all mosques</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground">Super admins & mosque admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newThisMonth}</div>
            <p className="text-xs text-muted-foreground">Members joined recently</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Members ({filteredMembers.length})
          </CardTitle>
          <CardDescription>View and manage community members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Super Admin</SelectItem>
                <SelectItem value="mosque_admin">Mosque Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMosque} onValueChange={setFilterMosque}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by mosque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Mosques</SelectItem>
                {mosques.map((mosque) => (
                  <SelectItem key={mosque.id} value={mosque.id}>
                    {mosque.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Mosque</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[member.role]}>
                      {roleLabels[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {getMosqueName(member.mosqueId)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {format(new Date(member.createdAt), "MMM d, yyyy")}
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
                        <DropdownMenuItem
                          onClick={() => {
                            window.location.href = `mailto:${member.email}`
                          }}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              member.id,
                              member.role === "member" ? "mosque_admin" : "member"
                            )
                          }
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          {member.role === "member" ? "Promote to Admin" : "Demote to Member"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

