"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  Search, 
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Calendar,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Printer
} from "lucide-react"
import { shuraMosques as mosques, mosqueVisits, mosqueAssessments } from "@/lib/data"

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [periodFilter, setPeriodFilter] = useState<string>("month")

  // Calculate statistics
  const totalMosques = mosques.length
  const registeredMosques = mosques.filter(m => m.registrationStatus === "registered").length
  const pendingMosques = mosques.filter(m => m.registrationStatus === "pending").length
  const averageRating = mosqueAssessments.reduce((sum, a) => sum + a.overallRating, 0) / mosqueAssessments.length
  const totalVisits = mosqueVisits.length
  const completedVisits = mosqueVisits.filter(v => v.status === "completed").length

  // Performance metrics
  const performanceMetrics = [
    { label: "Prayer Services", value: 92, change: +5 },
    { label: "Educational Programs", value: 78, change: +12 },
    { label: "Community Engagement", value: 85, change: -3 },
    { label: "Financial Management", value: 88, change: +8 },
    { label: "Facility Maintenance", value: 75, change: +2 },
  ]

  // Regional distribution
  const regionalData = [
    { region: "North Region", mosques: 12, visits: 24, rating: 4.5 },
    { region: "South Region", mosques: 8, visits: 18, rating: 4.2 },
    { region: "East Region", mosques: 15, visits: 32, rating: 4.7 },
    { region: "West Region", mosques: 10, visits: 20, rating: 4.3 },
    { region: "Central Region", mosques: 18, visits: 40, rating: 4.6 },
  ]

  // Issues and concerns
  const issues = [
    { id: 1, mosque: "Al-Noor Mosque", issue: "Imam vacancy for 3 months", priority: "high", status: "in-progress" },
    { id: 2, mosque: "Al-Furqan Center", issue: "Facility maintenance needed", priority: "medium", status: "pending" },
    { id: 3, mosque: "Masjid Al-Taqwa", issue: "Low community engagement", priority: "low", status: "monitoring" },
    { id: 4, mosque: "Islamic Center Downtown", issue: "Financial audit required", priority: "high", status: "scheduled" },
  ]

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">High</Badge>
      case "medium":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Medium</Badge>
      case "low":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Low</Badge>
      default:
        return <Badge variant="secondary">{priority}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive reports and performance analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Mosques</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMosques}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="text-emerald-600">{registeredMosques} registered</span>
              <span>•</span>
              <span className="text-amber-600">{pendingMosques} pending</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating.toFixed(1)}/5.0</div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-600">+0.3 from last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisits}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-emerald-600" />
              <span>{completedVisits} completed</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issues.length}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="text-red-600">{issues.filter(i => i.priority === "high").length} high priority</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="regional">Regional Analysis</TabsTrigger>
          <TabsTrigger value="issues">Issues & Concerns</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators across all mosques</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {performanceMetrics.map((metric, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{metric.value}%</span>
                        <span className={`flex items-center text-xs ${metric.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {metric.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {Math.abs(metric.change)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={metric.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Performing Mosques */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Mosques</CardTitle>
                <CardDescription>Based on overall assessment scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mosqueAssessments
                    .sort((a, b) => b.overallRating - a.overallRating)
                    .slice(0, 5)
                    .map((assessment, idx) => {
                      const mosque = mosques.find(m => m.id === assessment.mosqueId)
                      return (
                        <div key={assessment.id} className="flex items-center gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{mosque?.name || "Unknown Mosque"}</p>
                            <p className="text-xs text-muted-foreground">{mosque?.region}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-bold">{assessment.overallRating.toFixed(1)}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assessment Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Category Breakdown</CardTitle>
              <CardDescription>Average scores across all assessment categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {[
                  { category: "Prayer Services", score: 4.5, icon: Clock },
                  { category: "Education", score: 4.2, icon: FileText },
                  { category: "Community", score: 4.3, icon: Users },
                  { category: "Finance", score: 4.4, icon: BarChart3 },
                  { category: "Facilities", score: 4.1, icon: Building2 },
                ].map((item, idx) => (
                  <div key={idx} className="text-center p-4 rounded-lg bg-muted/50">
                    <item.icon className="h-8 w-8 mx-auto mb-2 text-teal-600" />
                    <p className="text-sm font-medium">{item.category}</p>
                    <p className="text-2xl font-bold mt-1">{item.score}</p>
                    <p className="text-xs text-muted-foreground">out of 5.0</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Distribution</CardTitle>
              <CardDescription>Mosque statistics by region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {regionalData.map((region, idx) => (
                  <div key={idx} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{region.region}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{region.rating}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Mosques</p>
                        <p className="font-bold text-lg">{region.mosques}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Visits</p>
                        <p className="font-bold text-lg">{region.visits}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Coverage</p>
                        <p className="font-bold text-lg">{Math.round((region.visits / region.mosques) * 100 / 2)}%</p>
                      </div>
                    </div>
                    <Progress value={(region.visits / region.mosques) * 100 / 2} className="h-2 mt-3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Issues & Concerns</CardTitle>
              <CardDescription>Issues requiring attention across all mosques</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {issues.map(issue => (
                  <div key={issue.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${
                        issue.priority === "high" ? "bg-red-100" : 
                        issue.priority === "medium" ? "bg-amber-100" : "bg-blue-100"
                      }`}>
                        <AlertTriangle className={`h-4 w-4 ${
                          issue.priority === "high" ? "text-red-600" : 
                          issue.priority === "medium" ? "text-amber-600" : "text-blue-600"
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{issue.mosque}</p>
                        <p className="text-sm text-muted-foreground">{issue.issue}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getPriorityBadge(issue.priority)}
                      <Badge variant="outline">{issue.status}</Badge>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Key metrics over the past 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { month: "March 2026", visits: 45, registrations: 3, rating: 4.5 },
                    { month: "February 2026", visits: 42, registrations: 2, rating: 4.4 },
                    { month: "January 2026", visits: 38, registrations: 4, rating: 4.3 },
                    { month: "December 2025", visits: 35, registrations: 1, rating: 4.2 },
                    { month: "November 2025", visits: 40, registrations: 2, rating: 4.3 },
                    { month: "October 2025", visits: 36, registrations: 3, rating: 4.1 },
                  ].map((data, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium">{data.month}</span>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-muted-foreground">{data.visits} visits</span>
                        <span className="text-muted-foreground">{data.registrations} new</span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          {data.rating}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Indicators</CardTitle>
                <CardDescription>Year-over-year comparison</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { label: "Mosque Registrations", current: 63, previous: 52, unit: "mosques" },
                  { label: "Active Imams", current: 58, previous: 48, unit: "imams" },
                  { label: "Community Events", current: 124, previous: 98, unit: "events" },
                  { label: "Shura Visits", current: 234, previous: 180, unit: "visits" },
                ].map((item, idx) => {
                  const growth = ((item.current - item.previous) / item.previous * 100).toFixed(1)
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.current} {item.unit}</span>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            +{growth}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(item.current / (item.current + 20)) * 100} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">vs {item.previous}</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

