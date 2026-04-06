import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStreamConfig, streamFeedRequest } from "@/lib/stream/server";
import crypto from "crypto";

interface StreamActivity {
  id: string;
  actor: string;
  verb: string;
  object: string;
  time: string;
  message?: string;
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { apiKey, apiSecret, feedGroup, feedId } = getStreamConfig();

    const data = await streamFeedRequest<{ results: StreamActivity[] }>(
      `/feed/${feedGroup}/${feedId}/?limit=25`,
      {
        method: "GET",
        apiKey,
        apiSecret,
      }
    );

    return NextResponse.json({ activities: data.results || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Stream feed";
    console.error("Stream feed GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message } = (await request.json()) as { message?: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const { apiKey, apiSecret, feedGroup, feedId } = getStreamConfig();

    const payload = {
      actor: `SU:${userId}`,
      verb: "post",
      object: `message:${crypto.randomUUID()}`,
      message: message.trim(),
    };

    const data = await streamFeedRequest<{ activity: StreamActivity }>(`/feed/${feedGroup}/${feedId}/`, {
      method: "POST",
      body: JSON.stringify(payload),
      apiKey,
      apiSecret,
    });

    return NextResponse.json({ activity: data.activity }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to post to Stream feed";
    console.error("Stream feed POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
