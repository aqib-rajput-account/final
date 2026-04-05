"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { Plus, Pencil, Trash2, Megaphone, Pin } from "lucide-react"
import { announcements as mockAnnouncementData, mosques } from "@/lib/data"
import type { Announcement } from "@/lib/types"

const announcements = mockAnnouncementData
import { toast } from "sonner"
import { format } from "date-fns"


const categoryOptions = ["general", "prayer", "event", "urgent", "community", "education"] as const

export default function AdminAnnouncementsPage() {
  const [announcementList, setAnnouncementList] = useState<Announcement[]>(announcements)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)

  const handleDelete = (id: string) => {
    setAnnouncementList(announcementList.filter(a => a.id !== id))
    toast.success("Announcement deleted successfully")
  }

  const handleTogglePin = (id: string) => {
    setAnnouncementList(announcementList.map(a => 
      a.id === id ? { ...a, isPinned: !a.isPinned } : a
    ))
    toast.success("Announcement updated")
  }

  const handleSave = (formData: FormData) => {
    const mosqueId = formData.get("mosqueId") as string

    const newAnnouncement: Announcement = {
      id: editingAnnouncement?.id || `announcement-${Date.now()}`,
      mosqueId,
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      category: formData.get("category") as Announcement["category"],
      isPinned: formData.get("isPinned") === "on",
      authorName: formData.get("author") as string,
      publishDate: formData.get("publishDate") as string,
      expiryDate: formData.get("expiryDate") as string || undefined,
      isActive: true,
      createdAt: editingAnnouncement?.createdAt || new Date().toISOString(),
    }

    if (editingAnnouncement) {
      setAnnouncementList(announcementList.map(a => a.id === editingAnnouncement.id ? newAnnouncement : a))
      toast.success("Announcement updated successfully")
    } else {
      setAnnouncementList([newAnnouncement, ...announcementList])
      toast.success("Announcement created successfully")
    }

    setEditingAnnouncement(null)
    setIsAddDialogOpen(false)
  }

  

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      prayer: "bg-primary/10 text-primary",
      event: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      community: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      education: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    }
    return colors[category] || colors.general
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Manage Announcements</h1>
          <p className="text-muted-foreground mt-1">Create and manage community announcements</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>Create a new announcement for the community.</DialogDescription>
            </DialogHeader>
            <AnnouncementForm onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Pinned Announcements */}
      {announcementList.filter(a => a.isPinned).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pin className="h-5 w-5 text-primary" />
              Pinned Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {announcementList.filter(a => a.isPinned).map((announcement) => (
                <div key={announcement.id} className="flex items-start justify-between rounded-lg border p-4 bg-primary/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{announcement.title}</h4>
                      <Badge className={getCategoryColor(announcement.category)}>
                        {announcement.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground">{mosques.find(m => m.id === announcement.mosqueId)?.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePin(announcement.id)}
                  >
                    Unpin
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            All Announcements ({announcementList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Mosque</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Pinned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcementList.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {announcement.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{mosques.find(m => m.id === announcement.mosqueId)?.name}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(announcement.category)}>
                      {announcement.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(announcement.publishDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={announcement.isPinned}
                      onCheckedChange={() => handleTogglePin(announcement.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingAnnouncement(announcement)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Announcement</DialogTitle>
                            <DialogDescription>Update announcement details.</DialogDescription>
                          </DialogHeader>
                          <AnnouncementForm announcement={announcement} onSave={handleSave} />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(announcement.id)}
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

function AnnouncementForm({ announcement, onSave }: { announcement?: Announcement; onSave: (data: FormData) => void }) {
  return (
    <form action={onSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={announcement?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mosqueId">Mosque</Label>
          <Select name="mosqueId" defaultValue={announcement?.mosqueId}>
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

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select name="category" defaultValue={announcement?.category || "general"}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="author">Author</Label>
        <Input id="author" name="author" defaultValue={announcement?.authorName || "Admin"} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" name="content" rows={5} defaultValue={announcement?.content} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="publishDate">Publish Date</Label>
          <Input 
            id="publishDate" 
            name="publishDate" 
            type="date" 
            defaultValue={announcement?.publishDate || new Date().toISOString().split('T')[0]} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
          <Input id="expiryDate" name="expiryDate" type="date" defaultValue={announcement?.expiryDate} />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="isPinned" defaultChecked={announcement?.isPinned} className="rounded" />
        <span className="text-sm">Pin this announcement</span>
      </label>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">
          {announcement ? "Update Announcement" : "Create Announcement"}
        </Button>
      </div>
    </form>
  )
}

