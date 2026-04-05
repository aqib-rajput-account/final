"use client"

import { useState, createContext, useContext, useEffect } from 'react'
import {
  User,
  Users,
  Shield,
  Crown,
  ChevronDown,
  Check,
  Plus,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Test User type
export interface TestUser {
  id: string
  name: string
  username: string
  avatar?: string
  color: string
  role: 'host' | 'co-host' | 'speaker' | 'listener' | 'participant' | 'admin'
  email?: string
}

// Default test users
export const DEFAULT_TEST_USERS: TestUser[] = [
  {
    id: 'test-user-1',
    name: 'Ahmad Developer',
    username: 'ahmad_dev',
    color: '#3B82F6',
    role: 'host',
    email: 'ahmad@test.dev'
  },
  {
    id: 'test-user-2',
    name: 'Fatima Tester',
    username: 'fatima_test',
    color: '#10B981',
    role: 'speaker',
    email: 'fatima@test.dev'
  },
  {
    id: 'test-user-3',
    name: 'Omar QA',
    username: 'omar_qa',
    color: '#F59E0B',
    role: 'listener',
    email: 'omar@test.dev'
  },
  {
    id: 'test-user-4',
    name: 'Aisha Admin',
    username: 'aisha_admin',
    color: '#EF4444',
    role: 'admin',
    email: 'aisha@test.dev'
  }
]

// Context for user switching
interface UserContextType {
  currentUser: TestUser
  allUsers: TestUser[]
  switchUser: (userId: string) => void
  addUser: (user: Omit<TestUser, 'id'>) => void
}

const UserContext = createContext<UserContextType | null>(null)

export function useCurrentUser() {
  const context = useContext(UserContext)
  if (!context) {
    // Return default user if not in provider
    return {
      currentUser: DEFAULT_TEST_USERS[0],
      allUsers: DEFAULT_TEST_USERS,
      switchUser: () => {},
      addUser: () => {}
    }
  }
  return context
}

interface UserProviderProps {
  children: React.ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [users, setUsers] = useState<TestUser[]>(DEFAULT_TEST_USERS)
  const [currentUserId, setCurrentUserId] = useState(DEFAULT_TEST_USERS[0].id)

  // Load from localStorage on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('testCurrentUserId')
    const savedUsers = localStorage.getItem('testUsers')
    
    if (savedUserId) {
      setCurrentUserId(savedUserId)
    }
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers)
        setUsers([...DEFAULT_TEST_USERS, ...parsed.filter((u: TestUser) => !DEFAULT_TEST_USERS.find(d => d.id === u.id))])
      } catch (e) {
        console.error('[v0] Failed to parse saved users')
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('testCurrentUserId', currentUserId)
    localStorage.setItem('testUsers', JSON.stringify(users.filter(u => !DEFAULT_TEST_USERS.find(d => d.id === u.id))))
  }, [currentUserId, users])

  const currentUser = users.find(u => u.id === currentUserId) || DEFAULT_TEST_USERS[0]

  const switchUser = (userId: string) => {
    setCurrentUserId(userId)
    const user = users.find(u => u.id === userId)
    if (user) {
      toast.success(`Switched to ${user.name}`)
    }
  }

  const addUser = (user: Omit<TestUser, 'id'>) => {
    const newUser: TestUser = {
      ...user,
      id: `custom-user-${Date.now()}`
    }
    setUsers(prev => [...prev, newUser])
    toast.success(`Added test user: ${user.name}`)
  }

  return (
    <UserContext.Provider value={{ currentUser, allUsers: users, switchUser, addUser }}>
      {children}
    </UserContext.Provider>
  )
}

// User Switcher Component
interface UserSwitcherProps {
  variant?: 'dropdown' | 'inline' | 'compact'
  className?: string
}

