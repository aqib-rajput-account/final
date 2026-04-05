"use client"

import { useState } from 'react'
import Link from 'next/link'
import { 
  Bell, 
  Megaphone, 
  Heart, 
  TrendingUp,
  Pin,
  Calendar,
  User,
  ChevronRight,
  Target,
  DollarSign,
  ArrowUpRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { 
  mockAnnouncements, 
  mockDonationGoals, 
  mockFinanceRecords,
  mockMosques,
  getMosqueById 
} from '@/lib/data'
import type { AnnouncementCategory, FinanceCategory } from '@/lib/types'

const announcementCategoryColors: Record<AnnouncementCategory, string> = {
  general: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  prayer: 'bg-primary/10 text-primary border-primary/20',
  event: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  urgent: 'bg-red-500/10 text-red-600 border-red-500/20',
  community: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  education: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
}

const financeCategoryLabels: Record<FinanceCategory, string> = {
  zakat: 'Zakat',
  sadaqah: 'Sadaqah',
  building_fund: 'Building Fund',
  operational: 'Operational',
  education: 'Education',
  utilities: 'Utilities',
  maintenance: 'Maintenance',
  salaries: 'Salaries',
  events: 'Events',
  charity: 'Charity',
  other: 'Other',
}

export function CommunityView() {
  const [selectedMosque, setSelectedMosque] = useState<string>('all')

  const filteredAnnouncements = selectedMosque === 'all' 
    ? mockAnnouncements 
    : mockAnnouncements.filter(a => a.mosqueId === selectedMosque)

  const filteredDonationGoals = selectedMosque === 'all'
    ? mockDonationGoals
    : mockDonationGoals.filter(g => g.mosqueId === selectedMosque)

  const filteredFinanceRecords = selectedMosque === 'all'
    ? mockFinanceRecords
    : mockFinanceRecords.filter(f => f.mosqueId === selectedMosque)

  // Calculate finance summary
  const totalDonations = filteredFinanceRecords
    .filter(r => r.type === 'donation')
    .reduce((sum, r) => sum + r.amount, 0)
  
  const totalExpenses = filteredFinanceRecords
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Mosque Filter */}
      <div className="flex items-center justify-between">
        <Select value={selectedMosque} onValueChange={setSelectedMosque}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by mosque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Mosques</SelectItem>
            {mockMosques.map((mosque) => (
              <SelectItem key={mosque.id} value={mosque.id}>
                {mosque.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="donations" className="gap-2">
            <Heart className="h-4 w-4" />
            Donations
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Finance
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="mt-6">
          <div className="space-y-4">
            {filteredAnnouncements.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No announcements</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Pinned announcements first */}
                {filteredAnnouncements
                  .filter(a => a.isPinned)
                  .map((announcement) => (
                    <AnnouncementCard key={announcement.id} announcement={announcement} />
                  ))}
                {/* Regular announcements */}
                {filteredAnnouncements
                  .filter(a => !a.isPinned)
                  .map((announcement) => (
                    <AnnouncementCard key={announcement.id} announcement={announcement} />
                  ))}
              </>
            )}
          </div>
        </TabsContent>

        {/* Donations Tab */}
        <TabsContent value="donations" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDonationGoals.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No active donation campaigns</p>
                </CardContent>
              </Card>
            ) : (
              filteredDonationGoals.map((goal) => (
                <DonationGoalCard key={goal.id} goal={goal} />
              ))
            )}
          </div>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="mt-6">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Donations</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ${totalDonations.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <ArrowUpRight className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-orange-600">
                        ${totalExpenses.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net Balance</p>
                      <p className="text-2xl font-bold text-primary">
                        ${(totalDonations - totalExpenses).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredFinanceRecords.slice(0, 10).map((record) => {
                    const mosque = getMosqueById(record.mosqueId)
                    return (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            record.type === 'donation' 
                              ? "bg-emerald-500/10 text-emerald-600" 
                              : "bg-orange-500/10 text-orange-600"
                          )}>
                            {record.type === 'donation' ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{record.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {financeCategoryLabels[record.category]}
                              </Badge>
                              {mosque && <span>{mosque.name}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-semibold",
                            record.type === 'donation' ? "text-emerald-600" : "text-orange-600"
                          )}>
                            {record.type === 'donation' ? '+' : '-'}${record.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AnnouncementCard({ announcement }: { announcement: typeof mockAnnouncements[0] }) {
  const mosque = getMosqueById(announcement.mosqueId)
  
  return (
    <Card className={cn(
      "transition-all",
      announcement.isPinned && "border-primary/30 bg-primary/5"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {announcement.isPinned && (
            <Pin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={announcementCategoryColors[announcement.category]}
              >
                {announcement.category}
              </Badge>
              {announcement.category === 'urgent' && (
                <Badge variant="destructive">Urgent</Badge>
              )}
            </div>

            <h3 className="font-semibold text-foreground">{announcement.title}</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              {announcement.content}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {announcement.authorName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(announcement.publishDate).toLocaleDateString()}
              </span>
              {mosque && (
                <Link 
                  href={`/mosques/${mosque.id}`}
                  className="text-primary hover:underline"
                >
                  {mosque.name}
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DonationGoalCard({ goal }: { goal: typeof mockDonationGoals[0] }) {
  const mosque = getMosqueById(goal.mosqueId)
  const progress = (goal.currentAmount / goal.targetAmount) * 100
  const remaining = goal.targetAmount - goal.currentAmount
  const daysLeft = Math.ceil(
    (new Date(goal.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Card className="overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-primary" />
          <Badge variant="secondary">{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</Badge>
        </div>

        <h3 className="font-semibold text-foreground">{goal.title}</h3>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {goal.description}
        </p>

        {mosque && (
          <Link 
            href={`/mosques/${mosque.id}`}
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            {mosque.name}
          </Link>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-primary">
              ${goal.currentAmount.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              of ${goal.targetAmount.toLocaleString()}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            ${remaining.toLocaleString()} remaining ({progress.toFixed(0)}% funded)
          </p>
        </div>

        <Button className="w-full mt-4 gap-2">
          <Heart className="h-4 w-4" />
          Donate Now
        </Button>
      </CardContent>
    </Card>
  )
}

