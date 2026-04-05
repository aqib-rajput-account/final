"use client"

import { useState } from "react"
import { useShuraStore, type MosqueCRUD } from "@/lib/stores"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { 
  Search, Building2, MapPin, Users, Star, Phone, Mail, Calendar, CheckCircle2,
  AlertTriangle, Clock, Eye, ClipboardCheck, UserPlus, TrendingUp, TrendingDown,
  BarChart3, Filter, Plus, Edit, Trash2, MoreHorizontal
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type MosqueFormData = Omit<MosqueCRUD, 'id' | 'createdAt' | 'updatedAt'>

const emptyMosqueForm: MosqueFormData = {
  name: "",
  address: "",
  city: "",
  state: "",
  region: "",
  zipCode: "",
  country: "USA",
  phone: "",
  email: "",
  website: "",
  capacity: 200,
  registrationStatus: "pending",
  imam: "",
  needsImam: false,
  rating: 0,
  lastVisit: "",
  assignedShuraMember: "",
  facilities: [],
  programs: [],
  notes: ""
}

export default function MosquesPage() {
  const { mosques, members, visits, addMosque, updateMosque, deleteMosque } = useShuraStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [regionFilter, setRegionFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const [selectedMosque, setSelectedMosque] = useState<MosqueCRUD | null>(null)
  const [formData, setFormData] = useState<MosqueFormData>(emptyMosqueForm)
  const [facilitiesInput, setFacilitiesInput] = useState("")
  const [programsInput, setProgramsInput] = useState("")

  const filteredMosques = mosques.filter((mosque) => {
    const matchesSearch = 
      mosque.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mosque.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mosque.city && mosque.city.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesRegion = regionFilter === "all" || mosque.region === regionFilter
    const matchesStatus = statusFilter === "all" || mosque.registrationStatus === statusFilter
    let matchesRating = true
    if (ratingFilter !== "all") {
      const rating = mosque.rating || 0
      switch (ratingFilter) {
        case "excellent": matchesRating = rating >= 4.5; break
        case "good": matchesRating = rating >= 3.5 && rating < 4.5; break
        case "needs_improvement": matchesRating = rating < 3.5; break
      }
    }
    return matchesSearch && matchesRegion && matchesStatus && matchesRating
  })

  const uniqueRegions = [...new Set(mosques.map(m => m.region).filter(Boolean))]

  const stats = {
    total: mosques.length,
    registered: mosques.filter(m => m.registrationStatus === 'registered').length,
    pending: mosques.filter(m => m.registrationStatus === 'pending').length,
    needsImam: mosques.filter(m => m.needsImam).length,
    excellentRating: mosques.filter(m => (m.rating || 0) >= 4.5).length,
    needsAttention: mosques.filter(m => (m.rating || 0) < 3.5 && (m.rating || 0) > 0).length,
  }

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || "Not Assigned"
  const getMember = (memberId: string) => members.find(m => m.id === memberId)

  const handleAdd = () => {
    setFormData(emptyMosqueForm)
    setFacilitiesInput("")
    setProgramsInput("")
    setIsAddDialogOpen(true)
  }

  const handleEdit = (mosque: MosqueCRUD) => {
    setSelectedMosque(mosque)
    setFormData({ ...mosque })
    setFacilitiesInput(mosque.facilities?.join(", ") || "")
    setProgramsInput(mosque.programs?.join(", ") || "")
    setIsEditDialogOpen(true)
  }

  const handleView = (mosque: MosqueCRUD) => {
    setSelectedMosque(mosque)
    setIsViewDialogOpen(true)
  }

  const handleDeleteClick = (mosque: MosqueCRUD) => {
    setSelectedMosque(mosque)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmitAdd = () => {
    const newMosque: MosqueFormData = {
      ...formData,
      facilities: facilitiesInput.split(",").map(f => f.trim()).filter(Boolean),
      programs: programsInput.split(",").map(p => p.trim()).filter(Boolean),
    }
    addMosque(newMosque)
    setIsAddDialogOpen(false)
    toast.success("Mosque added successfully")
  }

  const handleSubmitEdit = () => {
    if (!selectedMosque) return
    updateMosque(selectedMosque.id, {
      ...formData,
      facilities: facilitiesInput.split(",").map(f => f.trim()).filter(Boolean),
      programs: programsInput.split(",").map(p => p.trim()).filter(Boolean),
    })
    setIsEditDialogOpen(false)
    toast.success("Mosque updated successfully")
  }

  const handleConfirmDelete = () => {
    if (!selectedMosque) return
    deleteMosque(selectedMosque.id)
    setIsDeleteDialogOpen(false)
    toast.success("Mosque deleted successfully")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "registered": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Registered</Badge>
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "unregistered": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><AlertTriangle className="w-3 h-3 mr-1" />Unregistered</Badge>
      case "suspended": return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Suspended</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRatingDisplay = (rating: number) => {
    if (!rating || rating === 0) return <span className="text-muted-foreground">Not rated</span>
    const stars = Math.round(rating)
    let colorClass = "text-emerald-600"
    if (rating < 3.5) colorClass = "text-red-600"
    else if (rating < 4.5) colorClass = "text-amber-600"
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < stars ? colorClass + ' fill-current' : 'text-muted-foreground/30'}`} />
        ))}
        <span className={`ml-1 font-medium ${colorClass}`}>{rating.toFixed(1)}</span>
      </div>
    )
  }

  const MosqueForm = () => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid gap-2">
        <Label>Mosque Name *</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter mosque name" />
      </div>
      <div className="grid gap-2">
        <Label>Address *</Label>
        <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Street address" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>City *</Label>
          <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" />
        </div>
        <div className="grid gap-2">
          <Label>State *</Label>
          <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="State" />
        </div>
        <div className="grid gap-2">
          <Label>Zip Code</Label>
          <Input value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} placeholder="Zip" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Region</Label>
          <Input value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} placeholder="e.g., North, South" />
        </div>
        <div className="grid gap-2">
          <Label>Capacity</Label>
          <Input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Phone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
        </div>
        <div className="grid gap-2">
          <Label>Email</Label>
          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="info@mosque.org" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Website</Label>
        <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.mosque.org" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Registration Status *</Label>
          <Select value={formData.registrationStatus} onValueChange={(value: MosqueCRUD['registrationStatus']) => setFormData({ ...formData, registrationStatus: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="unregistered">Unregistered</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Assigned Shura Member</Label>
          <Select value={formData.assignedShuraMember || ""} onValueChange={(value) => setFormData({ ...formData, assignedShuraMember: value || undefined })}>
            <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not Assigned</SelectItem>
              {members.filter(m => m.status === "active").map(member => (
                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Current Imam</Label>
          <Input value={formData.imam} onChange={(e) => setFormData({ ...formData, imam: e.target.value })} placeholder="Imam name" />
        </div>
        <div className="grid gap-2">
          <Label>Needs Imam</Label>
          <div className="flex items-center gap-2 h-10">
            <input type="checkbox" id="needsImam" checked={formData.needsImam} onChange={(e) => setFormData({ ...formData, needsImam: e.target.checked })} className="rounded border-gray-300" />
            <label htmlFor="needsImam" className="text-sm">Imam position is open</label>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Facilities (comma-separated)</Label>
        <Input value={facilitiesInput} onChange={(e) => setFacilitiesInput(e.target.value)} placeholder="e.g., Parking, Wudu Area, Prayer Hall" />
      </div>
      <div className="grid gap-2">
        <Label>Programs (comma-separated)</Label>
        <Input value={programsInput} onChange={(e) => setProgramsInput(e.target.value)} placeholder="e.g., Quran Classes, Youth Group, Food Bank" />
      </div>
      <div className="grid gap-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes about the mosque" rows={3} />
      </div>
    </div>
  )

  const MosqueCard = ({ mosque }: { mosque: MosqueCRUD }) => {
    const assignedMember = mosque.assignedShuraMember ? getMember(mosque.assignedShuraMember) : null
    const mosqueVisits = visits.filter(v => v.mosqueId === mosque.id)

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  <h3 className="font-semibold text-lg">{mosque.name}</h3>
                  {getStatusBadge(mosque.registrationStatus)}
                  {mosque.needsImam && (
                    <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                      <UserPlus className="w-3 h-3 mr-1" />Needs Imam
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {mosque.address}{mosque.city && `, ${mosque.city}`}{mosque.state && `, ${mosque.state}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  {getRatingDisplay(mosque.rating || 0)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(mosque)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(mosque)}><Edit className="mr-2 h-4 w-4" />Edit Mosque</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteClick(mosque)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Capacity</p>
                <p className="font-medium flex items-center gap-1"><Users className="h-3 w-3" />{mosque.capacity} worshippers</p>
              </div>
              <div>
                <p className="text-muted-foreground">Imam</p>
                <p className="font-medium">{mosque.imam || (mosque.needsImam ? "Position Open" : "Not Assigned")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Visit</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {mosque.lastVisit ? new Date(mosque.lastVisit).toLocaleDateString() : "Never"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Contact</p>
                <p className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" />{mosque.phone || "N/A"}</p>
              </div>
            </div>

            {assignedMember && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={assignedMember.photoUrl} />
                  <AvatarFallback>{assignedMember.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="text-muted-foreground">Assigned Shura Member</p>
                  <p className="font-medium">{assignedMember.name}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleView(mosque)}>
                <Eye className="h-4 w-4 mr-1" />View Details
              </Button>
              <Button variant="outline" size="sm">
                <ClipboardCheck className="h-4 w-4 mr-1" />Schedule Visit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mosques Overview</h1>
          <p className="text-muted-foreground">Manage and monitor all mosques in the community network</p>
        </div>
        <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />Add Mosque
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Mosques</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.registered}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Need Imam</CardTitle>
            <UserPlus className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.needsImam}</div>
            <p className="text-xs text-muted-foreground">Positions open</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excellent</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.excellentRating}</div>
            <p className="text-xs text-muted-foreground">Rating 4.5+</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.needsAttention}</div>
            <p className="text-xs text-muted-foreground">Rating below 3.5</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by mosque name, address, or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Region" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueRegions.map(region => <SelectItem key={region} value={region}>{region}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="unregistered">Unregistered</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="excellent">Excellent (4.5+)</SelectItem>
                <SelectItem value="good">Good (3.5-4.5)</SelectItem>
                <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredMosques.map(mosque => <MosqueCard key={mosque.id} mosque={mosque} />)}
      </div>

      {filteredMosques.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No mosques found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || regionFilter !== "all" || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first mosque"}
            </p>
            {!searchQuery && regionFilter === "all" && statusFilter === "all" && (
              <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />Add First Mosque</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Mosque Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Mosque</DialogTitle>
            <DialogDescription>Register a new mosque in the network</DialogDescription>
          </DialogHeader>
          <MosqueForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} disabled={!formData.name || !formData.address} className="bg-teal-600 hover:bg-teal-700">Add Mosque</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mosque Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Mosque</DialogTitle>
            <DialogDescription>Update mosque information</DialogDescription>
          </DialogHeader>
          <MosqueForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} className="bg-teal-600 hover:bg-teal-700">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Mosque Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              {selectedMosque?.name}
            </DialogTitle>
            <DialogDescription>Mosque details and oversight information</DialogDescription>
          </DialogHeader>
          {selectedMosque && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="visits">Visits</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="flex gap-2 flex-wrap">
                  {getStatusBadge(selectedMosque.registrationStatus)}
                  {selectedMosque.needsImam && <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20"><UserPlus className="w-3 h-3 mr-1" />Needs Imam</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Address</Label><p className="font-medium">{selectedMosque.address}</p><p className="text-sm text-muted-foreground">{selectedMosque.city}, {selectedMosque.state} {selectedMosque.zipCode}</p></div>
                  <div><Label className="text-muted-foreground">Capacity</Label><p className="font-medium">{selectedMosque.capacity} worshippers</p></div>
                  <div><Label className="text-muted-foreground">Current Imam</Label><p className="font-medium">{selectedMosque.imam || "Not Assigned"}</p></div>
                  <div><Label className="text-muted-foreground">Rating</Label>{getRatingDisplay(selectedMosque.rating || 0)}</div>
                  <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium">{selectedMosque.phone || "N/A"}</p></div>
                  <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{selectedMosque.email || "N/A"}</p></div>
                </div>
                {selectedMosque.assignedShuraMember && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground">Assigned Shura Member</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getMember(selectedMosque.assignedShuraMember)?.photoUrl} />
                        <AvatarFallback>{getMemberName(selectedMosque.assignedShuraMember).split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{getMemberName(selectedMosque.assignedShuraMember)}</p>
                        <p className="text-sm text-muted-foreground">{getMember(selectedMosque.assignedShuraMember)?.role}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="visits" className="space-y-4 mt-4">
                {visits.filter(v => v.mosqueId === selectedMosque.id).length > 0 ? (
                  <div className="space-y-3">
                    {visits.filter(v => v.mosqueId === selectedMosque.id).slice(0, 5).map((visit) => (
                      <div key={visit.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{visit.purpose}</p>
                          <p className="text-sm text-muted-foreground">{new Date(visit.scheduledDate).toLocaleDateString()} by {getMemberName(visit.shuraMemberId)}</p>
                        </div>
                        <Badge variant={visit.status === "completed" ? "default" : "outline"}>{visit.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No visits recorded</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="details" className="space-y-4 mt-4">
                {selectedMosque.facilities && selectedMosque.facilities.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Facilities</Label>
                    <div className="flex flex-wrap gap-2 mt-2">{selectedMosque.facilities.map((f, i) => <Badge key={i} variant="secondary">{f}</Badge>)}</div>
                  </div>
                )}
                {selectedMosque.programs && selectedMosque.programs.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Programs</Label>
                    <div className="flex flex-wrap gap-2 mt-2">{selectedMosque.programs.map((p, i) => <Badge key={i} className="bg-teal-100 text-teal-800">{p}</Badge>)}</div>
                  </div>
                )}
                {selectedMosque.website && (
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    <p className="font-medium"><a href={selectedMosque.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">{selectedMosque.website}</a></p>
                  </div>
                )}
                {selectedMosque.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">{selectedMosque.notes}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setIsViewDialogOpen(false); if (selectedMosque) handleEdit(selectedMosque) }} className="bg-teal-600 hover:bg-teal-700">Edit Mosque</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mosque</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete &quot;{selectedMosque?.name}&quot;? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

