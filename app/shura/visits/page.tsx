"use client"

import { useState } from "react"
import { useShuraStore, type MosqueVisitCRUD } from "@/lib/stores"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  Plus, Search, Edit, Trash2, Eye, Calendar, Clock, MapPin, Building2, User, 
  CheckCircle2, AlertCircle, XCircle, Filter, MoreHorizontal, Star, FileText, ClipboardList
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type VisitFormData = Omit<MosqueVisitCRUD, 'id' | 'createdAt' | 'updatedAt'>

const emptyVisitForm: VisitFormData = {
  mosqueId: "",
  shuraMemberId: "",
  visitType: "routine",
  scheduledDate: new Date().toISOString().split('T')[0],
  scheduledTime: "10:00",
  status: "scheduled",
  purpose: "",
  agenda: [],
  attendees: [],
  followUpRequired: false
}

export default function VisitsPage() {
  const { visits, members, mosques, addVisit, updateVisit, deleteVisit } = useShuraStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false)
  
  const [selectedVisit, setSelectedVisit] = useState<MosqueVisitCRUD | null>(null)
  const [formData, setFormData] = useState<VisitFormData>(emptyVisitForm)
  const [agendaInput, setAgendaInput] = useState("")
  const [attendeesInput, setAttendeesInput] = useState("")
  const [ratingData, setRatingData] = useState({ overallRating: 4, comments: "", strengths: "", improvements: "" })

  const filteredVisits = visits.filter(visit => {
    const mosque = mosques.find(m => m.id === visit.mosqueId)
    const member = members.find(m => m.id === visit.shuraMemberId)
    const matchesSearch = 
      mosque?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.purpose.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || visit.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: visits.length,
    scheduled: visits.filter(v => v.status === "scheduled" || v.status === "confirmed").length,
    completed: visits.filter(v => v.status === "completed").length,
    pending: visits.filter(v => v.followUpRequired).length
  }

  const getMosqueName = (mosqueId: string) => mosques.find(m => m.id === mosqueId)?.name || "Unknown Mosque"
  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || "Unknown Member"
  const getMember = (memberId: string) => members.find(m => m.id === memberId)

  const handleAdd = () => {
    setFormData(emptyVisitForm)
    setAgendaInput("")
    setAttendeesInput("")
    setIsAddDialogOpen(true)
  }

  const handleEdit = (visit: MosqueVisitCRUD) => {
    setSelectedVisit(visit)
    setFormData({ ...visit })
    setAgendaInput(visit.agenda.join("\n"))
    setAttendeesInput(visit.attendees.join(", "))
    setIsEditDialogOpen(true)
  }

  const handleView = (visit: MosqueVisitCRUD) => {
    setSelectedVisit(visit)
    setIsViewDialogOpen(true)
  }

  const handleDeleteClick = (visit: MosqueVisitCRUD) => {
    setSelectedVisit(visit)
    setIsDeleteDialogOpen(true)
  }

  const handleRatingClick = (visit: MosqueVisitCRUD) => {
    setSelectedVisit(visit)
    setRatingData({
      overallRating: visit.rating?.overallRating || 4,
      comments: visit.rating?.comments || "",
      strengths: visit.rating?.strengths.join(", ") || "",
      improvements: visit.rating?.areasForImprovement.join(", ") || ""
    })
    setIsRatingDialogOpen(true)
  }

  const handleSubmitAdd = () => {
    const newVisit: VisitFormData = {
      ...formData,
      agenda: agendaInput.split("\n").map(a => a.trim()).filter(Boolean),
      attendees: attendeesInput.split(",").map(a => a.trim()).filter(Boolean),
    }
    addVisit(newVisit)
    setIsAddDialogOpen(false)
    toast.success("Visit scheduled successfully")
  }

  const handleSubmitEdit = () => {
    if (!selectedVisit) return
    updateVisit(selectedVisit.id, {
      ...formData,
      agenda: agendaInput.split("\n").map(a => a.trim()).filter(Boolean),
      attendees: attendeesInput.split(",").map(a => a.trim()).filter(Boolean),
    })
    setIsEditDialogOpen(false)
    toast.success("Visit updated successfully")
  }

  const handleConfirmDelete = () => {
    if (!selectedVisit) return
    deleteVisit(selectedVisit.id)
    setIsDeleteDialogOpen(false)
    toast.success("Visit deleted successfully")
  }

  const handleSubmitRating = () => {
    if (!selectedVisit) return
    updateVisit(selectedVisit.id, {
      status: "completed",
      rating: {
        overallRating: ratingData.overallRating,
        categories: {},
        strengths: ratingData.strengths.split(",").map(s => s.trim()).filter(Boolean),
        areasForImprovement: ratingData.improvements.split(",").map(s => s.trim()).filter(Boolean),
        comments: ratingData.comments
      }
    })
    setIsRatingDialogOpen(false)
    toast.success("Visit completed with rating")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
      case "confirmed": return <Badge className="bg-teal-500/10 text-teal-600 border-teal-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>
      case "in_progress": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><AlertCircle className="w-3 h-3 mr-1" />In Progress</Badge>
      case "completed": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
      case "cancelled": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      case "postponed": return <Badge variant="secondary">Postponed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const VisitForm = () => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mosque *</Label>
          <Select value={formData.mosqueId} onValueChange={(value) => setFormData({ ...formData, mosqueId: value })}>
            <SelectTrigger><SelectValue placeholder="Select mosque" /></SelectTrigger>
            <SelectContent>
              {mosques.map(mosque => <SelectItem key={mosque.id} value={mosque.id}>{mosque.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Assigned Member *</Label>
          <Select value={formData.shuraMemberId} onValueChange={(value) => setFormData({ ...formData, shuraMemberId: value })}>
            <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              {members.filter(m => m.status === "active").map(member => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Visit Type *</Label>
          <Select value={formData.visitType} onValueChange={(value) => setFormData({ ...formData, visitType: value })}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine Inspection</SelectItem>
              <SelectItem value="follow_up">Follow-up Visit</SelectItem>
              <SelectItem value="complaint">Complaint Investigation</SelectItem>
              <SelectItem value="assessment">Annual Assessment</SelectItem>
              <SelectItem value="special">Special Visit</SelectItem>
              <SelectItem value="training">Training Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value: MosqueVisitCRUD['status']) => setFormData({ ...formData, status: value })}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="postponed">Postponed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Scheduled Date *</Label>
          <Input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Scheduled Time *</Label>
          <Input type="time" value={formData.scheduledTime} onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Purpose *</Label>
        <Input value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="Purpose of the visit" />
      </div>
      <div className="space-y-2">
        <Label>Agenda Items (one per line)</Label>
        <Textarea value={agendaInput} onChange={(e) => setAgendaInput(e.target.value)} placeholder="Enter agenda items, one per line" rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Attendees (comma-separated)</Label>
        <Input value={attendeesInput} onChange={(e) => setAttendeesInput(e.target.value)} placeholder="e.g., Imam, Committee Chair" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="followUp" checked={formData.followUpRequired} onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })} className="rounded border-gray-300" />
        <Label htmlFor="followUp">Follow-up Required</Label>
      </div>
      {formData.followUpRequired && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Follow-up Date</Label>
            <Input type="date" value={formData.followUpDate || ""} onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Notes</Label>
            <Input value={formData.followUpNotes || ""} onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })} placeholder="Notes for follow-up" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Findings</Label>
        <Textarea value={formData.findings || ""} onChange={(e) => setFormData({ ...formData, findings: e.target.value })} placeholder="Document findings from the visit" rows={3} />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mosque Visits</h1>
          <p className="text-muted-foreground">Schedule and manage mosque inspection visits</p>
        </div>
        <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="mr-2 h-4 w-4" />Schedule Visit
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Upcoming visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Finished visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-up</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search visits..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "cards" | "table")}>
              <TabsList>
                <TabsTrigger value="cards">Cards</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVisits.map((visit) => {
            const member = getMember(visit.shuraMemberId)
            return (
              <Card key={visit.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-teal-600" />
                        {getMosqueName(visit.mosqueId)}
                      </CardTitle>
                      <CardDescription className="mt-1">{visit.visitType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(visit)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(visit)}><Edit className="mr-2 h-4 w-4" />Edit Visit</DropdownMenuItem>
                        {visit.status !== "completed" && (
                          <DropdownMenuItem onClick={() => handleRatingClick(visit)}><Star className="mr-2 h-4 w-4" />Complete & Rate</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteClick(visit)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getStatusBadge(visit.status)}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(visit.scheduledDate).toLocaleDateString()}</span>
                      <Clock className="h-4 w-4 ml-2" />
                      <span>{visit.scheduledTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member?.photoUrl} />
                        <AvatarFallback className="text-xs bg-teal-100 text-teal-700">
                          {member?.name.split(" ").map(n => n[0]).join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{getMemberName(visit.shuraMemberId)}</span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{visit.purpose}</p>
                  </div>
                  {visit.rating && (
                    <div className="flex items-center gap-1 pt-2 border-t">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{visit.rating.overallRating}/5</span>
                    </div>
                  )}
                  {visit.followUpRequired && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm pt-2 border-t">
                      <AlertCircle className="h-4 w-4" /><span>Follow-up required</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mosque</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell className="font-medium">{getMosqueName(visit.mosqueId)}</TableCell>
                  <TableCell>{visit.visitType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(visit.scheduledDate).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">{visit.scheduledTime}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getMemberName(visit.shuraMemberId)}</TableCell>
                  <TableCell>{getStatusBadge(visit.status)}</TableCell>
                  <TableCell>
                    {visit.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span>{visit.rating.overallRating}/5</span>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(visit)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(visit)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        {visit.status !== "completed" && (
                          <DropdownMenuItem onClick={() => handleRatingClick(visit)}><Star className="h-4 w-4 mr-2" />Complete & Rate</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteClick(visit)} className="text-destructive focus:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />Delete
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

      {filteredVisits.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No visits found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your search or filter criteria" : "Get started by scheduling your first mosque visit"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />Schedule First Visit</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule New Visit</DialogTitle>
            <DialogDescription>Schedule a mosque inspection visit</DialogDescription>
          </DialogHeader>
          <VisitForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} disabled={!formData.mosqueId || !formData.shuraMemberId} className="bg-teal-600 hover:bg-teal-700">Schedule Visit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Visit</DialogTitle>
            <DialogDescription>Update visit details</DialogDescription>
          </DialogHeader>
          <VisitForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} className="bg-teal-600 hover:bg-teal-700">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Visit Details</DialogTitle></DialogHeader>
          {selectedVisit && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-teal-600" />
                    {getMosqueName(selectedVisit.mosqueId)}
                  </h2>
                  <p className="text-muted-foreground">{selectedVisit.visitType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                </div>
                {getStatusBadge(selectedVisit.status)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Scheduled Date</Label><p className="font-medium">{new Date(selectedVisit.scheduledDate).toLocaleDateString()}</p></div>
                <div><Label className="text-muted-foreground">Time</Label><p className="font-medium">{selectedVisit.scheduledTime}</p></div>
                <div><Label className="text-muted-foreground">Assigned Member</Label><p className="font-medium">{getMemberName(selectedVisit.shuraMemberId)}</p></div>
                <div><Label className="text-muted-foreground">Purpose</Label><p className="font-medium">{selectedVisit.purpose}</p></div>
              </div>
              {selectedVisit.agenda.length > 0 && (
                <div><Label className="text-muted-foreground">Agenda</Label><ul className="list-disc list-inside space-y-1 mt-1">{selectedVisit.agenda.map((item, idx) => <li key={idx} className="text-sm">{item}</li>)}</ul></div>
              )}
              {selectedVisit.findings && (
                <div><Label className="text-muted-foreground">Findings</Label><p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedVisit.findings}</p></div>
              )}
              {selectedVisit.rating && (
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                    <span className="text-lg font-semibold">{selectedVisit.rating.overallRating}/5</span>
                    <span className="text-muted-foreground">Overall Rating</span>
                  </div>
                  {selectedVisit.rating.strengths.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Strengths</Label>
                      <div className="flex flex-wrap gap-1 mt-1">{selectedVisit.rating.strengths.map((s, idx) => <Badge key={idx} className="bg-emerald-100 text-emerald-800">{s}</Badge>)}</div>
                    </div>
                  )}
                  {selectedVisit.rating.areasForImprovement.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Areas for Improvement</Label>
                      <div className="flex flex-wrap gap-1 mt-1">{selectedVisit.rating.areasForImprovement.map((a, idx) => <Badge key={idx} variant="secondary">{a}</Badge>)}</div>
                    </div>
                  )}
                </div>
              )}
              {selectedVisit.followUpRequired && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Follow-up Required</p>
                    {selectedVisit.followUpDate && <p className="text-sm">Scheduled: {new Date(selectedVisit.followUpDate).toLocaleDateString()}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setIsViewDialogOpen(false); if (selectedVisit) handleEdit(selectedVisit) }} className="bg-teal-600 hover:bg-teal-700">Edit Visit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Visit & Add Rating</DialogTitle>
            <DialogDescription>Rate the mosque based on your visit findings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Overall Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button key={rating} variant={ratingData.overallRating >= rating ? "default" : "outline"} size="icon" onClick={() => setRatingData({ ...ratingData, overallRating: rating })} className={ratingData.overallRating >= rating ? "bg-amber-500 hover:bg-amber-600" : ""}>
                    <Star className={`h-4 w-4 ${ratingData.overallRating >= rating ? "fill-white" : ""}`} />
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Strengths (comma-separated)</Label>
              <Input value={ratingData.strengths} onChange={(e) => setRatingData({ ...ratingData, strengths: e.target.value })} placeholder="e.g., Clean facilities, Active programs" />
            </div>
            <div className="space-y-2">
              <Label>Areas for Improvement (comma-separated)</Label>
              <Input value={ratingData.improvements} onChange={(e) => setRatingData({ ...ratingData, improvements: e.target.value })} placeholder="e.g., Record keeping, Youth engagement" />
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={ratingData.comments} onChange={(e) => setRatingData({ ...ratingData, comments: e.target.value })} placeholder="Additional comments about the visit" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRatingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRating} className="bg-teal-600 hover:bg-teal-700">Complete Visit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visit</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this visit? This action cannot be undone.</AlertDialogDescription>
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

