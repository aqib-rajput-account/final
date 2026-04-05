"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Progress } from "@/components/ui/progress"
import { Plus, DollarSign, TrendingUp, TrendingDown, Target } from "lucide-react"
import { donations, expenses, donationGoals, mosques } from "@/lib/data"
import type { FinanceRecord, DonationGoal } from "@/lib/types"
import { toast } from "sonner"
import { format } from "date-fns"

export default function AdminFinancePage() {
  const [donationList, setDonationList] = useState<FinanceRecord[]>(donations)
  const [expenseList, setExpenseList] = useState<FinanceRecord[]>(expenses)
  const [goalList, setGoalList] = useState<DonationGoal[]>(donationGoals)
  const [isAddDonationOpen, setIsAddDonationOpen] = useState(false)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false)

  const totalDonations = donationList.reduce((sum, d) => sum + d.amount, 0)
  const totalExpenses = expenseList.reduce((sum, e) => sum + e.amount, 0)
  const netBalance = totalDonations - totalExpenses

  const handleAddDonation = (formData: FormData) => {
    const newDonation: FinanceRecord = {
      id: `donation-${Date.now()}`,
      mosqueId: formData.get("mosqueId") as string,
      type: "donation",
      amount: parseFloat(formData.get("amount") as string),
      donorName: formData.get("donorName") as string || "Anonymous",
      category: formData.get("category") as FinanceRecord["category"],
      isAnonymous: formData.get("isAnonymous") === "on",
      description: formData.get("message") as string || "Donation",
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    }
    setDonationList([newDonation, ...donationList])
    setIsAddDonationOpen(false)
    toast.success("Donation recorded successfully")
  }

  const handleAddExpense = (formData: FormData) => {
    const newExpense: FinanceRecord = {
      id: `expense-${Date.now()}`,
      mosqueId: formData.get("mosqueId") as string,
      type: "expense",
      amount: parseFloat(formData.get("amount") as string),
      category: formData.get("category") as FinanceRecord["category"],
      description: formData.get("description") as string,
      date: formData.get("date") as string,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
    }
    setExpenseList([newExpense, ...expenseList])
    setIsAddExpenseOpen(false)
    toast.success("Expense recorded successfully")
  }

  const handleAddGoal = (formData: FormData) => {
    const newGoal: DonationGoal = {
      id: `goal-${Date.now()}`,
      mosqueId: formData.get("mosqueId") as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      targetAmount: parseFloat(formData.get("targetAmount") as string),
      currentAmount: 0,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      isActive: true,
    }
    setGoalList([newGoal, ...goalList])
    setIsAddGoalOpen(false)
    toast.success("Donation goal created successfully")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Finance Management</h1>
        <p className="text-muted-foreground mt-1">Track donations, expenses, and manage fundraising goals</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalDonations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {donationList.length} donations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {expenseList.length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-primary" : "text-destructive"}`}>
              ${netBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Current period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goalList.filter(g => g.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Fundraising campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Donation Goals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Donation Goals</CardTitle>
            <CardDescription>Active fundraising campaigns</CardDescription>
          </div>
          <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Donation Goal</DialogTitle>
                <DialogDescription>Set up a new fundraising campaign.</DialogDescription>
              </DialogHeader>
              <form action={handleAddGoal} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-title">Goal Title</Label>
                  <Input id="goal-title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-mosque">Mosque</Label>
                  <Select name="mosqueId">
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
                <div className="grid gap-4 sm:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="goal-target">Target Amount</Label>
                    <Input id="goal-target" name="targetAmount" type="number" required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="goal-start">Start Date</Label>
                    <Input id="goal-start" name="startDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-end">End Date</Label>
                    <Input id="goal-end" name="endDate" type="date" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-description">Description</Label>
                  <Textarea id="goal-description" name="description" rows={3} required />
                </div>
                <Button type="submit" className="w-full">Create Goal</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goalList.filter(g => g.isActive).map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100
              return (
                <div key={goal.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{goal.title}</h4>
                    </div>
                    <Badge variant={progress >= 100 ? "default" : "secondary"}>
                      {progress >= 100 ? "Completed" : "Active"}
                    </Badge>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-2 mb-2" />
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">${goal.currentAmount.toLocaleString()} raised</span>
                    <span className="text-muted-foreground">of ${goal.targetAmount.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Donations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Donations</CardTitle>
            <CardDescription>Track incoming donations</CardDescription>
          </div>
          <Dialog open={isAddDonationOpen} onOpenChange={setIsAddDonationOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Record Donation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Donation</DialogTitle>
                <DialogDescription>Enter donation details to add to the records.</DialogDescription>
              </DialogHeader>
              <form action={handleAddDonation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="donation-mosque">Mosque</Label>
                  <Select name="mosqueId">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="donation-amount">Amount</Label>
                    <Input id="donation-amount" name="amount" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donation-category">Category</Label>
                    <Select name="category">
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="zakat">Zakat</SelectItem>
                        <SelectItem value="sadaqah">Sadaqah</SelectItem>
                        <SelectItem value="building">Building Fund</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="charity">Charity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donation-donor">Donor Name</Label>
                  <Input id="donation-donor" name="donorName" placeholder="Anonymous if left blank" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donation-email">Donor Email (optional)</Label>
                  <Input id="donation-email" name="donorEmail" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donation-message">Message (optional)</Label>
                  <Textarea id="donation-message" name="message" rows={2} />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isAnonymous" className="rounded" />
                    <span className="text-sm">Anonymous</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isRecurring" className="rounded" />
                    <span className="text-sm">Recurring</span>
                  </label>
                </div>
                <Button type="submit" className="w-full">Record Donation</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donationList.slice(0, 10).map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell className="font-medium">
                    {donation.isAnonymous ? "Anonymous" : donation.donorName}
                  </TableCell>
                  <TableCell className="text-primary font-semibold">
                    ${donation.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{donation.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      Completed
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(donation.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Track mosque expenditures</CardDescription>
          </div>
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Record Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Expense</DialogTitle>
                <DialogDescription>Enter expense details to add to the records.</DialogDescription>
              </DialogHeader>
              <form action={handleAddExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-mosque">Mosque</Label>
                  <Select name="mosqueId">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expense-amount">Amount</Label>
                    <Input id="expense-amount" name="amount" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-category">Category</Label>
                    <Select name="category">
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="salaries">Salaries</SelectItem>
                        <SelectItem value="supplies">Supplies</SelectItem>
                        <SelectItem value="events">Events</SelectItem>
                        <SelectItem value="charity">Charity</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-description">Description</Label>
                  <Input id="expense-description" name="description" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="expense-date">Date</Label>
                    <Input id="expense-date" name="date" type="date" required />
                  </div>
                </div>
                <Button type="submit" className="w-full">Record Expense</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseList.slice(0, 10).map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="text-destructive font-semibold">
                    -${expense.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(expense.date), "MMM d, yyyy")}
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

