/**
 * Qobuz proxy client -- talks to qdl-api style instances.
 * Two-step lookup: ISRC search -> signed CDN URL.
 * Ported from Monochrome's api.js (getQobuzStreamUrl).
 */

import { getInstances } from "./instances";
import type { StreamQuality } from "@/types/music";

const INSTANCE_TIMEOUT_MS = 8000;

const QUALITY_MAP: Record<StreamQuality, string> = {
  HI_RES_LOSSLESS: "27",
  LOSSLESS: "6",
  HIGH: "5",
  LOW: "5",
};

interface QobuzSearchTrack {
  id: number | string;
  isrc?: string;
}

interface QobuzSearchResponse {
  success?: boolean;
  data?: {
    tracks?: { items?: QobuzSearchTrack[] };
  };
}

interface QobuzStreamResponse {
  success?: boolean;
  data?: { url?: string };
}

async function fetchWithTimeout(
  url: string,
  signal: AbortSignal | undefined,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function getQobuzStreamUrl(
  isrc: string,
  quality: StreamQuality = "LOSSLESS",
  signal?: AbortSignal
): Promise<string | null> {
  if (!isrc) return null;

  const instances = getInstances("qobuz");
  if (instances.length === 0) return null;

  const qobuzQuality = QUALITY_MAP[quality] ?? "6";

  for (const rawUrl of instances) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const baseUrl = rawUrl.replace(/\/+$/, "");

    try {
      const searchRes = await fetchWithTimeout(
        `${baseUrl}/api/get-music?q=${encodeURIComponent(isrc)}&offset=0`,
        signal,
        INSTANCE_TIMEOUT_MS
      );
      if (!searchRes.ok) continue;

      const searchJson: QobuzSearchResponse = await searchRes.json();
      const items = searchJson.data?.tracks?.items ?? [];
      const match =
        items.find((t) => t.isrc?.toLowerCase() === isrc.toLowerCase()) ??
        items[0];
      if (!match?.id) continue;

      const streamRes = await fetchWithTimeout(
        `${baseUrl}/api/download-music?track_id=${match.id}&quality=${qobuzQuality}`,
        signal,
        INSTANCE_TIMEOUT_MS
      );
      if (!streamRes.ok) continue;

      const streamJson: QobuzStreamResponse = await streamRes.json();
      if (streamJson.success && streamJson.data?.url) {
        return streamJson.data.url;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        signal?.aborted
      ) {
        throw error;
      }
      console.warn(`[Qobuz] Instance ${baseUrl} failed for ISRC ${isrc}:`, error);
      continue;
    }
  }

  return null;
}
