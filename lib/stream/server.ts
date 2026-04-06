import crypto from "crypto";

const STREAM_API_BASE = "https://api.stream-io-api.com/api/v1.0";

export function getStreamConfig() {
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    throw new Error("Stream feed is not configured. Missing STREAM_API_KEY or STREAM_SECRET_KEY.");
  }

  return {
    apiKey,
    apiSecret,
    feedGroup: process.env.STREAM_FEED_GROUP || "timeline",
    feedId: process.env.STREAM_FEED_ID || "global",
  };
}

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createStreamServerToken(apiSecret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    server: true,
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function streamFeedRequest<T>(path: string, options: RequestInit & { apiKey: string; apiSecret: string }) {
  const { apiKey, apiSecret, ...requestOptions } = options;
  const token = createStreamServerToken(apiSecret);

  const url = `${STREAM_API_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      ...(requestOptions.headers || {}),
    },
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof json?.detail === "string" ? json.detail : "Stream API request failed";
    throw new Error(message);
  }

  return json as T;
}