export function UserSwitcher({ variant = 'dropdown', className }: UserSwitcherProps) {
  const { currentUser, allUsers, switchUser, addUser } = useCurrentUser()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    color: '#6366F1',
    role: 'listener' as TestUser['role']
  })

  const handleAddUser = () => {
    if (!newUser.name.trim() || !newUser.username.trim()) {
      toast.error('Please fill in name and username')
      return
    }
    addUser(newUser)
    setNewUser({ name: '', username: '', color: '#6366F1', role: 'listener' })
    setShowAddDialog(false)
  }

  const getRoleIcon = (role: TestUser['role']) => {
    switch (role) {
      case 'host':
      case 'admin':
        return <Crown className="h-3 w-3" />
      case 'co-host':
        return <Shield className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  const getRoleBadgeColor = (role: TestUser['role']) => {
    switch (role) {
      case 'host':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'co-host':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'speaker':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  if (variant === 'inline') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Test Accounts
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(true)} className="h-7 gap-1">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        <div className="grid gap-2">
          {allUsers.map(user => (
            <button
              key={user.id}
              onClick={() => switchUser(user.id)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                user.id === currentUser.id 
                  ? "bg-primary/10 ring-1 ring-primary" 
                  : "hover:bg-muted"
              )}
            >
              <Avatar className="h-9 w-9 ring-2 ring-offset-1 ring-offset-background" style={{ borderColor: user.color }}>
                <AvatarImage src={user.avatar} />
                <AvatarFallback 
                  className="text-white text-xs font-medium"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  {user.id === currentUser.id && (
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
              </div>
              <Badge variant="secondary" className={cn("text-xs gap-1", getRoleBadgeColor(user.role))}>
                {getRoleIcon(user.role)}
                {user.role}
              </Badge>
            </button>
          ))}
        </div>
        
        {/* Add User Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Test Account</DialogTitle>
              <DialogDescription>
                Create a new test account for multi-user testing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Test User Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="test_user"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewUser({ ...newUser, color })}
                        className={cn(
                          "h-8 w-8 rounded-full transition-transform",
                          newUser.color === color && "ring-2 ring-offset-2 ring-primary scale-110"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddUser}>Add Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("gap-2 h-8", className)}>
            <Avatar className="h-5 w-5">
              <AvatarFallback 
                className="text-white text-[10px]"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Switch Test Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allUsers.map(user => (
            <DropdownMenuItem
              key={user.id}
              onClick={() => switchUser(user.id)}
              className="gap-3"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback 
                  className="text-white text-xs"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
              {user.id === currentUser.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Default dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("gap-3", className)}>
          <Avatar className="h-6 w-6">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback 
              className="text-white text-xs"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
          </div>
          <ChevronDown className="h-4 w-4 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2 pb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Test Accounts
          <Badge variant="secondary" className="ml-auto text-xs">
            {allUsers.length} users
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allUsers.map(user => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => switchUser(user.id)}
            className="gap-3 py-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} />
              <AvatarFallback 
                className="text-white text-xs font-medium"
                style={{ backgroundColor: user.color }}
              >
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{user.name}</p>
                <Badge variant="secondary" className={cn("text-[10px] px-1 h-4", getRoleBadgeColor(user.role))}>
                  {user.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
            {user.id === currentUser.id && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Test Account
        </DropdownMenuItem>
      </DropdownMenuContent>
      
      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Test Account</DialogTitle>
            <DialogDescription>
              Create a new test account for multi-user testing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Test User Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="test_user"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewUser({ ...newUser, color })}
                      className={cn(
                        "h-8 w-8 rounded-full transition-transform",
                        newUser.color === color && "ring-2 ring-offset-2 ring-primary scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddUser}>Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  )
}

// Test Account Panel Component (for sidebar)
export function TestAccountPanel({ className }: { className?: string }) {
  const { currentUser, allUsers, switchUser } = useCurrentUser()

  return (
    <div className={cn("p-4 rounded-lg border bg-card", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Test Mode</h3>
        <Badge variant="outline" className="text-xs ml-auto">Active</Badge>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        Switch between test accounts to simulate multiple users joining Spaces and Meetings.
      </p>
      
      <div className="space-y-1">
        {allUsers.slice(0, 4).map(user => (
          <button
            key={user.id}
            onClick={() => switchUser(user.id)}
            className={cn(
              "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
              user.id === currentUser.id 
                ? "bg-primary/10" 
                : "hover:bg-muted"
            )}
          >
            <div 
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
              style={{ backgroundColor: user.color }}
            >
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground">@{user.username}</p>
            </div>
            {user.id === currentUser.id && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">Active</Badge>
            )}
          </button>
        ))}
      </div>
      
      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Open this app in multiple browser tabs to test real-time features with different accounts.
      </p>
    </div>
  )
}
