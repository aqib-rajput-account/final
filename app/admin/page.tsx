"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Bell,
  ArrowUpRight,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { mockMosques, mockEvents, mockFinanceRecords, mockAnnouncements } from "@/lib/data"

export default function AdminDashboardPage() {
  const totalMosques = mockMosques.length
  const totalEvents = mockEvents.length
  const upcomingEvents = mockEvents.filter(e => new Date(e.startDate) >= new Date()).length
  const totalDonations = mockFinanceRecords
    .filter(r => r.type === "donation")
    .reduce((sum, r) => sum + r.amount, 0)
  const totalExpenses = mockFinanceRecords
    .filter(r => r.type === "expense")
    .reduce((sum, r) => sum + r.amount, 0)
  const activeAnnouncements = mockAnnouncements.filter(a => a.isActive).length
  const totalMembers = mockMosques.reduce((sum, m) => sum + (m.capacity || 0), 0)

  const stats = [
    {
      title: "Total Mosques",
      value: totalMosques,
      icon: Building2,
      change: "+2 this month",
      trend: "up",
    },
    {
      title: "Upcoming Events",
      value: upcomingEvents,
      icon: Calendar,
      change: `${totalEvents} total`,
      trend: "neutral",
    },
    {
      title: "Total Donations",
      value: `$${totalDonations.toLocaleString()}`,
      icon: DollarSign,
      change: "+12% from last month",
      trend: "up",
    },
    {
      title: "Community Members",
      value: totalMembers.toLocaleString(),
      icon: Users,
      change: "+156 this week",
      trend: "up",
    },
  ]

  const recentEvents = mockEvents
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const recentTransactions = mockFinanceRecords
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your mosque network.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/mosques/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Mosque
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {stat.trend === "up" && (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                )}
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Latest events across all mosques</CardDescription>
            </div>
            <Link href="/admin/events">
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents.map((event) => {
                const mosque = mockMosques.find(m => m.id === event.mosqueId)
                return (
                  <div key={event.id} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium leading-none">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {mosque?.name} • {new Date(event.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={event.category === "jummah" ? "default" : "secondary"}>
                      {event.category}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest financial activity</CardDescription>
            </div>
            <Link href="/admin/finance">
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((record) => {
                const mosque = mockMosques.find(m => m.id === record.mosqueId)
                return (
                  <div key={record.id} className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      record.type === "donation" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                    }`}>
                      <DollarSign className={`h-5 w-5 ${
                        record.type === "donation" ? "text-green-600" : "text-red-600"
                      }`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium leading-none">{record.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {mosque?.name} • {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`font-semibold ${
                      record.type === "donation" ? "text-green-600" : "text-red-600"
                    }`}>
                      {record.type === "donation" ? "+" : "-"}${record.amount.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Donation Goals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Donation Goals Progress</CardTitle>
            <CardDescription>Track progress towards mosque fundraising goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {mockMosques.slice(0, 3).map((mosque) => {
              const donations = mockFinanceRecords
                .filter(r => r.mosqueId === mosque.id && r.type === "donation")
                .reduce((sum, r) => sum + r.amount, 0)
              const goal = 50000
              const progress = Math.min((donations / goal) * 100, 100)
              
              return (
                <div key={mosque.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{mosque.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ${donations.toLocaleString()} / ${goal.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Active Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>{activeAnnouncements} announcements</CardDescription>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAnnouncements
                .filter(a => a.isActive)
                .slice(0, 4)
                .map((announcement) => (
                  <div key={announcement.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 h-2 w-2 rounded-full ${
                      announcement.category === "urgent" 
                        ? "bg-red-500" 
                        : announcement.category === "event"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{announcement.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

