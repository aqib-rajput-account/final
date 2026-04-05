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
import { 
  Search, 
  Plus, 
  ClipboardCheck, 
  Calendar, 
  Star, 
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  FileText,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Award
} from "lucide-react"
import { mosqueAssessments, shuraMembers, shuraMosques as mosques } from "@/lib/data"
import { mockMosques } from "@/lib/data"

// Combine mosques
const allMosques = mosques.length > 0 ? mosques : mockMosques.map(m => ({
  id: m.id,
  name: m.name,
  address: m.address,
  region: m.state,
  capacity: m.capacity,
}))

export default function ShuraAssessmentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [certificationFilter, setCertificationFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredAssessments = mosqueAssessments.filter((assessment) => {
    const mosque = allMosques.find(m => m.id === assessment.mosqueId)
    
    const matchesSearch = 
      mosque?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.status.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || assessment.status === statusFilter
    const matchesCertification = certificationFilter === "all" || assessment.certificationLevel === certificationFilter
    
    return matchesSearch && matchesStatus && matchesCertification
  })

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-emerald-600"
    if (rating >= 3) return "text-amber-600"
    return "text-red-600"
  }

  const getRatingBg = (rating: number) => {
    if (rating >= 4) return "bg-emerald-500/10"
    if (rating >= 3) return "bg-amber-500/10"
    return "bg-red-500/10"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Excellent</Badge>
      case "good":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><TrendingUp className="w-3 h-3 mr-1" /> Good</Badge>
      case "satisfactory":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Minus className="w-3 h-3 mr-1" /> Satisfactory</Badge>
      case "needs_improvement":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><AlertTriangle className="w-3 h-3 mr-1" /> Needs Improvement</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCertificationBadge = (level?: string) => {
    switch (level) {
      case "gold":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Award className="w-3 h-3 mr-1" /> Gold</Badge>
      case "silver":
        return <Badge className="bg-gray-400/10 text-gray-600 border-gray-400/20"><Award className="w-3 h-3 mr-1" /> Silver</Badge>
      case "bronze":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20"><Award className="w-3 h-3 mr-1" /> Bronze</Badge>
      case "basic":
        return <Badge variant="outline"><Award className="w-3 h-3 mr-1" /> Basic</Badge>
      default:
        return null
    }
  }

  const stats = {
    total: mosqueAssessments.length,
    avgRating: mosqueAssessments.length > 0 ? (mosqueAssessments.reduce((acc, a) => acc + a.overallRating, 0) / mosqueAssessments.length).toFixed(1) : "0",
    excellent: mosqueAssessments.filter(a => a.status === "excellent").length,
    needsAttention: mosqueAssessments.filter(a => a.overallRating < 3.5).length,
  }

  const categoryLabels: Record<string, string> = {
    cleanliness: "Cleanliness",
    prayerServices: "Prayer Services",
    educationPrograms: "Education Programs",
    communityEngagement: "Community Engagement",
    financialTransparency: "Financial Transparency",
    managementEfficiency: "Management Efficiency",
    imamPerformance: "Imam Performance",
    youthPrograms: "Youth Programs",
    womenFacilities: "Women's Facilities",
    safetyCompliance: "Safety Compliance"
  }

  const AssessmentCard = ({ assessment }: { assessment: typeof mosqueAssessments[0] }) => {
    const mosque = allMosques.find(m => m.id === assessment.mosqueId)
    const categories = Object.entries(assessment.categoryRatings)

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  <h3 className="font-semibold text-lg">{mosque?.name || "Unknown Mosque"}</h3>
                  {getStatusBadge(assessment.status)}
                  {getCertificationBadge(assessment.certificationLevel)}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Last assessed: {new Date(assessment.lastVisitDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total visits: {assessment.totalVisits}
                </p>
              </div>
              <div className={`flex flex-col items-center p-3 rounded-lg ${getRatingBg(assessment.overallRating)}`}>
                <div className="flex items-center gap-1">
                  <Star className={`h-5 w-5 ${getRatingColor(assessment.overallRating)} fill-current`} />
                  <span className={`text-2xl font-bold ${getRatingColor(assessment.overallRating)}`}>{assessment.overallRating}</span>
                </div>
                <span className="text-xs text-muted-foreground">Overall</span>
              </div>
            </div>

            {/* Category Ratings */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {categories.slice(0, 5).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{categoryLabels[key] || key}</span>
                    <span className={`font-medium ${getRatingColor(value)}`}>{value}</span>
                  </div>
                  <Progress value={(value / 5) * 100} className="h-1" />
                </div>
              ))}
            </div>

            {/* Notes Preview */}
            {assessment.notes && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Notes:</span> {assessment.notes}
              </div>
            )}

            {/* Next Visit */}
            {assessment.nextScheduledVisit && (
              <div className="text-sm flex items-center gap-2 text-teal-600">
                <Calendar className="h-4 w-4" />
                Next visit scheduled: {new Date(assessment.nextScheduledVisit).toLocaleDateString()}
              </div>
            )}

            <div className="flex items-center justify-end border-t pt-4 gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    Full Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>{mosque?.name} - Assessment Report</DialogTitle>
                    <DialogDescription>
                      Comprehensive assessment overview
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 flex-wrap">
                        {getStatusBadge(assessment.status)}
                        {getCertificationBadge(assessment.certificationLevel)}
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getRatingBg(assessment.overallRating)}`}>
                        <Star className={`h-5 w-5 ${getRatingColor(assessment.overallRating)} fill-current`} />
                        <span className={`text-xl font-bold ${getRatingColor(assessment.overallRating)}`}>{assessment.overallRating}/5</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Total Visits</Label>
                        <p className="font-medium">{assessment.totalVisits}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Last Visit</Label>
                        <p className="font-medium">{new Date(assessment.lastVisitDate).toLocaleDateString()}</p>
                      </div>
                      {assessment.nextScheduledVisit && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground">Next Scheduled Visit</Label>
                          <p className="font-medium">{new Date(assessment.nextScheduledVisit).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Category Ratings</Label>
                      <div className="grid gap-4 mt-2">
                        {categories.map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{categoryLabels[key] || key}</span>
                              <span className={`font-bold ${getRatingColor(value)}`}>{value}/5</span>
                            </div>
                            <Progress value={(value / 5) * 100} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {assessment.notes && (
                      <div>
                        <Label className="text-muted-foreground">Assessment Notes</Label>
                        <p className="mt-2">{assessment.notes}</p>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline">Export PDF</Button>
                    <Button className="bg-teal-600 hover:bg-teal-700">Schedule Visit</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Update
              </Button>
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
          <h1 className="text-2xl font-bold tracking-tight">Mosque Assessments</h1>
          <p className="text-muted-foreground">Comprehensive evaluations and ratings for all mosques</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Assessment</DialogTitle>
              <DialogDescription>Start a comprehensive evaluation for a mosque</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="mosque">Select Mosque</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a mosque to assess" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMosques.map(mosque => (
                      <SelectItem key={mosque.id} value={mosque.id}>{mosque.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assessor">Assessor</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assessor" />
                  </SelectTrigger>
                  <SelectContent>
                    {shuraMembers.filter(m => m.isActive).map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Assessment Date</Label>
                <Input type="date" id="date" />
              </div>
              <div className="grid gap-2">
                <Label>Category Ratings (1-5)</Label>
                <div className="space-y-3">
                  {["cleanliness", "prayerServices", "educationPrograms", "communityEngagement", "financialTransparency"].map(category => (
                    <div key={category} className="flex items-center justify-between">
                      <Label className="text-sm">{categoryLabels[category]}</Label>
                      <Select>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Assessment Notes</Label>
                <Textarea id="notes" placeholder="Enter assessment notes..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setIsCreateDialogOpen(false)}>Create Assessment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Mosques evaluated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.avgRating}</div>
            <p className="text-xs text-muted-foreground">Out of 5.0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excellent</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.excellent}</div>
            <p className="text-xs text-muted-foreground">Top performers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.needsAttention}</div>
            <p className="text-xs text-muted-foreground">Below 3.5 rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search mosques..."
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
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="satisfactory">Satisfactory</SelectItem>
                <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={certificationFilter} onValueChange={setCertificationFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Certification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Certifications</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      <div className="space-y-4">
        {filteredAssessments.length > 0 ? (
          filteredAssessments.map((assessment) => (
            <AssessmentCard key={assessment.id} assessment={assessment} />
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No assessments found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

