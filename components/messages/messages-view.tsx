"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import { hasSupabaseBrowserEnv } from "@/lib/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquarePlus,
  Send,
  ImagePlus,
  MoreVertical,
  Search,
  Users,
  User,
  ArrowLeft,
  Check,
  CheckCheck,
  Loader2,
  X,
  Trash2,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";

interface Conversation {
  id: string;
  name: string | null;
  type: "direct" | "group" | "broadcast";
  image_url: string | null;
  role: string;
  is_muted: boolean;
  last_message: {
    id: string;
    content: string;
    message_type: string;
    created_at: string;
    sender_id: string;
    profiles: { full_name: string };
  } | null;
  unread_count: number;
  participants: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  }[];
}

interface Message {
  id: string;
  content: string | null;
  message_type: string;
  image_url: string | null;
  created_at: string;
  sender_id: string;
  is_edited: boolean;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reply_to?: {
    id: string;
    content: string;
    sender: { full_name: string };
  } | null;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

export function MessagesView() {
  const { userId, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [conversationType, setConversationType] = useState<"direct" | "group" | "broadcast">("direct");
  const [groupName, setGroupName] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = hasSupabaseBrowserEnv ? createClient() : null;
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      
      if (data.conversations) {
        setConversations(data.conversations);
        return data.conversations;
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
    return [];
  }, [userId]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const convos = await fetchConversations();
      
      // Handle URL userId routing for direct messages
      const urlUserId = searchParams.get('userId');
      if (urlUserId && userId) {
        // First remove the param so we don't re-trigger
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('userId');
        router.replace('/messages?' + newParams.toString());

        // Find existing conversation with this user
        const existingConvo = convos.find((c: any) => 
          c.type === 'direct' && c.participants.some((p: any) => p.id === urlUserId)
        );

        if (existingConvo) {
          handleSelectConversation(existingConvo);
        } else {
          // Check if user exists and create a conversation
          try {
            const res = await fetch("/api/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "direct",
                participant_ids: [urlUserId],
              }),
            });
            const data = await res.json();
            if (data.conversation) {
              const updatedConvos = await fetchConversations();
              const fullConv = updatedConvos.find((c: any) => c.id === data.conversation.id);
              if (fullConv) {
                handleSelectConversation(fullConv);
              }
            }
          } catch (e) {
            console.error("Auto-start chat failed:", e);
          }
        }
      }
    };

    init();

    if (!supabase || !userId) return;

    // Subscribe to new messages and conversation updates
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        async (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as any;
            if (selectedConversation?.id === newMsg.conversation_id) {
              const { data: fullMessage } = await supabase
                .from("messages")
                .select(`*, sender:profiles!sender_id(id, full_name, avatar_url)`)
                .eq("id", newMsg.id)
                .single();

              if (fullMessage) {
                setMessages(prev => {
                  if (prev.find(m => m.id === fullMessage.id)) return prev;
                  return [...prev, fullMessage];
                });
              }
            }
          }
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, router, searchParams, selectedConversation, supabase, userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!supabase || !searchUsers.trim() || !userId) {
        setSearchResults([]);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .neq("id", userId)
        .or(`full_name.ilike.%${searchUsers}%,email.ilike.%${searchUsers}%`)
        .limit(10);

      setSearchResults(data || []);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchUsers, supabase, userId]);

  // Handle selecting a conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const isBroadcast = selectedConversation?.type === "broadcast";
  const canSendInBroadcast = profile?.role === "admin" || profile?.role === "shura" || profile?.role === "imam";
  const canSendMessage = !isBroadcast || canSendInBroadcast;

  // Send message
  const handleSendMessage = async () => {
    if (!selectedConversation || !canSendMessage || (!newMessage.trim() && !selectedImage)) return;

    setSending(true);
    try {
      let imageUrl = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          imageUrl = url;
        }
      }

      const res = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.trim() || null,
          message_type: imageUrl ? "image" : "text",
          image_url: imageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      setNewMessage("");
      clearImage();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Create new conversation
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: conversationType,
          name: conversationType !== "direct" ? groupName : null,
          participant_ids: selectedUsers.map(u => u.id),
        }),
      });

      const data = await res.json();

      if (data.conversation) {
        setShowNewConversation(false);
        setSelectedUsers([]);
        setGroupName("");
        setConversationType("direct");
        fetchConversations();
        
        // Select the new conversation
        handleSelectConversation(data.conversation);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  // Handle delete conversation
  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;

    if (!confirm("Are you sure you want to delete this conversation? This will delete it for all participants and cannot be undone.")) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/conversations/${selectedConversation.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete conversation");

      toast.success("Conversation deleted");
      setSelectedConversation(null);
      fetchConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Get conversation display name
  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.type === "direct") {
      const otherUser = conv.participants?.find(p => p.id !== userId);
      return otherUser?.full_name || "Unknown";
    }
    return "Group Chat";
  };

  // Get conversation avatar
  const getConversationAvatar = (conv: Conversation) => {
    if (conv.image_url) return conv.image_url;
    if (conv.type === "direct") {
      const otherUser = conv.participants?.find(p => p.id !== userId);
      return otherUser?.avatar_url || null;
    }
    return null;
  };

  // Format message date
  const formatMessageDate = (date: Date) => {
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday " + format(date, "h:mm a");
    return format(date, "MMM d, h:mm a");
  };

  if (!hasSupabaseBrowserEnv) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center px-6 text-center">
        <div>
          <p className="font-medium">Messaging is unavailable in local guest mode</p>
          <p className="text-sm text-muted-foreground mt-2">
            Add your Supabase environment variables to enable conversations and realtime messaging.
          </p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      {/* Conversations List */}
      <div className={cn(
        "w-full border-r border-border/40 md:w-80 lg:w-96 flex flex-col bg-muted/5 transition-all duration-300",
        selectedConversation ? "hidden md:flex" : "flex"
      )}>
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Conversation</DialogTitle>
                <DialogDescription>
                  Start a new conversation with community members
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Button
                    variant={conversationType === "direct" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConversationType("direct")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Direct
                  </Button>
                  <Button
                    variant={conversationType === "group" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConversationType("group")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Group
                  </Button>
                  <Button
                    variant={conversationType === "broadcast" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConversationType("broadcast")}
                  >
                    <Megaphone className="mr-2 h-4 w-4" />
                    Broadcast
                  </Button>
                </div>

                {conversationType !== "direct" && (
                  <div className="space-y-2">
                    <Label>Group Name</Label>
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Enter group name"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Search Users</Label>
                  <Input
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    placeholder="Search by name or email"
                  />
                </div>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <Badge key={u.id} variant="secondary">
                        {u.full_name}
                        <button
                          onClick={() => setSelectedUsers(prev => prev.filter(p => p.id !== u.id))}
                          className="ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          if (conversationType === "direct") {
                            setSelectedUsers([result]);
                          } else {
                            if (!selectedUsers.find(u => u.id === result.id)) {
                              setSelectedUsers(prev => [...prev, result]);
                            }
                          }
                          setSearchUsers("");
                        }}
                        className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-muted"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={result.avatar_url || ""} />
                          <AvatarFallback>{result.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-medium">{result.full_name}</p>
                          <p className="text-xs text-muted-foreground">{result.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateConversation}
                  disabled={selectedUsers.length === 0 || (conversationType !== "direct" && !groupName.trim())}
                >
                  Start Conversation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100%-65px)]">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative bg-card border border-border shadow-xl p-6 rounded-3xl">
                  <MessageSquarePlus className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">No Conversations</h3>
              <p className="text-muted-foreground text-sm max-w-[200px] mb-6">
                Connect with your community members and start a message journey today.
              </p>
              <Button
                variant="default"
                className="rounded-xl px-8 shadow-lg shadow-primary/20"
                onClick={() => setShowNewConversation(true)}
              >
                Start a New Chat
              </Button>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  "flex w-full items-center gap-3 p-4 hover:bg-muted",
                  selectedConversation?.id === conv.id && "bg-muted"
                )}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={getConversationAvatar(conv) || ""} />
                    <AvatarFallback>
                      {conv.type === "direct" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {conv.unread_count > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-medium">{getConversationName(conv)}</p>
                    {conv.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="truncate text-sm text-muted-foreground">
                      {conv.last_message.message_type === "image" ? "Sent an image" : conv.last_message.content}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex flex-1 flex-col transition-all duration-300 bg-background",
        !selectedConversation && "hidden md:flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b p-3 sm:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm sticky top-0 z-10 font-bold">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-10 w-10 rounded-xl active:bg-primary/10 active:text-primary transition-all"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div className="relative">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shadow-md border-2 border-primary/10">
                  <AvatarImage src={getConversationAvatar(selectedConversation) || ""} />
                  <AvatarFallback className="rounded-xl bg-primary/5 text-primary">
                    {selectedConversation.type === "direct" ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm sm:text-base truncate tracking-tight">
                    {getConversationName(selectedConversation)}
                  </p>
                  {isBroadcast && (
                    <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 px-1.5 py-0 rounded-lg">
                      Broadcast
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground/80 font-medium truncate uppercase tracking-widest">
                  {selectedConversation.type === "direct"
                    ? "Direct Message"
                    : `${selectedConversation.participants.length} Active Participants`}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-muted/80 transition-all">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-border/60 shadow-2xl p-1.5">
                  <DropdownMenuItem 
                    onClick={handleDeleteConversation}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl py-2.5 font-bold"
                  >
                    <Trash2 className="mr-3 h-4 w-4" />
                    Delete Conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-6 md:px-6">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
                  <div className="relative mb-10 group">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse rounded-full group-hover:bg-primary/40 transition-all duration-1000" />
                    <div className="relative bg-background border border-border/60 shadow-inner p-10 rounded-full group-hover:scale-110 transition-transform duration-500">
                      <Send className="h-12 w-12 text-primary opacity-60 -rotate-12 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-foreground mb-4 italic tracking-tighter">Salam!</h3>
                  <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed font-medium">
                    Break the ice! Start the conversation by sending a warm greeting below.
                  </p>
                  <div className="mt-10 flex flex-wrap justify-center gap-3">
                    {["Assalamu Alaikum", "Ramadan Mubarak", "Salam Brother!"].map((pill) => (
                      <button 
                        key={pill} 
                        onClick={() => setNewMessage(pill)}
                        className="text-[11px] bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-2xl px-5 py-2.5 transition-all font-bold tracking-tight shadow-sm active:scale-95"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {messages.map((msg, index) => {
                    const isOwn = msg.sender_id === userId;
                    const isSystem = msg.message_type === "system";
                    const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id || messages[index-1].message_type === "system";
                    
                    const messageDate = new Date(msg.created_at);
                    const prevMessageDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
                    const showDateHeader = !prevMessageDate || 
                      format(messageDate, "yyyy-MM-dd") !== format(prevMessageDate, "yyyy-MM-dd");

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex flex-col items-center gap-4 my-6">
                          {showDateHeader && (
                            <div className="flex items-center gap-3 w-full mb-2">
                              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border/40" />
                              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">
                                {isToday(messageDate) ? "Today" : isYesterday(messageDate) ? "Yesterday" : format(messageDate, "MMMM d, yyyy")}
                              </span>
                              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border/40" />
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-muted/30 rounded-2xl px-6 py-2 border border-border/40 shadow-sm">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="flex flex-col gap-1.5 group select-none">
                        {showDateHeader && (
                          <div className="flex items-center gap-3 w-full my-6">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border/40" />
                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">
                                {isToday(messageDate) ? "Today" : isYesterday(messageDate) ? "Yesterday" : format(messageDate, "MMMM d, yyyy")}
                            </span>
                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border/40" />
                          </div>
                        )}
                        <div
                          className={cn("flex gap-3 px-1", isOwn && "flex-row-reverse")}
                        >
                          {showAvatar ? (
                            <div className="flex flex-col flex-shrink-0">
                              <Avatar className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-sm ring-offset-2 ring-transparent transition-all", !isOwn && msg.sender && "hover:ring-primary/20 hover:scale-105")}>
                                <AvatarImage src={msg.sender?.avatar_url || ""} />
                                <AvatarFallback className="rounded-xl bg-primary/5 text-primary text-[10px] font-bold">
                                  {msg.sender?.full_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          ) : (
                            <div className="w-8 sm:w-9" />
                          )}
                          <div className={cn("max-w-[85%] sm:max-w-[75%] flex flex-col", isOwn && "items-end")}>
                            {showAvatar && !isOwn && (
                              <p className="mb-1 ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                {msg.sender?.full_name || "No longer a member"}
                              </p>
                            )}
                            <div
                              className={cn(
                                "relative px-4 py-3 shadow-sm transition-all hover:shadow-md",
                                isOwn 
                                  ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-none shadow-primary/10" 
                                  : "bg-background border border-border/60 rounded-2xl rounded-tl-none hover:bg-muted/10"
                              )}
                            >
                              {msg.image_url && (
                                <div className="mb-2 -mx-1 overflow-hidden rounded-xl border border-white/10 ring-1 ring-black/5 shadow-inner">
                                  <Image
                                    src={msg.image_url}
                                    alt="Message image"
                                    width={300}
                                    height={300}
                                    className="object-cover hover:scale-105 transition-transform duration-700"
                                  />
                                </div>
                              )}
                              {msg.content && <p className="text-[15px] sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                              
                              <p className={cn(
                                "mt-1.5 text-[9px] font-bold tracking-tight opacity-50",
                                isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
                              )}>
                                {format(new Date(msg.created_at), "h:mm a")}
                                {isOwn && (
                                  <CheckCheck className={cn("ml-1.5 inline h-3 w-3", index === messages.length - 1 ? "opacity-100" : "opacity-40")} />
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-3 sm:p-4 bg-background/95 backdrop-blur shadow-2xl sticky bottom-0 z-20">
              {imagePreview && (
                <div className="relative mb-4 inline-block group">
                  <div className="overflow-hidden rounded-2xl border-2 border-primary/20 shadow-2xl">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={120}
                      height={120}
                      className="object-cover"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -right-3 -top-3 h-7 w-7 rounded-full shadow-lg transition-transform hover:scale-110"
                    onClick={clearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {canSendMessage ? (
                <div className="flex gap-2 items-end bg-muted/40 p-2 rounded-[24px] border border-border/40 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-2xl hover:bg-primary/10 hover:text-primary transition-all h-11 w-11 shrink-0 active:scale-90"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-5 w-5" />
                  </Button>
                  <Textarea
                    value={newMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                      setNewMessage(e.target.value);
                    }}
                    placeholder="Write your message..."
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 min-h-[44px] max-h-[120px] py-3 text-[16px] sm:text-sm leading-relaxed resize-none scrollbar-hide flex-1"
                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={sending || (!newMessage.trim() && !selectedImage)}
                    className="rounded-2xl h-11 w-11 p-0 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-90 shrink-0 bg-primary text-primary-foreground"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              ) : (
                <div className="bg-amber-500/5 rounded-2xl border-2 border-dashed border-amber-500/20 p-5 text-center shadow-inner">
                  <Megaphone className="h-6 w-6 text-amber-500 opacity-40 mx-auto mb-2" />
                  <p className="text-[10px] text-amber-600 font-black uppercase tracking-[0.2em] leading-relaxed">
                    Broadcast Mode Only<br/>
                    <span className="opacity-60 lowercase font-medium tracking-normal text-xs">Only authorized imams & admins can send messages here</span>
                  </p>
                </div>
              )}
              <div className="h-safe-bottom" /> {/* Margin for mobile home indicator */}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquarePlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

