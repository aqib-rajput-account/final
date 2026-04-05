"use client"

import { useState } from "react"
import { useShuraStore, type ShuraMeetingCRUD } from "@/lib/stores"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { 
  Search, Plus, Calendar, Clock, Users, Video, MapPin, CheckCircle2, AlertCircle, XCircle,
  FileText, MessageSquare, Edit, Trash2, Eye, MoreHorizontal, Filter
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type MeetingFormData = Omit<ShuraMeetingCRUD, 'id' | 'createdAt' | 'updatedAt'>

const emptyMeetingForm: MeetingFormData = {
  title: "",
  meetingType: "general",
  scheduledDate: new Date().toISOString().split('T')[0],
  scheduledTime: "10:00",
  duration: 60,
  location: "",
  isVirtual: false,
  meetingLink: "",
  organizerId: "",
  attendeeIds: [],
  agenda: "",
  status: "scheduled",
  notes: "",
  decisions: [],
  actionItems: []
}

export default function MeetingsPage() {
  const { meetings, members, mosques, addMeeting, updateMeeting, deleteMeeting } = useShuraStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [tabView, setTabView] = useState<"upcoming" | "past">("upcoming")
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  
  const [selectedMeeting, setSelectedMeeting] = useState<ShuraMeetingCRUD | null>(null)
  const [formData, setFormData] = useState<MeetingFormData>(emptyMeetingForm)
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [decisionsInput, setDecisionsInput] = useState("")
  const [actionItemsInput, setActionItemsInput] = useState("")

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch = 
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.agenda.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || meeting.status === statusFilter
    const matchesType = typeFilter === "all" || meeting.meetingType === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const upcomingMeetings = filteredMeetings.filter(m => m.status === "scheduled" || m.status === "in_progress")
  const pastMeetings = filteredMeetings.filter(m => m.status === "completed" || m.status === "cancelled")

  const stats = {
    total: meetings.length,
    upcoming: meetings.filter(m => m.status === "scheduled").length,
    completed: meetings.filter(m => m.status === "completed").length,
    thisMonth: meetings.filter(m => {
      const meetingDate = new Date(m.scheduledDate)
      const now = new Date()
      return meetingDate.getMonth() === now.getMonth() && meetingDate.getFullYear() === now.getFullYear()
    }).length,
  }

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || "Unknown"
  const getMember = (memberId: string) => members.find(m => m.id === memberId)

  const handleAdd = () => {
    setFormData(emptyMeetingForm)
    setSelectedAttendees([])
    setDecisionsInput("")
    setActionItemsInput("")
    setIsAddDialogOpen(true)
  }

  const handleEdit = (meeting: ShuraMeetingCRUD) => {
    setSelectedMeeting(meeting)
    setFormData({ ...meeting })
    setSelectedAttendees(meeting.attendeeIds)
    setDecisionsInput(meeting.decisions?.join("\n") || "")
    setActionItemsInput(meeting.actionItems?.join("\n") || "")
    setIsEditDialogOpen(true)
  }

  const handleView = (meeting: ShuraMeetingCRUD) => {
    setSelectedMeeting(meeting)
    setIsViewDialogOpen(true)
  }

  const handleDeleteClick = (meeting: ShuraMeetingCRUD) => {
    setSelectedMeeting(meeting)
    setIsDeleteDialogOpen(true)
  }

  const handleCompleteClick = (meeting: ShuraMeetingCRUD) => {
    setSelectedMeeting(meeting)
    setDecisionsInput(meeting.decisions?.join("\n") || "")
    setActionItemsInput(meeting.actionItems?.join("\n") || "")
    setFormData({ ...meeting, notes: meeting.notes || "" })
    setIsCompleteDialogOpen(true)
  }

  const handleSubmitAdd = () => {
    const newMeeting: MeetingFormData = {
      ...formData,
      attendeeIds: selectedAttendees,
      decisions: decisionsInput.split("\n").map(d => d.trim()).filter(Boolean),
      actionItems: actionItemsInput.split("\n").map(a => a.trim()).filter(Boolean),
    }
    addMeeting(newMeeting)
    setIsAddDialogOpen(false)
    toast.success("Meeting scheduled successfully")
  }

  const handleSubmitEdit = () => {
    if (!selectedMeeting) return
    updateMeeting(selectedMeeting.id, {
      ...formData,
      attendeeIds: selectedAttendees,
      decisions: decisionsInput.split("\n").map(d => d.trim()).filter(Boolean),
      actionItems: actionItemsInput.split("\n").map(a => a.trim()).filter(Boolean),
    })
    setIsEditDialogOpen(false)
    toast.success("Meeting updated successfully")
  }

  const handleConfirmDelete = () => {
    if (!selectedMeeting) return
    deleteMeeting(selectedMeeting.id)
    setIsDeleteDialogOpen(false)
    toast.success("Meeting deleted successfully")
  }

  const handleCompleteMeeting = () => {
    if (!selectedMeeting) return
    updateMeeting(selectedMeeting.id, {
      status: "completed",
      notes: formData.notes,
      decisions: decisionsInput.split("\n").map(d => d.trim()).filter(Boolean),
      actionItems: actionItemsInput.split("\n").map(a => a.trim()).filter(Boolean),
    })
    setIsCompleteDialogOpen(false)
    toast.success("Meeting marked as completed")
  }

  const toggleAttendee = (memberId: string) => {
    setSelectedAttendees(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
      case "scheduled": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
      case "in_progress": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><AlertCircle className="w-3 h-3 mr-1" />In Progress</Badge>
      case "cancelled": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getMeetingTypeBadge = (type: string) => {
    switch (type) {
      case "general": return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20">General</Badge>
      case "imam_review": return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">Imam Review</Badge>
      case "mosque_assessment": return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Mosque Assessment</Badge>
      case "emergency": return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Emergency</Badge>
      case "quarterly_review": return <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/20">Quarterly Review</Badge>
      default: return <Badge variant="outline">{type}</Badge>
    }
  }

  const MeetingForm = () => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid gap-2">
        <Label>Meeting Title *</Label>
        <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter meeting title" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Meeting Type *</Label>
          <Select value={formData.meetingType} onValueChange={(value) => setFormData({ ...formData, meetingType: value })}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Meeting</SelectItem>
              <SelectItem value="imam_review">Imam Review</SelectItem>
              <SelectItem value="mosque_assessment">Mosque Assessment</SelectItem>
              <SelectItem value="quarterly_review">Quarterly Review</SelectItem>
              <SelectItem value="emergency">Emergency Meeting</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value: ShuraMeetingCRUD['status']) => setFormData({ ...formData, status: value })}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Date *</Label>
          <Input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Time *</Label>
          <Input type="time" value={formData.scheduledTime} onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Duration (min)</Label>
          <Select value={String(formData.duration)} onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Organizer *</Label>
          <Select value={formData.organizerId} onValueChange={(value) => setFormData({ ...formData, organizerId: value })}>
            <SelectTrigger><SelectValue placeholder="Select organizer" /></SelectTrigger>
            <SelectContent>
              {members.filter(m => m.status === "active").map(member => (
                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Virtual Meeting</Label>
          <div className="flex items-center gap-2 h-10">
            <Checkbox id="virtual" checked={formData.isVirtual} onCheckedChange={(checked) => setFormData({ ...formData, isVirtual: !!checked })} />
            <label htmlFor="virtual" className="text-sm">This is a virtual meeting</label>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        <Label>{formData.isVirtual ? "Meeting Link" : "Location"}</Label>
        <Input 
          value={formData.isVirtual ? formData.meetingLink || "" : formData.location} 
          onChange={(e) => setFormData({ 
            ...formData, 
            ...(formData.isVirtual ? { meetingLink: e.target.value } : { location: e.target.value })
          })} 
          placeholder={formData.isVirtual ? "Enter meeting link" : "Enter location"} 
        />
      </div>
      <div className="grid gap-2">
        <Label>Related Mosque (Optional)</Label>
        <Select value={formData.mosqueId || ""} onValueChange={(value) => setFormData({ ...formData, mosqueId: value || undefined })}>
          <SelectTrigger><SelectValue placeholder="Select mosque if applicable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">No specific mosque</SelectItem>
            {mosques.map(mosque => <SelectItem key={mosque.id} value={mosque.id}>{mosque.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Attendees</Label>
        <div className="border rounded-md p-3 space-y-2 max-h-[150px] overflow-y-auto">
          {members.filter(m => m.status === "active").map(member => (
            <div key={member.id} className="flex items-center gap-2">
              <Checkbox id={`attendee-${member.id}`} checked={selectedAttendees.includes(member.id)} onCheckedChange={() => toggleAttendee(member.id)} />
              <label htmlFor={`attendee-${member.id}`} className="text-sm flex items-center gap-2 cursor-pointer">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.photoUrl} />
                  <AvatarFallback className="text-xs">{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                {member.name} - {member.role}
              </label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{selectedAttendees.length} attendees selected</p>
      </div>
      <div className="grid gap-2">
        <Label>Agenda *</Label>
        <Textarea value={formData.agenda} onChange={(e) => setFormData({ ...formData, agenda: e.target.value })} placeholder="Enter meeting agenda and discussion points..." rows={3} />
      </div>
    </div>
  )

  const MeetingCard = ({ meeting }: { meeting: ShuraMeetingCRUD }) => {
    const organizer = getMember(meeting.organizerId)
    const mosque = meeting.mosqueId ? mosques.find(m => m.id === meeting.mosqueId) : null
    const attendees = meeting.attendeeIds.map(id => getMember(id)).filter(Boolean)

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{meeting.title}</h3>
                  {getStatusBadge(meeting.status)}
                  {getMeetingTypeBadge(meeting.meetingType)}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{meeting.agenda}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleView(meeting)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(meeting)}><Edit className="mr-2 h-4 w-4" />Edit Meeting</DropdownMenuItem>
                  {meeting.status === "scheduled" && (
                    <DropdownMenuItem onClick={() => handleCompleteClick(meeting)}><CheckCircle2 className="mr-2 h-4 w-4" />Complete Meeting</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleDeleteClick(meeting)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(meeting.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {meeting.scheduledTime} ({meeting.duration} min)
              </span>
              {meeting.isVirtual ? (
                <span className="flex items-center gap-1 text-blue-600">
                  <Video className="h-4 w-4" />Virtual Meeting
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />{meeting.location}
                </span>
              )}
            </div>

            {mosque && (
              <div className="text-sm">
                <span className="text-muted-foreground">Related Mosque: </span>
                <span className="font-medium">{mosque.name}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Attendees:</span>
                <div className="flex -space-x-2">
                  {attendees.slice(0, 4).map((attendee) => (
                    <Avatar key={attendee?.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={attendee?.photoUrl} />
                      <AvatarFallback className="text-xs">{attendee?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  ))}
                  {attendees.length > 4 && (
                    <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                      +{attendees.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">({attendees.length})</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleView(meeting)}>
                  <FileText className="h-4 w-4 mr-1" />Details
                </Button>
                {meeting.status === "scheduled" && meeting.isVirtual && meeting.meetingLink && (
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700" asChild>
                    <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4 mr-1" />Join
                    </a>
                  </Button>
                )}
              </div>
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
          <h1 className="text-2xl font-bold tracking-tight">Shura Meetings</h1>
          <p className="text-muted-foreground">Schedule and manage meetings with Shura members and Imams</p>
        </div>
        <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />Schedule Meeting
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All recorded meetings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">Scheduled meetings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Successfully held</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">Meetings this month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search meetings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="imam_review">Imam Review</SelectItem>
                <SelectItem value="mosque_assessment">Mosque Assessment</SelectItem>
                <SelectItem value="quarterly_review">Quarterly Review</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tabView} onValueChange={(v) => setTabView(v as "upcoming" | "past")}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastMeetings.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {upcomingMeetings.length > 0 ? (
            upcomingMeetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} />)
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming meetings</h3>
                <p className="text-muted-foreground text-center mb-4">Schedule a new meeting to get started</p>
                <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />Schedule Meeting</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="past" className="space-y-4 mt-4">
          {pastMeetings.length > 0 ? (
            pastMeetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} />)
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No past meetings</h3>
                <p className="text-muted-foreground text-center">Completed and cancelled meetings will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Meeting Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>Create a new meeting with Shura members or Imams</DialogDescription>
          </DialogHeader>
          <MeetingForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} disabled={!formData.title || !formData.organizerId} className="bg-teal-600 hover:bg-teal-700">Schedule Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Meeting Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>Update meeting details</DialogDescription>
          </DialogHeader>
          <MeetingForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} className="bg-teal-600 hover:bg-teal-700">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Meeting Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedMeeting?.title}</DialogTitle>
            <DialogDescription>Meeting details and agenda</DialogDescription>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {getStatusBadge(selectedMeeting.status)}
                {getMeetingTypeBadge(selectedMeeting.meetingType)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Date</Label><p className="font-medium">{new Date(selectedMeeting.scheduledDate).toLocaleDateString()}</p></div>
                <div><Label className="text-muted-foreground">Time</Label><p className="font-medium">{selectedMeeting.scheduledTime} ({selectedMeeting.duration} min)</p></div>
                <div><Label className="text-muted-foreground">Location</Label><p className="font-medium">{selectedMeeting.isVirtual ? 'Virtual Meeting' : selectedMeeting.location}</p></div>
                <div><Label className="text-muted-foreground">Organizer</Label><p className="font-medium">{getMemberName(selectedMeeting.organizerId)}</p></div>
              </div>
              <div><Label className="text-muted-foreground">Agenda</Label><p className="mt-1">{selectedMeeting.agenda}</p></div>
              {selectedMeeting.notes && <div><Label className="text-muted-foreground">Notes</Label><p className="mt-1 bg-muted/50 p-3 rounded-lg">{selectedMeeting.notes}</p></div>}
              {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Decisions Made</Label>
                  <ul className="list-disc list-inside mt-1 space-y-1">{selectedMeeting.decisions.map((d, i) => <li key={i} className="text-sm">{d}</li>)}</ul>
                </div>
              )}
              {selectedMeeting.actionItems && selectedMeeting.actionItems.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Action Items</Label>
                  <ul className="list-disc list-inside mt-1 space-y-1">{selectedMeeting.actionItems.map((a, i) => <li key={i} className="text-sm">{a}</li>)}</ul>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Attendees ({selectedMeeting.attendeeIds.length})</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMeeting.attendeeIds.map(id => {
                    const attendee = getMember(id)
                    return attendee && (
                      <div key={id} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                        <Avatar className="h-6 w-6"><AvatarImage src={attendee.photoUrl} /><AvatarFallback className="text-xs">{attendee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                        <span className="text-sm">{attendee.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setIsViewDialogOpen(false); if (selectedMeeting) handleEdit(selectedMeeting) }} className="bg-teal-600 hover:bg-teal-700">Edit Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Meeting Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Complete Meeting</DialogTitle>
            <DialogDescription>Record meeting outcomes and action items</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Meeting Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Summary of the meeting..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Decisions Made (one per line)</Label>
              <Textarea value={decisionsInput} onChange={(e) => setDecisionsInput(e.target.value)} placeholder="Enter decisions made during the meeting..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Action Items (one per line)</Label>
              <Textarea value={actionItemsInput} onChange={(e) => setActionItemsInput(e.target.value)} placeholder="Enter action items and follow-ups..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCompleteMeeting} className="bg-teal-600 hover:bg-teal-700">Complete Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete &quot;{selectedMeeting?.title}&quot;? This action cannot be undone.</AlertDialogDescription>
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

