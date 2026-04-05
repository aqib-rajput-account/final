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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, MapPin, Users, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"

export default function AdminMosquesPage() {
  const [mosqueList, setMosqueList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingMosque, setEditingMosque] = useState<any | null>(null)

  const fetchMosques = async () => {
    try {
      const res = await fetch("/api/mosques?limit=100")
      const data = await res.json()
      if (data.mosques) {
        setMosqueList(data.mosques)
      }
    } catch (error) {
      toast.error("Failed to fetch mosques")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMosques()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mosque?")) return
    
    try {
      const res = await fetch(`/api/mosques/${id}`, { method: "DELETE" })
      if (res.ok) {
        setMosqueList(mosqueList.filter(m => m.id !== id))
        toast.success("Mosque removed successfully")
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      toast.error("Error deleting mosque")
    }
  }

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`/api/mosques/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_verified: true }),
      })
      
      if (res.ok) {
        const { mosque } = await res.json()
        setMosqueList(mosqueList.map(m => m.id === id ? mosque : m))
        toast.success("Mosque verified successfully")
      }
    } catch (error) {
      toast.error("Failed to verify mosque")
    }
  }

  const handleSave = async (formData: FormData) => {
    const data = {
      name: formData.get("name"),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      country: formData.get("country"),
      zip_code: formData.get("zipCode"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      website: formData.get("website") || null,
      description: formData.get("description"),
      capacity: parseInt(formData.get("capacity") as string) || 0,
      established_year: parseInt(formData.get("established") as string) || new Date().getFullYear(),
      latitude: parseFloat(formData.get("lat") as string) || 0,
      longitude: parseFloat(formData.get("lng") as string) || 0,
    }

    try {
      const url = editingMosque ? `/api/mosques/${editingMosque.id}` : "/api/mosques"
      const method = editingMosque ? "PATCH" : "POST"
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        toast.success(editingMosque ? "Mosque updated" : "Mosque added")
        fetchMosques()
        setEditingMosque(null)
        setIsAddDialogOpen(false)
      } else {
        const err = await res.json()
        throw new Error(err.error)
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Manage Mosques</h1>
          <p className="text-muted-foreground mt-1">Add, edit, and manage mosque listings</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Mosque
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Mosque</DialogTitle>
              <DialogDescription>Register a new mosque in the directory.</DialogDescription>
            </DialogHeader>
            <MosqueForm onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Registered Mosques ({mosqueList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Established</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium italic">Loading mosques...</p>
                  </TableCell>
                </TableRow>
              ) : mosqueList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                    No mosques found.
                  </TableCell>
                </TableRow>
              ) : (
                mosqueList.map((mosque) => (
                  <TableRow key={mosque.id}>
                    <TableCell className="font-medium">{mosque.name}</TableCell>
                    <TableCell>{mosque.city}, {mosque.state}</TableCell>
                    <TableCell>{mosque.established_year}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {mosque.capacity}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={mosque.is_verified ? "default" : "secondary"}>
                        {mosque.is_verified ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!mosque.is_verified && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Verify Mosque"
                            className="text-primary hover:bg-primary/10"
                            onClick={() => handleVerify(mosque.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingMosque(mosque)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Mosque</DialogTitle>
                              <DialogDescription>Update mosque information.</DialogDescription>
                            </DialogHeader>
                            <MosqueForm mosque={mosque} onSave={handleSave} />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(mosque.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function MosqueForm({ mosque, onSave }: { mosque?: any; onSave: (data: FormData) => void }) {
  return (
    <form action={onSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Mosque Name</Label>
          <Input id="name" name="name" defaultValue={mosque?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="established">Established Year</Label>
          <Input id="established" name="established" defaultValue={mosque?.established_year} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={mosque?.address} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={mosque?.city} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={mosque?.state} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">Zip Code</Label>
          <Input id="zipCode" name="zipCode" defaultValue={mosque?.zip_code} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" defaultValue={mosque?.country || "USA"} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={mosque?.phone} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={mosque?.email} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website (optional)</Label>
        <Input id="website" name="website" type="url" defaultValue={mosque?.website} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" defaultValue={mosque?.capacity} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input id="lat" name="lat" type="number" step="any" defaultValue={mosque?.latitude} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input id="lng" name="lng" type="number" step="any" defaultValue={mosque?.longitude} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} defaultValue={mosque?.description} required />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">
          {mosque ? "Update Mosque" : "Add Mosque"}
        </Button>
      </div>
    </form>
  )
}
