"use client";

import { startTransition, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckCheck,
  Clock3,
  Loader2,
  Megaphone,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Reply,
  Search,
  Send,
  ShieldAlert,
  SmilePlus,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseBrowserEnv } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { FEED_UPLOAD_ACCEPT, MAX_FEED_ATTACHMENTS, normalizeFeedAttachment } from "@/lib/feed/media";
import { useBroadcast, useRealtimeSubscription } from "@/lib/hooks/use-realtime";
import type {
  ConversationInboxFilter,
  ConversationType,
  MessagingAttachment,
  MessagingConversation,
  MessagingMessage,
  MessagingProfile,
} from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type CommunityMember = MessagingProfile & {
  bio?: string | null;
  profession?: string | null;
};

type SearchHit = {
  message: MessagingMessage;
  conversation: Pick<MessagingConversation, "id" | "name" | "type" | "image_url" | "updated_at" | "participants">;
};

type PendingAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
  name: string;
  kind: "image" | "video" | "file";
  size: number;
};

const REACTION_OPTIONS = ["👍", "❤️", "😂", "🙏"];
const FILTERS: Array<{ value: ConversationInboxFilter; label: string }> = [
  { value: "primary", label: "Inbox" },
  { value: "requests", label: "Requests" },
  { value: "archived", label: "Archived" },
  { value: "broadcast", label: "Broadcast" },
];

function initials(name: string | null | undefined) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MC"
  );
}

function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  return Date.now() - Date.parse(lastSeenAt) <= 5 * 60 * 1000;
}

