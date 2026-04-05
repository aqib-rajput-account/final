"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Edit, Trash2, GraduationCap, BookOpen, Award, Mail, Phone, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { imams as mockImamData, mosques } from "@/lib/data"
import type { Imam } from "@/lib/types"

const imams = mockImamData

export default function AdminImamsPage() {
  const [imamList, setImamList] = useState<Imam[]>(imams)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMosque, setSelectedMosque] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingImam, setEditingImam] = useState<Imam | null>(null)

  const filteredImams = imamList.filter((imam) => {
    const matchesSearch = 
      imam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imam.specializations.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesMosque = selectedMosque === "all" || imam.mosqueId === selectedMosque
    return matchesSearch && matchesMosque
  })

  const handleSave = (formData: FormData) => {
    const characterTraits = (formData.get("characterTraits") as string)?.split(",").map(s => s.trim()).filter(Boolean) || []
    const availableServices = (formData.get("availableServices") as string)?.split(",").map(s => s.trim()).filter(Boolean) || []
    const communityFocus = (formData.get("communityFocus") as string)?.split(",").map(s => s.trim()).filter(Boolean) || []
    
    const newImam: Imam = {
      id: editingImam?.id || `imam-${Date.now()}`,
      mosqueId: formData.get("mosqueId") as string,
      name: formData.get("name") as string,
      title: formData.get("title") as string,
      biography: formData.get("biography") as string,
      education: editingImam?.education || [],
      specializations: (formData.get("specializations") as string).split(",").map(s => s.trim()).filter(Boolean),
      languages: (formData.get("languages") as string).split(",").map(s => s.trim()).filter(Boolean),
      yearsOfExperience: parseInt(formData.get("yearsOfExperience") as string) || 0,
      previousPositions: editingImam?.previousPositions || [],
      certifications: (formData.get("certifications") as string).split(",").map(s => s.trim()).filter(Boolean),
      contactEmail: formData.get("contactEmail") as string || undefined,
      contactPhone: formData.get("contactPhone") as string || undefined,
      officeHours: formData.get("officeHours") as string || undefined,
      characterTraits: characterTraits.length > 0 ? characterTraits : undefined,
      availableServices: availableServices.length > 0 ? availableServices : undefined,
      communityFocus: communityFocus.length > 0 ? communityFocus : undefined,
      teachingStyle: formData.get("teachingStyle") as string || undefined,
      personalMessage: formData.get("personalMessage") as string || undefined,
      weeklySchedule: editingImam?.weeklySchedule,
      isActive: formData.get("isActive") === "on",
      appointmentDate: formData.get("appointmentDate") as string,
      createdAt: editingImam?.createdAt || new Date().toISOString(),
    }

    if (editingImam) {
      setImamList(imamList.map(i => i.id === editingImam.id ? newImam : i))
      toast.success("Imam profile updated successfully")
    } else {
      setImamList([newImam, ...imamList])
      toast.success("New imam profile added successfully")
    }
    
    setEditingImam(null)
    setIsAddDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setImamList(imamList.filter(i => i.id !== id))
    toast.success("Imam profile removed")
  }

  const activeImams = imamList.filter(i => i.isActive).length
  const totalExperience = imamList.reduce((sum, i) => sum + i.yearsOfExperience, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imam Management</h1>
          <p className="text-muted-foreground">
            Manage imam profiles and their information
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Imam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Imam</DialogTitle>
              <DialogDescription>Create a new imam profile with their details.</DialogDescription>
            </DialogHeader>
            <ImamForm onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imams</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{imamList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeImams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Combined Experience</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExperience}+ years</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mosques Covered</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(imamList.map(i => i.mosqueId)).size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search imams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedMosque} onValueChange={setSelectedMosque}>
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

      {/* Imam Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredImams.map((imam) => (
          <Card key={imam.id} className={!imam.isActive ? "opacity-60" : ""}>
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="flex gap-4">
                <Avatar className="h-20 w-20 rounded-xl">
                  <AvatarImage src={imam.photoUrl} alt={imam.name} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg">
                    {imam.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{imam.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{imam.title}</Badge>
                        {!imam.isActive && <Badge variant="outline">Inactive</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditingImam(imam)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Imam Profile</DialogTitle>
                            <DialogDescription>Update imam information.</DialogDescription>
                          </DialogHeader>
                          <ImamForm imam={imam} onSave={handleSave} />
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Imam Profile</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {imam.name}{"'"}s profile? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(imam.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {imam.biography}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {imam.specializations.slice(0, 3).map((spec, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                    {imam.specializations.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{imam.specializations.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      {imam.yearsOfExperience}+ years
                    </span>
                    {imam.contactEmail && (
                      <a href={`mailto:${imam.contactEmail}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                    )}
                    {imam.contactPhone && (
                      <a href={`tel:${imam.contactPhone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="h-3 w-3" />
                        Call
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {mosques.find(m => m.id === imam.mosqueId)?.name}
                    </p>
                    <Link href={`/mosques/${imam.mosqueId}/imam/${imam.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="text-xs gap-1">
                        <ExternalLink className="h-3 w-3" />
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredImams.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No imams found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ImamForm({ imam, onSave }: { imam?: Imam; onSave: (data: FormData) => void }) {
  return (
    <form action={onSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" defaultValue={imam?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title/Position</Label>
          <Select name="title" defaultValue={imam?.title || "Head Imam"}>
            <SelectTrigger>
              <SelectValue placeholder="Select title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Head Imam">Head Imam</SelectItem>
              <SelectItem value="Assistant Imam">Assistant Imam</SelectItem>
              <SelectItem value="Khateeb">Khateeb</SelectItem>
              <SelectItem value="Quran Teacher">Quran Teacher</SelectItem>
              <SelectItem value="Scholar in Residence">Scholar in Residence</SelectItem>
              <SelectItem value="Youth Imam">Youth Imam</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mosqueId">Mosque</Label>
        <Select name="mosqueId" defaultValue={imam?.mosqueId || mosques[0]?.id}>
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

      <div className="space-y-2">
        <Label htmlFor="biography">Biography</Label>
        <Textarea
          id="biography"
          name="biography"
          defaultValue={imam?.biography}
          rows={4}
          placeholder="Brief biography of the imam..."
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="yearsOfExperience">Years of Experience</Label>
          <Input
            id="yearsOfExperience"
            name="yearsOfExperience"
            type="number"
            defaultValue={imam?.yearsOfExperience}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="appointmentDate">Appointment Date</Label>
          <Input
            id="appointmentDate"
            name="appointmentDate"
            type="date"
            defaultValue={imam?.appointmentDate}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="specializations">Specializations (comma-separated)</Label>
        <Input
          id="specializations"
          name="specializations"
          defaultValue={imam?.specializations.join(", ")}
          placeholder="e.g., Islamic Jurisprudence, Quranic Tafseer, Family Counseling"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="languages">Languages (comma-separated)</Label>
        <Input
          id="languages"
          name="languages"
          defaultValue={imam?.languages.join(", ")}
          placeholder="e.g., Arabic, English, Urdu"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="certifications">Certifications (comma-separated)</Label>
        <Input
          id="certifications"
          name="certifications"
          defaultValue={imam?.certifications?.join(", ")}
          placeholder="e.g., Ijazah in Quran, Islamic Studies Certificate"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={imam?.contactEmail}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            defaultValue={imam?.contactPhone}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="officeHours">Office Hours</Label>
        <Input
          id="officeHours"
          name="officeHours"
          defaultValue={imam?.officeHours}
          placeholder="e.g., Monday - Thursday: 10 AM - 12 PM"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="characterTraits">Character Traits (comma-separated)</Label>
        <Input
          id="characterTraits"
          name="characterTraits"
          defaultValue={imam?.characterTraits?.join(", ")}
          placeholder="e.g., Compassionate, Scholarly, Patient, Approachable"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="availableServices">Available Services (comma-separated)</Label>
        <Input
          id="availableServices"
          name="availableServices"
          defaultValue={imam?.availableServices?.join(", ")}
          placeholder="e.g., Marriage Counseling, Nikah Services, Youth Guidance"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="communityFocus">Community Focus Areas (comma-separated)</Label>
        <Input
          id="communityFocus"
          name="communityFocus"
          defaultValue={imam?.communityFocus?.join(", ")}
          placeholder="e.g., Family Counseling, Youth Guidance, New Muslim Support"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teachingStyle">Teaching Style</Label>
        <Textarea
          id="teachingStyle"
          name="teachingStyle"
          defaultValue={imam?.teachingStyle}
          rows={2}
          placeholder="Describe the imam's teaching approach..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="personalMessage">Personal Message to Community</Label>
        <Textarea
          id="personalMessage"
          name="personalMessage"
          defaultValue={imam?.personalMessage}
          rows={3}
          placeholder="A personal message from the imam to the community..."
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="isActive" name="isActive" defaultChecked={imam?.isActive ?? true} />
        <Label htmlFor="isActive">Active Status</Label>
      </div>

      <Button type="submit" className="w-full">
        {imam ? "Update Imam Profile" : "Add Imam Profile"}
      </Button>
    </form>
  )
}

