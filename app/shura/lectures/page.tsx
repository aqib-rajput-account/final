"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { 
  Search, 
  Plus, 
  Mic,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  BookOpen,
  Play,
  Eye,
  Edit,
  MoreHorizontal,
  Download,
  Share2,
  Trash2,
  CheckCircle,
  XCircle
} from "lucide-react"
import { useShuraStore, type LectureCRUD } from "@/lib/stores"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type LectureFormData = {
  title: string
  topic: string
  speaker: string
  speakerId: string
  speakerRole: string
  type: LectureCRUD['type']
  date: string
  time: string
  duration: string
  venue: string
  venueId: string
  description: string
  hasRecording: boolean
  recordingUrl: string
}

const defaultFormData: LectureFormData = {
  title: "",
  topic: "",
  speaker: "",
  speakerId: "",
  speakerRole: "",
  type: "educational",
  date: "",
  time: "",
  duration: "",
  venue: "",
  venueId: "",
  description: "",
  hasRecording: false,
  recordingUrl: ""
}

export default function LecturesPage() {
  const { lectures, members, mosques, addLecture, updateLecture, deleteLecture } = useShuraStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedLecture, setSelectedLecture] = useState<LectureCRUD | null>(null)
  const [formData, setFormData] = useState<LectureFormData>(defaultFormData)
  const [isEditing, setIsEditing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const filteredLectures = lectures.filter(lecture => {
    const matchesSearch = 
      lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lecture.speaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lecture.topic.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || lecture.type === typeFilter
    return matchesSearch && matchesType
  })

  const upcomingLectures = filteredLectures.filter(l => l.status === "upcoming")
  const completedLectures = filteredLectures.filter(l => l.status === "completed")
  const cancelledLectures = filteredLectures.filter(l => l.status === "cancelled")

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "friday-khutbah":
        return <Badge className="bg-emerald-600">Friday Khutbah</Badge>
      case "educational":
        return <Badge className="bg-blue-600">Educational</Badge>
      case "special-event":
        return <Badge className="bg-purple-600">Special Event</Badge>
      case "training":
        return <Badge className="bg-amber-600">Training</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Upcoming</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Completed</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const stats = {
    totalLectures: lectures.length,
    upcoming: lectures.filter(l => l.status === "upcoming").length,
    completed: lectures.filter(l => l.status === "completed").length,
    totalAttendees: lectures.reduce((sum, l) => sum + (l.attendees || 0), 0),
  }

  const handleOpenCreate = () => {
    setFormData(defaultFormData)
    setIsEditing(false)
    setSelectedLecture(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (lecture: LectureCRUD) => {
    setFormData({
      title: lecture.title,
      topic: lecture.topic,
      speaker: lecture.speaker,
      speakerId: lecture.speakerId || "",
      speakerRole: lecture.speakerRole || "",
      type: lecture.type,
      date: lecture.date,
      time: lecture.time,
      duration: lecture.duration || "",
      venue: lecture.venue,
      venueId: lecture.venueId || "",
      description: lecture.description || "",
      hasRecording: lecture.hasRecording,
      recordingUrl: lecture.recordingUrl || ""
    })
    setIsEditing(true)
    setSelectedLecture(lecture)
    setIsDialogOpen(true)
  }

  const handleOpenView = (lecture: LectureCRUD) => {
    setSelectedLecture(lecture)
    setIsViewDialogOpen(true)
  }

  const handleOpenDelete = (lecture: LectureCRUD) => {
    setSelectedLecture(lecture)
    setIsDeleteDialogOpen(true)
  }

  const handleSpeakerChange = (speakerId: string) => {
    const member = members.find(m => m.id === speakerId)
    if (member) {
      setFormData(prev => ({
        ...prev,
        speakerId,
        speaker: member.name,
        speakerRole: member.role
      }))
    }
  }

  const handleVenueChange = (venueId: string) => {
    if (venueId === "online") {
      setFormData(prev => ({
        ...prev,
        venueId: "online",
        venue: "Online (Virtual)"
      }))
    } else {
      const mosque = mosques.find(m => m.id === venueId)
      if (mosque) {
        setFormData(prev => ({
          ...prev,
          venueId,
          venue: mosque.name
        }))
      }
    }
  }

  const handleSubmit = () => {
    if (!formData.title || !formData.date || !formData.time || !formData.venue || !formData.speaker) {
      toast.error("Please fill in all required fields")
      return
    }

    if (isEditing && selectedLecture) {
      updateLecture(selectedLecture.id, {
        title: formData.title,
        topic: formData.topic,
        speaker: formData.speaker,
        speakerId: formData.speakerId,
        speakerRole: formData.speakerRole,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        venue: formData.venue,
        venueId: formData.venueId,
        description: formData.description,
        hasRecording: formData.hasRecording,
        recordingUrl: formData.recordingUrl
      })
      toast.success("Lecture updated successfully")
    } else {
      addLecture({
        title: formData.title,
        topic: formData.topic,
        speaker: formData.speaker,
        speakerId: formData.speakerId,
        speakerRole: formData.speakerRole,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        venue: formData.venue,
        venueId: formData.venueId,
        status: "upcoming",
        attendees: 0,
        hasRecording: false,
        description: formData.description
      })
      toast.success("Lecture scheduled successfully")
    }
    setIsDialogOpen(false)
  }

  const handleDelete = () => {
    if (selectedLecture) {
      deleteLecture(selectedLecture.id)
      toast.success("Lecture deleted successfully")
      setIsDeleteDialogOpen(false)
      setSelectedLecture(null)
    }
  }

  const handleMarkCompleted = (lecture: LectureCRUD) => {
    updateLecture(lecture.id, { status: "completed" })
    toast.success("Lecture marked as completed")
  }

  const handleCancelLecture = (lecture: LectureCRUD) => {
    updateLecture(lecture.id, { status: "cancelled" })
    toast.success("Lecture cancelled")
  }

  if (!mounted) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lectures & Khutbahs</h1>
          <p className="text-muted-foreground">Schedule and manage lectures, khutbahs, and educational sessions</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Lecture
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Lectures</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLectures}</div>
            <p className="text-xs text-muted-foreground">All sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">Scheduled sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Delivered lectures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalAttendees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">People reached</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingLectures.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedLectures.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledLectures.length})</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search lectures..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="friday-khutbah">Friday Khutbah</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="special-event">Special Event</SelectItem>
              <SelectItem value="training">Training</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingLectures.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Upcoming Lectures</h3>
                <p className="text-muted-foreground text-center mb-4">Schedule a lecture to get started</p>
                <Button onClick={handleOpenCreate} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Lecture
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingLectures.map(lecture => (
                <Card key={lecture.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getTypeBadge(lecture.type)}
                        </div>
                        <CardTitle className="text-lg">{lecture.title}</CardTitle>
                        <CardDescription>{lecture.topic}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenView(lecture)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(lecture)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Lecture
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkCompleted(lecture)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleCancelLecture(lecture)} className="text-amber-600">
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Lecture
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDelete(lecture)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={lecture.speakerImage} />
                        <AvatarFallback className="bg-teal-100 text-teal-700">
                          {lecture.speaker.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{lecture.speaker}</p>
                        <p className="text-sm text-muted-foreground">{lecture.speakerRole}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(lecture.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{lecture.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                        <MapPin className="h-4 w-4" />
                        <span>{lecture.venue}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenView(lecture)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => handleOpenEdit(lecture)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedLectures.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Completed Lectures</h3>
                <p className="text-muted-foreground text-center">Completed lectures will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedLectures.map(lecture => (
                <Card key={lecture.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={lecture.speakerImage} />
                          <AvatarFallback className="bg-teal-100 text-teal-700">
                            {lecture.speaker.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{lecture.title}</h3>
                            {getTypeBadge(lecture.type)}
                          </div>
                          <p className="text-sm text-muted-foreground">{lecture.speaker}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(lecture.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {lecture.venue}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {lecture.attendees} attendees
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lecture.hasRecording && (
                          <Button variant="outline" size="sm">
                            <Play className="mr-2 h-4 w-4" />
                            Watch
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleOpenView(lecture)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Report
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(lecture)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDelete(lecture)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledLectures.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Cancelled Lectures</h3>
                <p className="text-muted-foreground text-center">Cancelled lectures will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {cancelledLectures.map(lecture => (
                <Card key={lecture.id} className="border-red-200 bg-red-50/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 opacity-60">
                          <AvatarImage src={lecture.speakerImage} />
                          <AvatarFallback className="bg-red-100 text-red-700">
                            {lecture.speaker.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold line-through text-muted-foreground">{lecture.title}</h3>
                            {getStatusBadge(lecture.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{lecture.speaker}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(lecture.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {lecture.venue}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          updateLecture(lecture.id, { status: "upcoming" })
                          toast.success("Lecture rescheduled")
                        }}>
                          Reschedule
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(lecture)} className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recordings" className="space-y-4">
          {completedLectures.filter(l => l.hasRecording).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recordings Available</h3>
                <p className="text-muted-foreground text-center">Lecture recordings will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {completedLectures.filter(l => l.hasRecording).map(lecture => (
                <Card key={lecture.id} className="overflow-hidden">
                  <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                    <Video className="h-12 w-12 text-slate-400" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-8 w-8 text-teal-600 ml-1" />
                      </div>
                    </div>
                    <Badge className="absolute top-2 right-2 bg-black/70">{lecture.duration}</Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{lecture.title}</CardTitle>
                    <CardDescription>{lecture.speaker}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{new Date(lecture.date).toLocaleDateString()}</span>
                      <span>{lecture.views || 0} views</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Lecture" : "Schedule New Lecture"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the lecture details below" : "Schedule a lecture, khutbah, or educational session"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title"
                placeholder="Enter lecture title" 
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: LectureCRUD['type']) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friday-khutbah">Friday Khutbah</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="special-event">Special Event</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Speaker *</Label>
                <Select value={formData.speakerId} onValueChange={handleSpeakerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select speaker" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date *</Label>
                <Input 
                  id="date"
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Time *</Label>
                <Input 
                  id="time"
                  type="time" 
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Venue / Mosque *</Label>
                <Select value={formData.venueId} onValueChange={handleVenueChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {mosques.map(mosque => (
                      <SelectItem key={mosque.id} value={mosque.id}>{mosque.name}</SelectItem>
                    ))}
                    <SelectItem value="online">Online (Virtual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration</Label>
                <Input 
                  id="duration"
                  placeholder="e.g., 1:30:00" 
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic">Topic</Label>
              <Input 
                id="topic"
                placeholder="Brief topic description" 
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                placeholder="Describe the lecture topic and key points..." 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            {isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="recordingUrl">Recording URL (if available)</Label>
                <Input 
                  id="recordingUrl"
                  placeholder="https://..." 
                  value={formData.recordingUrl}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    recordingUrl: e.target.value,
                    hasRecording: e.target.value.length > 0
                  }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSubmit}>
              {isEditing ? "Update Lecture" : "Schedule Lecture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lecture Details</DialogTitle>
          </DialogHeader>
          {selectedLecture && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedLecture.speakerImage} />
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-lg">
                    {selectedLecture.speaker.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{selectedLecture.title}</h3>
                  <p className="text-muted-foreground">{selectedLecture.topic}</p>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(selectedLecture.type)}
                    {getStatusBadge(selectedLecture.status)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Speaker</Label>
                  <p className="font-medium">{selectedLecture.speaker}</p>
                  <p className="text-sm text-muted-foreground">{selectedLecture.speakerRole}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Venue</Label>
                  <p className="font-medium">{selectedLecture.venue}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date & Time</Label>
                  <p className="font-medium">{new Date(selectedLecture.date).toLocaleDateString()} at {selectedLecture.time}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p className="font-medium">{selectedLecture.duration || "Not specified"}</p>
                </div>
                {selectedLecture.status === "completed" && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Attendees</Label>
                      <p className="font-medium">{selectedLecture.attendees}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Recording</Label>
                      <p className="font-medium">{selectedLecture.hasRecording ? "Available" : "Not available"}</p>
                    </div>
                  </>
                )}
              </div>
              
              {selectedLecture.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedLecture.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => {
              setIsViewDialogOpen(false)
              if (selectedLecture) handleOpenEdit(selectedLecture)
            }}>
              Edit Lecture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lecture "{selectedLecture?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

