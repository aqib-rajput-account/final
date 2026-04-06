import { Suspense } from "react";
import { Metadata } from "next";
import { Header } from "@/components/layout";
import { MessagesView } from "@/components/messages/messages-view";
import { StreamFeedPanel } from "@/components/messages/stream-feed-panel";
import { hasStreamFeedConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Messages | MosqueConnect",
  description: "Private messaging with community members",
};

export default function MessagesPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Header />
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1600px] mx-auto flex flex-col px-0 md:px-4 lg:px-8">
          <div className="flex-1 flex flex-col py-0 md:py-6">
            <h1 className="sr-only">Messages</h1>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground italic">Loading your conversations...</div>}>
              {hasStreamFeedConfig ? <StreamFeedPanel /> : <MessagesView />}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
