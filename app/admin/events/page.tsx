"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Calendar } from "lucide-react"
import { events as mockEventData, mosques } from "@/lib/data"
import type { Event } from "@/lib/types"

const events = mockEventData
import { toast } from "sonner"
import { format } from "date-fns"

const eventCategories = [
  "jummah",
  "lecture",
  "class",
  "community",
  "fundraising",
  "youth",
  "sisters",
  "other",
] as const

export default function AdminEventsPage() {
  const [eventList, setEventList] = useState<Event[]>(events)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  const handleDelete = (id: string) => {
    setEventList(eventList.filter(e => e.id !== id))
    toast.success("Event removed successfully")
  }

  const handleSave = (formData: FormData) => {
    const mosqueId = formData.get("mosqueId") as string
    const eventDate = formData.get("date") as string

    const newEvent: Event = {
      id: editingEvent?.id || `event-${Date.now()}`,
      mosqueId,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as Event["category"],
      startDate: eventDate,
      endDate: eventDate,
      startTime: formData.get("startTime") as string,
      endTime: formData.get("endTime") as string,
      location: formData.get("location") as string,
      speaker: formData.get("speaker") as string || undefined,
      isRecurring: formData.get("isRecurring") === "on",
      recurrencePattern: formData.get("recurrencePattern") as Event["recurrencePattern"],
      maxAttendees: parseInt(formData.get("maxAttendees") as string) || undefined,
      currentAttendees: editingEvent?.currentAttendees || 0,
      isActive: true,
      createdAt: editingEvent?.createdAt || new Date().toISOString(),
    }

    if (editingEvent) {
      setEventList(eventList.map(e => e.id === editingEvent.id ? newEvent : e))
      toast.success("Event updated successfully")
    } else {
      setEventList([...eventList, newEvent])
      toast.success("Event created successfully")
    }

    setEditingEvent(null)
    setIsAddDialogOpen(false)
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      jummah: "bg-primary text-primary-foreground",
      lecture: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      class: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      community: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      fundraising: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      youth: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      sisters: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    }
    return colors[category] || colors.other
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Manage Events</h1>
          <p className="text-muted-foreground mt-1">Create and manage mosque events and activities</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>Fill in the details to create a new event.</DialogDescription>
            </DialogHeader>
            <EventForm onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            All Events ({eventList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Mosque</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventList.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell className="text-muted-foreground">{mosques.find(m => m.id === event.mosqueId)?.name}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(event.category)}>
                      {event.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(event.startDate), "MMM d, yyyy")}</TableCell>
                  <TableCell>{event.startTime} - {event.endTime}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingEvent(event)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Event</DialogTitle>
                            <DialogDescription>Update event information.</DialogDescription>
                          </DialogHeader>
                          <EventForm event={event} onSave={handleSave} />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(event.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

function EventForm({ event, onSave }: { event?: Event; onSave: (data: FormData) => void }) {
  return (
    <form action={onSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Event Title</Label>
          <Input id="title" name="title" defaultValue={event?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mosqueId">Mosque</Label>
          <Select name="mosqueId" defaultValue={event?.mosqueId}>
            <SelectTrigger>
              <SelectValue placeholder="Select mosque" />
            </SelectTrigger>
            <SelectContent>
              {mosques.map((mosque) => (
                <SelectItem key={mosque.id} value={mosque.id}>
                  {mosque.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select name="category" defaultValue={event?.category}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {eventCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="speaker">Speaker (optional)</Label>
          <Input id="speaker" name="speaker" defaultValue={event?.speaker} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={event?.startDate?.split('T')[0]} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue={event?.startTime} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue={event?.endTime} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location/Room</Label>
        <Input id="location" name="location" defaultValue={event?.location} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} defaultValue={event?.description} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maxAttendees">Max Attendees (optional)</Label>
          <Input id="maxAttendees" name="maxAttendees" type="number" defaultValue={event?.maxAttendees} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isRecurring" defaultChecked={event?.isRecurring} className="rounded" />
          <span className="text-sm">Recurring Event</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">
          {event ? "Update Event" : "Create Event"}
        </Button>
      </div>
    </form>
  )
}

