"use client"

import { useState } from "react"
import { useShuraStore, type ShuraMemberCRUD } from "@/lib/stores"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  Filter,
  Download,
  MoreHorizontal,
  Users,
  Shield
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type MemberFormData = Omit<ShuraMemberCRUD, 'id'>

const emptyMemberForm: MemberFormData = {
  name: "",
  title: "",
  email: "",
  phone: "",
  role: "",
  status: "active",
  assignedRegions: [],
  mosquesAssigned: 0,
  visitsCompleted: 0,
  performanceScore: 85,
  joinDate: new Date().toISOString().split('T')[0],
  expertise: [],
  languages: [],
  biography: "",
  photoUrl: ""
}

export default function MembersPage() {
  const { members, teams, addMember, updateMember, deleteMember } = useShuraStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const [selectedMember, setSelectedMember] = useState<ShuraMemberCRUD | null>(null)
  const [formData, setFormData] = useState<MemberFormData>(emptyMemberForm)
  const [regionsInput, setRegionsInput] = useState("")
  const [expertiseInput, setExpertiseInput] = useState("")
  const [languagesInput, setLanguagesInput] = useState("")

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || member.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeCount = members.filter(m => m.status === "active").length
  const totalVisits = members.reduce((acc, m) => acc + m.visitsCompleted, 0)
  const avgPerformance = members.length > 0 
    ? Math.round(members.reduce((acc, m) => acc + m.performanceScore, 0) / members.length) 
    : 0

  const handleAdd = () => {
    setFormData(emptyMemberForm)
    setRegionsInput("")
    setExpertiseInput("")
    setLanguagesInput("")
    setIsAddDialogOpen(true)
  }

  const handleEdit = (member: ShuraMemberCRUD) => {
    setSelectedMember(member)
    setFormData({ ...member })
    setRegionsInput(member.assignedRegions.join(", "))
    setExpertiseInput(member.expertise?.join(", ") || "")
    setLanguagesInput(member.languages?.join(", ") || "")
    setIsEditDialogOpen(true)
  }

  const handleView = (member: ShuraMemberCRUD) => {
    setSelectedMember(member)
    setIsViewDialogOpen(true)
  }

  const handleDeleteClick = (member: ShuraMemberCRUD) => {
    setSelectedMember(member)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmitAdd = () => {
    const newMember: MemberFormData = {
      ...formData,
      assignedRegions: regionsInput.split(",").map(r => r.trim()).filter(Boolean),
      expertise: expertiseInput.split(",").map(e => e.trim()).filter(Boolean),
      languages: languagesInput.split(",").map(l => l.trim()).filter(Boolean),
    }
    addMember(newMember)
    setIsAddDialogOpen(false)
    toast.success("Member added successfully")
  }

  const handleSubmitEdit = () => {
    if (!selectedMember) return
    const updatedMember: Partial<ShuraMemberCRUD> = {
      ...formData,
      assignedRegions: regionsInput.split(",").map(r => r.trim()).filter(Boolean),
      expertise: expertiseInput.split(",").map(e => e.trim()).filter(Boolean),
      languages: languagesInput.split(",").map(l => l.trim()).filter(Boolean),
    }
    updateMember(selectedMember.id, updatedMember)
    setIsEditDialogOpen(false)
    toast.success("Member updated successfully")
  }

  const handleConfirmDelete = () => {
    if (!selectedMember) return
    deleteMember(selectedMember.id)
    setIsDeleteDialogOpen(false)
    toast.success("Member deleted successfully")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "on-leave":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">On Leave</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Chairman":
        return <Badge className="bg-amber-600 text-white">Chairman</Badge>
      case "Vice Chairman":
        return <Badge className="bg-teal-600 text-white">Vice Chairman</Badge>
      case "Secretary":
        return <Badge className="bg-blue-600 text-white">Secretary</Badge>
      case "Treasurer":
        return <Badge className="bg-emerald-600 text-white">Treasurer</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  const MemberForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter full name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Senior Shura Member"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Chairman">Chairman</SelectItem>
              <SelectItem value="Vice Chairman">Vice Chairman</SelectItem>
              <SelectItem value="Secretary">Secretary</SelectItem>
              <SelectItem value="Treasurer">Treasurer</SelectItem>
              <SelectItem value="Regional Coordinator">Regional Coordinator</SelectItem>
              <SelectItem value="Senior Member">Senior Member</SelectItem>
              <SelectItem value="Member">Member</SelectItem>
              <SelectItem value="Advisor">Advisor</SelectItem>
              <SelectItem value="Inspector">Inspector</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(value: ShuraMemberCRUD['status']) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="joinDate">Join Date</Label>
          <Input
            id="joinDate"
            type="date"
            value={formData.joinDate?.split('T')[0]}
            onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="photoUrl">Photo URL</Label>
          <Input
            id="photoUrl"
            value={formData.photoUrl || ""}
            onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="regions">Assigned Regions (comma-separated)</Label>
        <Input
          id="regions"
          value={regionsInput}
          onChange={(e) => setRegionsInput(e.target.value)}
          placeholder="e.g., North, South, Central"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expertise">Areas of Expertise (comma-separated)</Label>
          <Input
            id="expertise"
            value={expertiseInput}
            onChange={(e) => setExpertiseInput(e.target.value)}
            placeholder="e.g., Finance, Education"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="languages">Languages (comma-separated)</Label>
          <Input
            id="languages"
            value={languagesInput}
            onChange={(e) => setLanguagesInput(e.target.value)}
            placeholder="e.g., English, Arabic, Urdu"
          />
        </div>
      </div>

      {isEdit && (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mosquesAssigned">Mosques Assigned</Label>
            <Input
              id="mosquesAssigned"
              type="number"
              value={formData.mosquesAssigned}
              onChange={(e) => setFormData({ ...formData, mosquesAssigned: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitsCompleted">Visits Completed</Label>
            <Input
              id="visitsCompleted"
              type="number"
              value={formData.visitsCompleted}
              onChange={(e) => setFormData({ ...formData, visitsCompleted: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="performanceScore">Performance Score (%)</Label>
            <Input
              id="performanceScore"
              type="number"
              min="0"
              max="100"
              value={formData.performanceScore}
              onChange={(e) => setFormData({ ...formData, performanceScore: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="biography">Biography</Label>
        <Textarea
          id="biography"
          value={formData.biography || ""}
          onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
          placeholder="Brief biography of the member..."
          rows={3}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shura Members</h1>
          <p className="text-muted-foreground">Manage Shura council members and teams</p>
        </div>
        <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">{activeCount} active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisits}</div>
            <p className="text-xs text-muted-foreground">Completed mosque visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerformance}%</div>
            <Progress value={avgPerformance} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-muted-foreground">Active teams</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "table")}>
                <TabsList>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="table">Table</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Display */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 border-2 border-teal-100">
                      <AvatarImage src={member.photoUrl} />
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-lg">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{member.name}</CardTitle>
                      <div className="mt-1">{getRoleBadge(member.role)}</div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(member)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(member)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Member
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(member)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {getStatusBadge(member.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{member.assignedRegions.join(", ") || "Not assigned"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{member.mosquesAssigned} mosques</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{member.visitsCompleted} visits</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Performance</span>
                    <span className="font-medium">{member.performanceScore}%</span>
                  </div>
                  <Progress value={member.performanceScore} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Regions</TableHead>
                <TableHead className="text-center">Mosques</TableHead>
                <TableHead className="text-center">Visits</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photoUrl} />
                        <AvatarFallback className="text-xs bg-teal-100 text-teal-700">
                          {member.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{member.email}</div>
                      <div className="text-muted-foreground">{member.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.assignedRegions.slice(0, 2).map((region, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{region}</Badge>
                      ))}
                      {member.assignedRegions.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{member.assignedRegions.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{member.mosquesAssigned}</TableCell>
                  <TableCell className="text-center">{member.visitsCompleted}</TableCell>
                  <TableCell className="text-center">
                    <span className={member.performanceScore >= 90 ? "text-emerald-600 font-medium" : ""}>
                      {member.performanceScore}%
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(member)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(member)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(member)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first Shura member"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Member
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Shura Member</DialogTitle>
            <DialogDescription>Add a new member to the Shura council</DialogDescription>
          </DialogHeader>
          <MemberForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} disabled={!formData.name || !formData.email} className="bg-teal-600 hover:bg-teal-700">
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update details for {selectedMember?.name}</DialogDescription>
          </DialogHeader>
          <MemberForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} className="bg-teal-600 hover:bg-teal-700">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Member Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedMember.photoUrl} />
                  <AvatarFallback className="text-2xl bg-teal-100 text-teal-700">
                    {selectedMember.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{selectedMember.name}</h2>
                  <div className="flex gap-2 mt-1">
                    {getRoleBadge(selectedMember.role)}
                    {getStatusBadge(selectedMember.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedMember.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedMember.phone}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Join Date</Label>
                  <p className="font-medium">{new Date(selectedMember.joinDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Assigned Regions</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedMember.assignedRegions.map((region, idx) => (
                      <Badge key={idx} variant="outline">{region}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center bg-muted/50 rounded-lg p-4">
                <div>
                  <p className="text-2xl font-bold">{selectedMember.mosquesAssigned}</p>
                  <p className="text-sm text-muted-foreground">Mosques Assigned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedMember.visitsCompleted}</p>
                  <p className="text-sm text-muted-foreground">Visits Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedMember.performanceScore}%</p>
                  <p className="text-sm text-muted-foreground">Performance Score</p>
                </div>
              </div>

              {selectedMember.expertise && selectedMember.expertise.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Areas of Expertise</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.expertise.map((exp, idx) => (
                      <Badge key={idx} className="bg-teal-100 text-teal-800">{exp}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedMember.languages && selectedMember.languages.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Languages</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.languages.map((lang, idx) => (
                      <Badge key={idx} variant="secondary">{lang}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedMember.biography && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Biography</Label>
                  <p className="text-sm">{selectedMember.biography}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false)
              if (selectedMember) handleEdit(selectedMember)
            }} className="bg-teal-600 hover:bg-teal-700">
              Edit Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedMember?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

