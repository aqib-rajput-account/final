"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Plus, 
  Building2, 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2, 
  Clock,
  XCircle,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Phone,
  Mail
} from "lucide-react"
import { mosqueRegistrations, shuraMembers } from "@/lib/data"
import type { MosqueRegistration } from "@/lib/types"

export default function ShuraRegistrationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredRegistrations = mosqueRegistrations.filter((reg) => {
    const matchesSearch = 
      reg.mosqueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || reg.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const pendingRegistrations = filteredRegistrations.filter(r => r.status === "pending_review" || r.status === "under_review")
  const processedRegistrations = filteredRegistrations.filter(r => r.status === "approved" || r.status === "rejected")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>
      case "pending_review":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
      case "under_review":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Eye className="w-3 h-3 mr-1" /> Under Review</Badge>
      case "visit_scheduled":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Calendar className="w-3 h-3 mr-1" /> Visit Scheduled</Badge>
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
      default:
        return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>
    }
  }

  const stats = {
    total: mosqueRegistrations.length,
    pending: mosqueRegistrations.filter(r => r.status === "pending_review").length,
    underReview: mosqueRegistrations.filter(r => r.status === "under_review" || r.status === "visit_scheduled").length,
    approved: mosqueRegistrations.filter(r => r.status === "approved").length,
    rejected: mosqueRegistrations.filter(r => r.status === "rejected").length,
  }

  const RegistrationCard = ({ registration }: { registration: MosqueRegistration }) => {
    const reviewer = registration.assignedShuraMember ? shuraMembers.find(m => m.id === registration.assignedShuraMember) : null

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  <h3 className="font-semibold text-lg">{registration.mosqueName}</h3>
                  {getStatusBadge(registration.status)}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {registration.address}, {registration.city}, {registration.state}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Contact Person</p>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {registration.contactPerson}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {registration.contactPhone}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" />
                  {registration.contactEmail}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(registration.submittedDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Estimated Capacity</p>
                <p className="font-medium">{registration.estimatedCapacity} worshippers</p>
              </div>
              <div>
                <p className="text-muted-foreground">Has Imam</p>
                <p className="font-medium">{registration.currentImamName ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Year Established</p>
                <p className="font-medium">{registration.establishedYear || "N/A"}</p>
              </div>
            </div>

            {registration.facilities && registration.facilities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Facilities</p>
                <div className="flex flex-wrap gap-1">
                  {registration.facilities.map((facility, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{facility}</Badge>
                  ))}
                </div>
              </div>
            )}

            {reviewer && (
              <div className="text-sm border-t pt-4">
                <p className="text-muted-foreground">Assigned to: <span className="font-medium text-foreground">{reviewer.name}</span></p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>{registration.mosqueName}</DialogTitle>
                    <DialogDescription>Registration application details</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex gap-2">
                      {getStatusBadge(registration.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Address</Label>
                        <p className="font-medium">{registration.address}</p>
                        <p className="text-sm text-muted-foreground">{registration.city}, {registration.state} {registration.zipCode}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Established</Label>
                        <p className="font-medium">{registration.establishedYear || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Contact Person</Label>
                        <p className="font-medium">{registration.contactPerson}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Contact Phone</Label>
                        <p className="font-medium">{registration.contactPhone}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Contact Email</Label>
                        <p className="font-medium">{registration.contactEmail}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Capacity</Label>
                        <p className="font-medium">{registration.estimatedCapacity} worshippers</p>
                      </div>
                    </div>
                    {registration.description && (
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="mt-1">{registration.description}</p>
                      </div>
                    )}
                    {registration.facilities && registration.facilities.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">Facilities</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {registration.facilities.map((facility, i) => (
                            <Badge key={i} variant="outline">{facility}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {registration.reviewNotes && (
                      <div>
                        <Label className="text-muted-foreground">Review Notes</Label>
                        <p className="mt-1">{registration.reviewNotes}</p>
                      </div>
                    )}
                  </div>
                  {(registration.status === "pending_review" || registration.status === "under_review") && (
                    <DialogFooter className="gap-2">
                      <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
              {(registration.status === "pending_review" || registration.status === "under_review") && (
                <>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mosque Registrations</h1>
          <p className="text-muted-foreground">Review and process new mosque registration applications</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Registration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Register New Mosque</DialogTitle>
              <DialogDescription>Add a new mosque to the community network</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="name">Mosque Name</Label>
                <Input id="name" placeholder="Enter mosque name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="street">Street Address</Label>
                <Input id="street" placeholder="Enter street address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="City" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="State" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" placeholder="ZIP Code" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year">Year Established</Label>
                  <Input id="year" type="number" placeholder="e.g., 2010" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Estimated Capacity</Label>
                <Input id="capacity" type="number" placeholder="Number of worshippers" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Person</Label>
                <Input id="contact" placeholder="Full name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="Phone number" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Email address" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Brief description of the mosque..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setIsAddDialogOpen(false)}>Submit Registration</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Applications</p>
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
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.underReview}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Processing Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Processing Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Applications Processed</span>
              <span className="font-medium">{stats.approved + stats.rejected} / {stats.total}</span>
            </div>
            <Progress value={stats.total > 0 ? ((stats.approved + stats.rejected) / stats.total) * 100 : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by mosque name, city, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="visit_scheduled">Visit Scheduled</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingRegistrations.length})</TabsTrigger>
          <TabsTrigger value="processed">Processed ({processedRegistrations.length})</TabsTrigger>
          <TabsTrigger value="all">All ({filteredRegistrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRegistrations.length > 0 ? (
            <div className="space-y-4">
              {pendingRegistrations.map((reg) => (
                <RegistrationCard key={reg.id} registration={reg} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mb-4" />
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="text-muted-foreground">No pending registrations to review</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {processedRegistrations.length > 0 ? (
            <div className="space-y-4">
              {processedRegistrations.map((reg) => (
                <RegistrationCard key={reg.id} registration={reg} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No processed registrations</h3>
                <p className="text-muted-foreground">Processed registrations will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredRegistrations.length > 0 ? (
            <div className="space-y-4">
              {filteredRegistrations.map((reg) => (
                <RegistrationCard key={reg.id} registration={reg} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No registrations found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

