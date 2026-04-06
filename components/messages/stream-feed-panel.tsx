"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface StreamActivity {
  id: string;
  actor: string;
  message?: string;
  time: string;
}

export function StreamFeedPanel() {
  const { userId } = useAuth();
  const [activities, setActivities] = useState<StreamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stream/feed", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch Stream feed");
      }

      setActivities(data.activities || []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to fetch Stream feed";
      toast.error(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchActivities();
  }, [fetchActivities, userId]);

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/stream/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");

      setMessage("");
      await fetchActivities();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to send message";
      toast.error(text);
    } finally {
      setSending(false);
    }
  };

  const list = useMemo(() => activities.filter((activity) => activity.message?.trim()), [activities]);

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Sign in to view the Stream messages feed.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Community Messages Feed</h2>
        <p className="text-sm text-muted-foreground">Powered by Stream</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {loading &&
            [1, 2, 3].map((item) => (
              <div className="rounded-lg border p-3" key={item}>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-3 h-4 w-full" />
              </div>
            ))}

          {!loading && list.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No messages yet. Be the first to post.
            </div>
          )}

          {!loading &&
            list.map((activity) => (
              <div className="rounded-lg border p-3" key={activity.id}>
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{activity.actor?.slice(-2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{activity.actor}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(activity.time), { addSuffix: true })}</span>
                </div>
                <p className="text-sm leading-6">{activity.message}</p>
              </div>
            ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share an update with the community..."
            rows={2}
            className="resize-none"
          />
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            <Send className="mr-2 h-4 w-4" />
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