function formatMessageDay(timestamp: string) {
  const date = new Date(timestamp);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function getConversationName(conversation: MessagingConversation, viewerUserId: string | null) {
  if (conversation.name?.trim()) return conversation.name;
  if (conversation.type === "direct") {
    return (
      conversation.participants.find((participant) => participant.user_id !== viewerUserId)?.profile?.full_name ??
      "Direct Message"
    );
  }
  return conversation.type === "broadcast" ? "Broadcast" : "Group Chat";
}

function getConversationAvatar(conversation: MessagingConversation, viewerUserId: string | null) {
  if (conversation.image_url) return conversation.image_url;
  if (conversation.type === "direct") {
    return (
      conversation.participants.find((participant) => participant.user_id !== viewerUserId)?.profile?.avatar_url ?? null
    );
  }
  return null;
}

function mergeMessages(existing: MessagingMessage[], incoming: MessagingMessage[]) {
  const map = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) {
    map.set(message.id, message);
  }
  return [...map.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

function mergeReadReceipts(
  existing: MessagingMessage["read_by"],
  incoming: { user_id: string; read_at: string }
) {
  const next = [...existing];
  const existingIndex = next.findIndex((receipt) => receipt.user_id === incoming.user_id);

  if (existingIndex >= 0) {
    next[existingIndex] = incoming;
  } else {
    next.push(incoming);
  }

  return next.sort((a, b) => Date.parse(a.read_at) - Date.parse(b.read_at));
}

function updateReactionSummaries(
  existing: MessagingMessage["reactions"],
  incoming: { emoji: string; userId: string; viewerUserId: string; remove?: boolean }
) {
  const next = existing.map((reaction) => ({
    ...reaction,
    user_ids: [...reaction.user_ids],
  }));
  const reactionIndex = next.findIndex((reaction) => reaction.emoji === incoming.emoji);

  if (incoming.remove) {
    if (reactionIndex < 0) return next;

    const reaction = next[reactionIndex];
    const userIds = reaction.user_ids.filter((userId) => userId !== incoming.userId);
    if (userIds.length === 0) {
      next.splice(reactionIndex, 1);
      return next;
    }

    next[reactionIndex] = {
      ...reaction,
      count: userIds.length,
      reacted: userIds.includes(incoming.viewerUserId),
      user_ids: userIds,
    };
    return next;
  }

  if (reactionIndex < 0) {
    return [
      ...next,
      {
        emoji: incoming.emoji,
        count: 1,
        reacted: incoming.userId === incoming.viewerUserId,
        user_ids: [incoming.userId],
      },
    ];
  }

  const reaction = next[reactionIndex];
  if (reaction.user_ids.includes(incoming.userId)) {
    return next;
  }

  const userIds = [...reaction.user_ids, incoming.userId];
  next[reactionIndex] = {
    ...reaction,
    count: userIds.length,
    reacted: userIds.includes(incoming.viewerUserId),
    user_ids: userIds,
  };
  return next;
}

function coerceAttachmentKind(file: File): PendingAttachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function attachmentLabel(attachment: MessagingAttachment) {
  return attachment.name || attachment.pathname || "Attachment";
}

function messagePreview(message: MessagingMessage | null) {
  if (!message) return "No messages yet";
  if (message.is_deleted) return "Message removed";
  if (message.attachments.length > 0 && !message.content) {
    return message.attachments.length > 1 ? `${message.attachments.length} attachments` : attachmentLabel(message.attachments[0]);
  }
  return message.content || "Message";
}

export function MessengerCoreView() {
  const { userId, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = hasSupabaseBrowserEnv ? createClient() : null;

  const [filter, setFilter] = useState<ConversationInboxFilter>("primary");
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<MessagingConversation | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [nextMessageCursor, setNextMessageCursor] = useState<string | null>(null);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [composeType, setComposeType] = useState<ConversationType>("direct");
  const [composeParticipants, setComposeParticipants] = useState<CommunityMember[]>([]);
  const [composeName, setComposeName] = useState("");
  const [composeOpener, setComposeOpener] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [replyTarget, setReplyTarget] = useState<MessagingMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [groupRename, setGroupRename] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingStopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingUserTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const conversationRefreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotifiedMessageId = useRef<string | null>(null);
  const windowFocused = useRef(true);
  const deepLinkHandled = useRef(false);
  const deferredQuery = useDeferredValue(query);

  const selectedConversationName = selectedConversation ? getConversationName(selectedConversation, userId) : null;
  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unread_count, 0),
    [conversations]
  );

  const selectedMemberOptions = useMemo(() => {
    const selectedIds = new Set(composeParticipants.map((participant) => participant.id));
    const loweredQuery = memberQuery.trim().toLowerCase();
    return members.filter((member) => {
      if (member.id === userId || selectedIds.has(member.id)) return false;
      if (!loweredQuery) return true;
      const haystack = `${member.full_name ?? ""} ${member.email ?? ""} ${member.role ?? ""}`.toLowerCase();
      return haystack.includes(loweredQuery);
    });
  }, [composeParticipants, memberQuery, members, userId]);

  const availableGroupMembers = useMemo(() => {
    if (!selectedConversation) return [];
    const currentIds = new Set(selectedConversation.participants.map((participant) => participant.user_id));
    return members.filter((member) => !currentIds.has(member.id) && member.id !== userId);
  }, [members, selectedConversation, userId]);

  const typingLabel = useMemo(() => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.slice(0, 2).join(", ")} are typing...`;
  }, [typingUsers]);

  const { send: sendTypingSignal } = useBroadcast({
    channelName: selectedConversationId ? `typing-${selectedConversationId}` : "typing-inactive",
    eventName: "typing",
    enabled: Boolean(selectedConversationId && userId),
    onMessage: (payload: { user_id?: string; name?: string; is_typing?: boolean }) => {
      if (!payload.user_id || payload.user_id === userId) return;
      const displayName = payload.name || "Someone";
      setTypingUsers((current) => {
        const next = { ...current };
        if (payload.is_typing) {
          next[payload.user_id!] = displayName;
        } else {
          delete next[payload.user_id!];
        }
        return next;
      });

      const existingTimeout = typingUserTimeouts.current.get(payload.user_id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (payload.is_typing) {
        const timeout = setTimeout(() => {
          setTypingUsers((current) => {
            const next = { ...current };
            delete next[payload.user_id!];
            return next;
          });
        }, 1800);

        typingUserTimeouts.current.set(payload.user_id, timeout);
      }
    },
  });

  const loadMembers = useEffectEvent(async () => {
    if (!userId) return;

    const response = await fetch("/api/users/community", { cache: "no-store" });
    const payload = (await response.json()) as { data?: CommunityMember[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "Failed to load members");
    }

    startTransition(() => {
      setMembers(payload.data ?? []);
    });
  });

  const loadConversationDetail = useEffectEvent(async (conversationId: string, options?: { silent?: boolean }) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
      const payload = (await response.json()) as { conversation?: MessagingConversation; error?: string };
      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "Failed to load conversation");
      }

      const conversation = payload.conversation;
      startTransition(() => {
        setSelectedConversation(conversation);
        setGroupRename(conversation.name ?? "");
      });
    } catch (error) {
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load conversation");
      }
    }
  });

  const loadConversations = useEffectEvent(async (options?: { silent?: boolean }) => {
    if (!userId) return;

    const shouldShowLoading = !options?.silent && conversations.length === 0;
    if (shouldShowLoading) {
      setLoadingConversations(true);
    }
    try {
      const search = new URLSearchParams();
      search.set("folder", filter);
      const trimmedQuery = deferredQuery.trim();
      if (trimmedQuery) search.set("q", trimmedQuery);
      search.set("limit", "40");

      const response = await fetch(`/api/conversations?${search.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as { conversations?: MessagingConversation[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load conversations");
      }

      const items = payload.conversations ?? [];
      startTransition(() => {
        setConversations(items);
        setSelectedConversationId((currentSelectedConversationId) => {
          if (currentSelectedConversationId) {
            const stillVisible = items.some((conversation) => conversation.id === currentSelectedConversationId);
            return stillVisible ? currentSelectedConversationId : items[0]?.id ?? null;
          }

          return items[0]?.id ?? null;
        });
      });
    } catch (error) {
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load conversations");
      }
    } finally {
      if (shouldShowLoading) {
        setLoadingConversations(false);
      }
    }
  });

  const markConversationRead = useEffectEvent(async (conversationId: string, nextMessages: MessagingMessage[]) => {
    const unreadMessageIds = nextMessages
      .filter(
        (message) =>
          message.sender_id &&
          message.sender_id !== userId &&
          !message.read_by.some((receipt) => receipt.user_id === userId)
      )
      .map((message) => message.id);

    if (unreadMessageIds.length === 0) return;

    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unreadMessageIds }),
      });
    } catch {
      // Best-effort read sync.
    }
  });

  const loadMessages = useEffectEvent(
    async (
      conversationId: string,
      cursor?: string | null,
      append = false,
      options?: { silent?: boolean; syncRead?: boolean }
    ) => {
      const shouldShowLoading = !append && !options?.silent && messages.length === 0;
      if (shouldShowLoading) {
        setLoadingMessages(true);
      }

      try {
      const search = new URLSearchParams();
      search.set("limit", "30");
      if (cursor) search.set("cursor", cursor);

      const response = await fetch(`/api/conversations/${conversationId}/messages?${search.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        messages?: MessagingMessage[];
        next_cursor?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load messages");
      }

      const nextMessages = payload.messages ?? [];
      startTransition(() => {
        setMessages((current) => (append ? mergeMessages(nextMessages, current) : nextMessages));
        setNextMessageCursor(payload.next_cursor ?? null);
      });
      if (options?.syncRead !== false) {
        void markConversationRead(conversationId, nextMessages);
      }
    } catch (error) {
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load messages");
      }
    } finally {
      if (shouldShowLoading) {
        setLoadingMessages(false);
      }
    }
    }
  );

  const loadMessageById = useEffectEvent(async (messageId: string, options?: { silent?: boolean }) => {
    try {
      const response = await fetch(`/api/messages/detail?id=${encodeURIComponent(messageId)}`, { cache: "no-store" });
      const payload = (await response.json()) as { message?: MessagingMessage; error?: string };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Failed to load message");
      }

      startTransition(() => {
        setMessages((current) => mergeMessages(current, [payload.message!]));
      });
    } catch (error) {
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load message");
      }
    }
  });

  const loadSearchResults = useEffectEvent(async () => {
    const trimmed = deferredQuery.trim();
    if (trimmed.length < 2) {
      startTransition(() => {
        setSearchHits([]);
      });
      return;
    }

    setLoadingSearch(true);
    try {
      const response = await fetch(`/api/messages/search?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
      const payload = (await response.json()) as { messages?: SearchHit[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to search messages");
      }

      startTransition(() => {
        setSearchHits(payload.messages ?? []);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to search messages");
    } finally {
      setLoadingSearch(false);
    }
  });

  const resetComposer = () => {
    setDraft("");
    setPendingAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      return [];
    });
    setReplyTarget(null);
    setEditingMessageId(null);
    setEditingDraft("");
  };

  const openConversation = useEffectEvent(async (conversationId: string) => {
    await Promise.all([loadConversationDetail(conversationId), loadMessages(conversationId)]);
    setDetailsOpen(false);
    resetComposer();
  });

  const scheduleConversationRefresh = useEffectEvent((delay = 180) => {
    if (conversationRefreshTimeout.current) {
      clearTimeout(conversationRefreshTimeout.current);
    }

    conversationRefreshTimeout.current = setTimeout(() => {
      conversationRefreshTimeout.current = null;
      void loadConversations({ silent: true });
    }, delay);
  });

  const uploadPendingAttachments = useEffectEvent(async () => {
    const uploaded: MessagingAttachment[] = [];

    for (const pending of pendingAttachments) {
      const formData = new FormData();
      formData.append("file", pending.file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        attachment?: {
          url: string;
          pathname: string | null;
          kind: "image" | "video" | "file";
          mimeType?: string | null;
          name?: string | null;
          size?: number | null;
        };
        error?: string;
      };

      if (!response.ok || !payload.attachment) {
        throw new Error(payload.error || "Failed to upload attachment");
      }

      const normalized = normalizeFeedAttachment({
        url: payload.attachment.url,
        pathname: payload.attachment.pathname ?? null,
        kind: payload.attachment.kind,
        mimeType: payload.attachment.mimeType ?? null,
        name: payload.attachment.name ?? pending.name,
        size: payload.attachment.size ?? pending.size,
        sortOrder: uploaded.length,
      });

      if (normalized) {
        uploaded.push({
          id: `upload-${uploaded.length}`,
          message_id: "",
          kind: normalized.kind,
          url: normalized.url,
          pathname: normalized.pathname ?? null,
          mime_type: normalized.mimeType ?? null,
          name: normalized.name ?? null,
          size: normalized.size ?? null,
          sort_order: normalized.sortOrder ?? uploaded.length,
          created_at: new Date().toISOString(),
        });
      }
    }

    return uploaded;
  });

  const runConversationAction = useEffectEvent(async (action: string) => {
    if (!selectedConversationId) return;

    const response = await fetch(`/api/conversations/${selectedConversationId}/${action}`, { method: "POST" });
    const payload = (await response.json()) as { conversation?: MessagingConversation; error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "Conversation action failed");
    }

    if (payload.conversation) {
      setSelectedConversation(payload.conversation);
    }
    await loadConversations();
    if (selectedConversationId) {
      await loadConversationDetail(selectedConversationId);
    }
  });

  const handleTypingDraftChange = (value: string) => {
    setDraft(value);

    if (!selectedConversationId || !userId) return;

    void sendTypingSignal({
      user_id: userId,
      name: profile?.full_name ?? "You",
      is_typing: value.trim().length > 0,
    });

    if (typingStopTimeout.current) {
      clearTimeout(typingStopTimeout.current);
    }

    typingStopTimeout.current = setTimeout(() => {
      void sendTypingSignal({
        user_id: userId,
        name: profile?.full_name ?? "You",
        is_typing: false,
      });
    }, 1200);
  };

  useEffect(() => {
    if (!userId) return;
    const needsMembers =
      showNewConversation ||
      (detailsOpen &&
        selectedConversation?.type === "group" &&
        selectedConversation.viewer_participation.role === "admin");

    if (!needsMembers || members.length > 0) return;
    void loadMembers();
  }, [
    userId,
    showNewConversation,
    detailsOpen,
    members.length,
    selectedConversation?.id,
    selectedConversation?.type,
    selectedConversation?.viewer_participation.role,
  ]);

  useEffect(() => {
    if (!userId) return;
    void loadConversations();
  }, [userId, filter, deferredQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadSearchResults();
    }, 250);
    return () => clearTimeout(timeout);
  }, [deferredQuery]);

  useEffect(() => {
    const onFocus = () => {
      windowFocused.current = true;
    };
    const onBlur = () => {
      windowFocused.current = false;
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = totalUnread > 0 ? `(${totalUnread}) Messages | MosqueConnect` : "Messages | MosqueConnect";
  }, [totalUnread]);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation((current) => (current ? null : current));
      setMessages((current) => (current.length > 0 ? [] : current));
      setNextMessageCursor((current) => (current ? null : current));
      return;
    }

    const previewConversation = conversations.find((conversation) => conversation.id === selectedConversationId);
    if (previewConversation) {
      startTransition(() => {
        setSelectedConversation((current) => {
          if (
            current?.id === previewConversation.id &&
            current.participants.length > previewConversation.participants.length
          ) {
            return {
              ...previewConversation,
              participants: current.participants,
            };
          }

          return previewConversation;
        });
        setGroupRename(previewConversation.name ?? "");
      });
    }

    void openConversation(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    return () => {
      if (conversationRefreshTimeout.current) {
        clearTimeout(conversationRefreshTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (deepLinkHandled.current || !userId) return;

    const requestedConversationId = searchParams.get("conversationId") ?? searchParams.get("conversation");
    const requestedUserId = searchParams.get("userId");
    if (!requestedConversationId && !requestedUserId) return;

    deepLinkHandled.current = true;

    if (requestedConversationId) {
      setSelectedConversationId(requestedConversationId);
      return;
    }

    if (requestedUserId) {
      void (async () => {
        try {
          const response = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "direct", participantIds: [requestedUserId] }),
          });
          const payload = (await response.json()) as { conversation?: MessagingConversation; error?: string };
          if (!response.ok || !payload.conversation) {
            throw new Error(payload.error || "Failed to open conversation");
          }
          setSelectedConversationId(payload.conversation.id);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to open conversation");
        } finally {
          router.replace("/messages");
        }
      })();
    }
  }, [router, searchParams, userId]);

  useRealtimeSubscription({
    table: "messages",
    event: "*",
    enabled: Boolean(userId && supabase),
    onChange: async (payload) => {
      const conversationId = String((payload.new as { conversation_id?: string } | null)?.conversation_id ?? (payload.old as { conversation_id?: string } | null)?.conversation_id ?? "");
      if (!conversationId) return;
      const messageId = String((payload.new as { id?: string } | null)?.id ?? (payload.old as { id?: string } | null)?.id ?? "");
      const senderId = String((payload.new as { sender_id?: string } | null)?.sender_id ?? "");
      const isOwnInsert = payload.eventType === "INSERT" && senderId === userId;

      if (selectedConversationId === conversationId) {
        if (!isOwnInsert && messageId) {
          void loadMessageById(messageId, { silent: true });
        }
        scheduleConversationRefresh();
      } else {
        scheduleConversationRefresh();
      }

      if (
        payload.eventType === "INSERT" &&
        selectedConversationId !== conversationId &&
        senderId !== userId
      ) {
        if (messageId && messageId !== lastNotifiedMessageId.current) {
          lastNotifiedMessageId.current = messageId;
          toast.info("New message received");
        }
      }
    },
  });

  useRealtimeSubscription({
    table: "conversation_participants",
    event: "*",
    enabled: Boolean(userId && supabase),
    onChange: async (payload) => {
      const conversationId = String((payload.new as { conversation_id?: string } | null)?.conversation_id ?? (payload.old as { conversation_id?: string } | null)?.conversation_id ?? "");
      scheduleConversationRefresh();
      if (selectedConversationId && conversationId === selectedConversationId) {
        await loadConversationDetail(selectedConversationId, { silent: true });
      }
    },
  });

  useRealtimeSubscription({
    table: "message_reactions",
    event: "*",
    enabled: Boolean(selectedConversationId && supabase),
    onChange: async (payload) => {
      const source = (payload.new as { message_id?: string; user_id?: string; emoji?: string } | null) ?? (payload.old as { message_id?: string; user_id?: string; emoji?: string } | null);
      const messageId = String(source?.message_id ?? "");
      const reactionUserId = String(source?.user_id ?? "");
      const emoji = String(source?.emoji ?? "");
      if (!messageId || !reactionUserId || !emoji || !userId) return;

      startTransition(() => {
        setMessages((current) =>
          current.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  reactions: updateReactionSummaries(message.reactions, {
                    emoji,
                    userId: reactionUserId,
                    viewerUserId: userId,
                    remove: payload.eventType === "DELETE",
                  }),
                }
              : message
          )
        );
      });
    },
  });

  useRealtimeSubscription({
    table: "message_reads",
    event: "*",
    enabled: Boolean(selectedConversationId && supabase),
    onChange: async (payload) => {
      const source = (payload.new as { message_id?: string; user_id?: string; read_at?: string } | null) ?? (payload.old as { message_id?: string; user_id?: string; read_at?: string } | null);
      const messageId = String(source?.message_id ?? "");
      const readUserId = String(source?.user_id ?? "");
      const readAt = String(source?.read_at ?? "");
      if (!messageId || !readUserId || !readAt) return;

      startTransition(() => {
        setMessages((current) =>
          current.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  read_by: mergeReadReceipts(message.read_by, { user_id: readUserId, read_at: readAt }),
                }
              : message
          )
        );
      });

      if (readUserId === userId) {
        scheduleConversationRefresh(140);
      }
    },
  });

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;

    setPendingAttachments((current) => {
      const next = [...current];
      for (const file of selected.slice(0, MAX_FEED_ATTACHMENTS - current.length)) {
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${next.length}`,
          file,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
          name: file.name,
          kind: coerceAttachmentKind(file),
          size: file.size,
        });
      }
      return next.slice(0, MAX_FEED_ATTACHMENTS);
    });

    event.target.value = "";
  };

  const removePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((current) => {
      const match = current.find((attachment) => attachment.id === attachmentId);
      if (match?.previewUrl) URL.revokeObjectURL(match.previewUrl);
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const createConversationRequest = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: composeType,
          name: composeType === "direct" ? null : composeName,
          participantIds: composeParticipants.map((participant) => participant.id),
          openerMessage: composeOpener || null,
        }),
      });
      const payload = (await response.json()) as { conversation?: MessagingConversation; error?: string };
      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "Failed to create conversation");
      }

      setShowNewConversation(false);
      setComposeParticipants([]);
      setComposeName("");
      setComposeOpener("");
      setComposeType("direct");
      setMemberQuery("");
      await loadConversations();
      setSelectedConversationId(payload.conversation.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create conversation");
    }
  };

  const sendCurrentMessage = async () => {
    if (!selectedConversationId || sending) return;

    if (editingMessageId) {
      try {
        setSending(true);
        const response = await fetch(`/api/messages/${editingMessageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editingDraft }),
        });
        const payload = (await response.json()) as { message?: MessagingMessage; error?: string };
        if (!response.ok || !payload.message) {
          throw new Error(payload.error || "Failed to update message");
        }

        setMessages((current) => current.map((message) => (message.id === payload.message!.id ? payload.message! : message)));
        setEditingMessageId(null);
        setEditingDraft("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update message");
      } finally {
        setSending(false);
      }
      return;
    }

    if (!draft.trim() && pendingAttachments.length === 0) return;

    const temporaryId = `temp-${Date.now()}`;
    try {
      setSending(true);
      const uploadedAttachments = await uploadPendingAttachments();
      const optimisticMessage: MessagingMessage = {
        id: temporaryId,
        conversation_id: selectedConversationId,
        sender_id: userId,
        content: draft.trim() || null,
        message_type: uploadedAttachments.length > 0 ? (uploadedAttachments[0].kind === "image" ? "image" : "file") : "text",
        image_url: uploadedAttachments.find((attachment) => attachment.kind === "image")?.url ?? null,
        file_url: uploadedAttachments.find((attachment) => attachment.kind === "file")?.url ?? null,
        file_name: uploadedAttachments.find((attachment) => attachment.kind === "file")?.name ?? null,
        reply_to_id: replyTarget?.id ?? null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: profile
          ? {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              role: profile.role,
            }
          : null,
        reply_to: replyTarget
          ? {
              id: replyTarget.id,
              content: replyTarget.content,
              sender: replyTarget.sender
                ? { id: replyTarget.sender.id, full_name: replyTarget.sender.full_name }
                : null,
            }
          : null,
        attachments: uploadedAttachments,
        reactions: [],
        read_by: [],
      };

      setMessages((current) => mergeMessages(current, [optimisticMessage]));

      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: draft.trim() || null,
          attachments: uploadedAttachments.map((attachment, index) => ({
            url: attachment.url,
            pathname: attachment.pathname,
            kind: attachment.kind,
            mimeType: attachment.mime_type,
            name: attachment.name,
            size: attachment.size,
            sortOrder: attachment.sort_order ?? index,
          })),
          replyToId: replyTarget?.id ?? null,
        }),
      });
      const payload = (await response.json()) as {
        message?: MessagingMessage;
        conversation?: MessagingConversation;
        error?: string;
      };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Failed to send message");
      }

      setMessages((current) =>
        current.map((message) => (message.id === temporaryId ? payload.message! : message))
      );
      if (payload.conversation) {
        setSelectedConversation(payload.conversation);
      }
      resetComposer();
      scheduleConversationRefresh(80);
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== temporaryId));
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (message: MessagingMessage, emoji: string) => {
    try {
      const reacted = message.reactions.find((reaction) => reaction.emoji === emoji)?.reacted;
      const response = await fetch(
        reacted ? `/api/messages/${message.id}/reactions?emoji=${encodeURIComponent(emoji)}` : `/api/messages/${message.id}/reactions`,
        reacted
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emoji }),
            }
      );

      const payload = (await response.json()) as { message?: MessagingMessage; error?: string };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Failed to update reaction");
      }

      setMessages((current) => current.map((entry) => (entry.id === message.id ? payload.message! : entry)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reaction");
    }
  };

  const reportMessagePrompt = async (messageId: string) => {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason) return;

    try {
      const response = await fetch(`/api/messages/${messageId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to report message");
      }
      toast.success("Message reported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to report message");
    }
  };

  const removeMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: MessagingMessage; error?: string };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Failed to delete message");
      }
      setMessages((current) => current.map((message) => (message.id === messageId ? payload.message! : message)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete message");
    }
  };

  const updateGroupName = async () => {
    if (!selectedConversationId) return;

    try {
      const response = await fetch(`/api/conversations/${selectedConversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupRename }),
      });
      const payload = (await response.json()) as { conversation?: MessagingConversation; error?: string };
      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "Failed to update group");
      }
      setSelectedConversation(payload.conversation);
      scheduleConversationRefresh(80);
      toast.success("Conversation updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update conversation");
    }
  };

  const addMemberToGroup = async (memberId: string) => {
    if (!selectedConversationId) return;

    try {
      const response = await fetch(`/api/conversations/${selectedConversationId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [memberId] }),
      });
      const payload = (await response.json()) as { conversation?: MessagingConversation; error?: string };
      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "Failed to add participant");
      }
      setSelectedConversation(payload.conversation);
      scheduleConversationRefresh(80);
      toast.success("Participant added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add participant");
    }
  };

  const updateMemberRole = async (memberId: string, role: "admin" | "member") => {
    if (!selectedConversationId) return;

    try {
      const response = await fetch(`/api/conversations/${selectedConversationId}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, role }),
      });
      const payload = (await response.json()) as { conversation?: MessagingConversation; error?: string };
      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "Failed to update participant");
      }
      setSelectedConversation(payload.conversation);
      scheduleConversationRefresh(80);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update participant");
    }
  };

  const removeMemberFromGroup = async (memberId: string) => {
    if (!selectedConversationId) return;

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversationId}/participants?userId=${encodeURIComponent(memberId)}`,
        { method: "DELETE" }
      );
      const payload = (await response.json()) as { conversation?: MessagingConversation; error?: string };
      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "Failed to remove participant");
      }
      setSelectedConversation(payload.conversation);
      scheduleConversationRefresh(80);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove participant");
    }
  };

  if (!hasSupabaseBrowserEnv) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center px-6 text-center">
        <div>
          <p className="font-medium">Messaging is unavailable in local guest mode</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your Supabase environment variables to enable the messenger experience.
          </p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view messages.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden rounded-3xl border border-border/50 bg-background shadow-sm">
      <div
        className={cn(
          "flex w-full flex-col border-r border-border/60 bg-muted/20 md:w-[340px] lg:w-[380px]",
          selectedConversationId ? "hidden md:flex" : "flex"
        )}
      >
        <div className="border-b border-border/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Messages</h2>
              <p className="text-sm text-muted-foreground">Community inbox</p>
            </div>
            <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
              <DialogTrigger asChild>
                <Button size="icon" className="rounded-2xl">
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Start a conversation</DialogTitle>
                  <DialogDescription>
                    Create a direct message, group, or privileged broadcast with community members.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    {(["direct", "group", "broadcast"] as ConversationType[]).map((type) => {
                      if (type === "broadcast" && (!profile?.role || !["imam", "shura", "admin", "super_admin"].includes(profile.role))) {
                        return null;
                      }

                      return (
                        <Button
                          key={type}
                          type="button"
                          variant={composeType === type ? "default" : "outline"}
                          onClick={() => setComposeType(type)}
                          className="rounded-2xl capitalize"
                        >
                          {type === "direct" ? "Direct" : type}
                        </Button>
                      );
                    })}
                  </div>

                  {composeType !== "direct" && (
                    <div className="grid gap-2">
                      <Label htmlFor="compose-name">Conversation name</Label>
                      <Input
                        id="compose-name"
                        value={composeName}
                        onChange={(event) => setComposeName(event.target.value)}
                        placeholder={composeType === "broadcast" ? "Friday reminders" : "Youth Volunteers"}
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="member-search">Add people</Label>
                    <Input
                      id="member-search"
                      value={memberQuery}
                      onChange={(event) => setMemberQuery(event.target.value)}
                      placeholder="Search by name, role, or email"
                    />
                  </div>

                  {composeParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {composeParticipants.map((participant) => (
                        <Badge key={participant.id} variant="secondary" className="rounded-full px-3 py-1">
                          {participant.full_name}
                          <button
                            type="button"
                            className="ml-2 text-muted-foreground"
                            onClick={() =>
                              setComposeParticipants((current) =>
                                current.filter((currentParticipant) => currentParticipant.id !== participant.id)
                              )
                            }
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <ScrollArea className="h-56 rounded-2xl border border-border/50">
                    <div className="space-y-1 p-2">
                      {selectedMemberOptions.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-muted"
                          onClick={() => {
                            setComposeParticipants((current) =>
                              composeType === "direct" ? [member] : [...current, member]
                            );
                            if (composeType === "direct") {
                              setMemberQuery("");
                            }
                          }}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatar_url ?? ""} />
                            <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground">{member.email || member.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="grid gap-2">
                    <Label htmlFor="compose-opener">Opening message</Label>
                    <Textarea
                      id="compose-opener"
                      value={composeOpener}
                      onChange={(event) => setComposeOpener(event.target.value)}
                      placeholder={composeType === "direct" ? "Say salam and introduce the reason for the message." : "Optional first message"}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={createConversationRequest}
                    disabled={
                      composeParticipants.length === 0 ||
                      (composeType !== "direct" && !composeName.trim())
                    }
                  >
                    Start conversation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations and messages"
              className="rounded-2xl pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {FILTERS.map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item.value)}
              className="rounded-full"
            >
              {item.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          {loadingSearch && query.trim().length >= 2 && (
            <div className="px-4 pb-2 text-xs text-muted-foreground">Searching...</div>
          )}

          {searchHits.length > 0 && query.trim().length >= 2 && (
            <div className="px-4 pb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Search results</p>
              <div className="space-y-2">
                {searchHits.map((hit) => (
                  <button
                    key={hit.message.id}
                    className="w-full rounded-2xl border border-border/60 bg-background p-3 text-left hover:border-primary/40"
                    onClick={() => setSelectedConversationId(hit.conversation.id)}
                  >
                    <p className="text-sm font-medium">{hit.conversation.name || "Conversation"}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hit.message.content}</p>
                  </button>
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          )}

          <div className="space-y-1 px-2 pb-4">
            {loadingConversations &&
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-2xl p-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}

            {!loadingConversations && conversations.length === 0 && (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <MessageSquarePlus className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Nothing here yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start a new conversation or switch filters to see archived and request threads.
                </p>
              </div>
            )}

            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-muted/70",
                  selectedConversationId === conversation.id && "bg-muted"
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getConversationAvatar(conversation, userId) ?? ""} />
                    <AvatarFallback>{initials(getConversationName(conversation, userId))}</AvatarFallback>
                  </Avatar>
                  {conversation.unread_count > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{getConversationName(conversation, userId)}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {conversation.last_message ? formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: false }) : ""}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{messagePreview(conversation.last_message)}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className={cn("flex flex-1 flex-col", !selectedConversationId && "hidden md:flex")}>
        {selectedConversation ? (
          <>
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
              <Button variant="ghost" size="icon" className="rounded-2xl md:hidden" onClick={() => setSelectedConversationId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={getConversationAvatar(selectedConversation, userId) ?? ""} />
                <AvatarFallback>{initials(selectedConversationName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{selectedConversationName}</p>
                  {selectedConversation.type === "broadcast" && <Badge variant="secondary">Broadcast</Badge>}
                  {selectedConversation.viewer_participation.membership_state === "requested" && <Badge variant="outline">Request</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedConversation.type === "direct"
                    ? isOnline(
                        selectedConversation.participants.find((participant) => participant.user_id !== userId)?.profile?.last_seen_at
                      )
                      ? "Online now"
                      : "Offline"
                    : `${selectedConversation.participants.filter((participant) => participant.membership_state === "active").length} active members`}
                </p>
              </div>

              <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-2xl">
                    <Users className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>{selectedConversationName}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {selectedConversation.type !== "direct" && (
                      <div className="space-y-2">
                        <Label htmlFor="rename">Conversation name</Label>
                        <div className="flex gap-2">
                          <Input id="rename" value={groupRename} onChange={(event) => setGroupRename(event.target.value)} />
                          <Button onClick={updateGroupName}>Save</Button>
                        </div>
                      </div>
                    )}

                    {selectedConversation.type === "group" && selectedConversation.viewer_participation.role === "admin" && (
                      <div className="space-y-2">
                        <Label>Add members</Label>
                        <div className="space-y-2 rounded-2xl border border-border/60 p-3">
                          {availableGroupMembers.slice(0, 6).map((member) => (
                            <div key={member.id} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={member.avatar_url ?? ""} />
                                  <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{member.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{member.role}</p>
                                </div>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => void addMemberToGroup(member.id)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label>Participants</Label>
                      <div className="space-y-2">
                        {selectedConversation.participants.map((participant) => (
                          <div key={participant.id} className="rounded-2xl border border-border/60 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={participant.profile?.avatar_url ?? ""} />
                                  <AvatarFallback>{initials(participant.profile?.full_name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{participant.profile?.full_name || "Member"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {participant.role} • {participant.membership_state}
                                  </p>
                                </div>
                              </div>

                              {selectedConversation.type === "group" &&
                                selectedConversation.viewer_participation.role === "admin" &&
                                participant.user_id !== userId &&
                                participant.membership_state === "active" && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="rounded-full">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => void updateMemberRole(participant.user_id, participant.role === "admin" ? "member" : "admin")}
                                      >
                                        {participant.role === "admin" ? "Make member" : "Make admin"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" onClick={() => void removeMemberFromGroup(participant.user_id)}>
                                        Remove from group
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-2xl">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {selectedConversation.viewer_participation.membership_state === "requested" && (
                    <>
                      <DropdownMenuItem onClick={() => void runConversationAction("accept")}>Accept request</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void runConversationAction("ignore")}>Ignore request</DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => void runConversationAction(selectedConversation.viewer_participation.is_muted ? "unmute" : "mute")}>
                    {selectedConversation.viewer_participation.is_muted ? (
                      <>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <VolumeX className="mr-2 h-4 w-4" />
                        Mute
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void runConversationAction(selectedConversation.viewer_participation.folder === "archived" ? "unarchive" : "archive")}>
                    <Archive className="mr-2 h-4 w-4" />
                    {selectedConversation.viewer_participation.folder === "archived" ? "Move to inbox" : "Archive"}
                  </DropdownMenuItem>
                  {selectedConversation.type !== "direct" && (
                    <DropdownMenuItem onClick={() => void runConversationAction("leave")}>Leave conversation</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ScrollArea className="flex-1 bg-[radial-gradient(circle_at_top,#f8fafc,transparent_45%)] px-4 py-6">
              {loadingMessages ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-3xl bg-primary/10 p-5 text-primary">
                    <Send className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-semibold">Start the conversation</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Introduce yourself, share context, and keep the discussion welcoming for the community.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {nextMessageCursor && (
                    <div className="flex justify-center">
                      <Button variant="outline" size="sm" onClick={() => void loadMessages(selectedConversation.id, nextMessageCursor, true)}>
                        Load older messages
                      </Button>
                    </div>
                  )}

                  {messages.map((message, index) => {
                    const ownMessage = message.sender_id === userId;
                    const previousMessage = messages[index - 1];
                    const showDate = !previousMessage || formatMessageDay(previousMessage.created_at) !== formatMessageDay(message.created_at);
                    const showAvatar = !previousMessage || previousMessage.sender_id !== message.sender_id;
                    const seenByOthers =
                      selectedConversation.type === "direct" &&
                      ownMessage &&
                      message.read_by.some((receipt) => receipt.user_id !== userId);

                    return (
                      <div key={message.id} className="space-y-2">
                        {showDate && (
                          <div className="flex items-center gap-3 py-2">
                            <div className="h-px flex-1 bg-border/60" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                              {formatMessageDay(message.created_at)}
                            </span>
                            <div className="h-px flex-1 bg-border/60" />
                          </div>
                        )}

                        <div className={cn("flex gap-3", ownMessage && "flex-row-reverse")}>
                          {showAvatar ? (
                            <Avatar className="mt-1 h-9 w-9">
                              <AvatarImage src={message.sender?.avatar_url ?? ""} />
                              <AvatarFallback>{initials(message.sender?.full_name)}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-9" />
                          )}

                          <div className={cn("max-w-[85%] space-y-2 md:max-w-[70%]", ownMessage && "items-end")}>
                            {showAvatar && !ownMessage && (
                              <p className="pl-1 text-xs font-medium text-muted-foreground">{message.sender?.full_name}</p>
                            )}

                            {message.reply_to && (
                              <div className={cn("rounded-2xl border px-3 py-2 text-xs", ownMessage ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background")}>
                                <p className="font-semibold">{message.reply_to.sender?.full_name || "Reply"}</p>
                                <p className="line-clamp-2 text-muted-foreground">{message.reply_to.content}</p>
                              </div>
                            )}

                            <div
                              className={cn(
                                "rounded-[24px] px-4 py-3 shadow-sm",
                                ownMessage
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border/60 bg-background"
                              )}
                            >
                              {message.attachments.length > 0 && (
                                <div className="mb-3 grid gap-2">
                                  {message.attachments.map((attachment) =>
                                    attachment.kind === "image" ? (
                                      <Image
                                        key={attachment.id}
                                        src={attachment.url}
                                        alt={attachmentLabel(attachment)}
                                        width={320}
                                        height={220}
                                        className="rounded-2xl object-cover"
                                      />
                                    ) : (
                                      <a
                                        key={attachment.id}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cn(
                                          "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                                          ownMessage ? "border-white/20 bg-white/10" : "border-border/60"
                                        )}
                                      >
                                        <Clock3 className="h-4 w-4" />
                                        <span className="truncate">{attachmentLabel(attachment)}</span>
                                      </a>
                                    )
                                  )}
                                </div>
                              )}

                              <p className={cn("whitespace-pre-wrap text-sm leading-6", message.is_deleted && "italic opacity-70")}>
                                {message.is_deleted ? "Message removed" : message.content}
                              </p>
                              <div className={cn("mt-2 flex items-center gap-2 text-[11px]", ownMessage ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                <span>{format(new Date(message.created_at), "h:mm a")}</span>
                                {message.is_edited && <span>edited</span>}
                                {seenByOthers && (
                                  <span className="inline-flex items-center gap-1">
                                    <CheckCheck className="h-3 w-3" />
                                    Seen
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className={cn("flex flex-wrap items-center gap-2 px-1", ownMessage && "justify-end")}>
                              {message.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  className={cn(
                                    "rounded-full border px-2 py-1 text-xs",
                                    reaction.reacted ? "border-primary bg-primary/10 text-primary" : "border-border/60"
                                  )}
                                  onClick={() => void toggleReaction(message, reaction.emoji)}
                                >
                                  {reaction.emoji} {reaction.count}
                                </button>
                              ))}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 rounded-full px-2">
                                    <SmilePlus className="mr-1 h-3.5 w-3.5" />
                                    React
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={ownMessage ? "end" : "start"}>
                                  {REACTION_OPTIONS.map((emoji) => (
                                    <DropdownMenuItem key={emoji} onClick={() => void toggleReaction(message, emoji)}>
                                      {emoji}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Button variant="ghost" size="sm" className="h-7 rounded-full px-2" onClick={() => setReplyTarget(message)}>
                                <Reply className="mr-1 h-3.5 w-3.5" />
                                Reply
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 rounded-full px-2">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={ownMessage ? "end" : "start"}>
                                  {ownMessage && !message.is_deleted && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingMessageId(message.id);
                                        setEditingDraft(message.content ?? "");
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {(ownMessage || ["admin", "shura", "imam", "super_admin"].includes(profile?.role ?? "")) && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => void removeMessage(message.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                  {!ownMessage && (
                                    <DropdownMenuItem onClick={() => void reportMessagePrompt(message.id)}>
                                      <ShieldAlert className="mr-2 h-4 w-4" />
                                      Report
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="border-t border-border/60 bg-background p-4">
              {selectedConversation.viewer_participation.membership_state === "requested" && (
                <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                  This thread is waiting for your approval. Accept to continue the conversation.
                </div>
              )}

              {replyTarget && (
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">Replying to {replyTarget.sender?.full_name || "message"}</p>
                    <p className="line-clamp-1 text-muted-foreground">{replyTarget.content}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setReplyTarget(null)}>
                    Clear
                  </Button>
                </div>
              )}

              {editingMessageId && (
                <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <Label htmlFor="edit-message">Editing message</Label>
                  <Textarea id="edit-message" value={editingDraft} onChange={(event) => setEditingDraft(event.target.value)} className="mt-2" />
                </div>
              )}

              {pendingAttachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingAttachments.map((attachment) => (
                    <div key={attachment.id} className="relative rounded-2xl border border-border/60 bg-muted/40 p-2">
                      {attachment.previewUrl ? (
                        <Image src={attachment.previewUrl} alt={attachment.name} width={80} height={80} className="rounded-xl object-cover" />
                      ) : (
                        <div className="w-32 pr-8 text-sm">{attachment.name}</div>
                      )}
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full bg-background/90 px-1.5 text-xs"
                        onClick={() => removePendingAttachment(attachment.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-[28px] border border-border/60 bg-muted/30 p-2">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={FEED_UPLOAD_ACCEPT}
                    className="hidden"
                    onChange={handleSelectFiles}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-2xl"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={pendingAttachments.length >= MAX_FEED_ATTACHMENTS}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Textarea
                    value={editingMessageId ? editingDraft : draft}
                    onChange={(event) => (editingMessageId ? setEditingDraft(event.target.value) : handleTypingDraftChange(event.target.value))}
                    placeholder={
                      selectedConversation.can_send
                        ? "Write a message..."
                        : selectedConversation.type === "direct"
                          ? "Accept this request before replying"
                          : "You cannot send messages here"
                    }
                    className="min-h-[48px] resize-none border-0 bg-transparent px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={!selectedConversation.can_send && !editingMessageId}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendCurrentMessage();
                      }
                    }}
                  />
                  <Button className="rounded-2xl" onClick={() => void sendCurrentMessage()} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {typingLabel && <p className="mt-2 text-xs text-muted-foreground">{typingLabel}</p>}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Megaphone className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Select a conversation or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
