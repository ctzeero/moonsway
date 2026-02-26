/**
 * fetchWithRetry -- multi-instance failover for TIDAL API proxy calls.
 *
 * Picks a random starting instance, round-robins on failure.
 * Handles 429 (rate limit), 401+11002 (auth), 5xx, and network errors.
 */

import {
  getInstances,
  randomInstanceIndex,
  type InstanceType,
} from "./instances";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchOptions {
  type?: InstanceType;
  signal?: AbortSignal;
}

// Timeout per individual instance attempt. If an instance hangs (e.g. CORS
// pre-flight stall or dead server), we give up on it quickly and try the next.
const INSTANCE_TIMEOUT_MS = 5000;

export async function fetchWithRetry(
  relativePath: string,
  options: FetchOptions = {}
): Promise<Response> {
  const type = options.type ?? "api";
  const instances = getInstances(type);

  if (instances.length === 0) {
    throw new Error(`No API instances configured for type: ${type}`);
  }

  const maxAttempts = instances.length * 2;
  let lastError: Error | null = null;
  let instanceIndex = randomInstanceIndex(instances);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Bail immediately if the caller cancelled
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const baseUrl = instances[instanceIndex % instances.length];
    const url = baseUrl.endsWith("/")
      ? `${baseUrl}${relativePath.substring(1)}`
      : `${baseUrl}${relativePath}`;

    // Combine caller's signal with a per-instance timeout signal
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort(),
      INSTANCE_TIMEOUT_MS
    );
    const signal = options.signal
      ? anySignal([options.signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await fetch(url, { signal });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.warn(`[API] Rate limit on ${baseUrl}, trying next...`);
        instanceIndex++;
        await delay(500);
        continue;
      }

      if (response.ok) {
        return response;
      }

      if (response.status === 401) {
        try {
          const errorData = await response.clone().json();
          if (errorData?.subStatus === 11002) {
            console.warn(`[API] Auth failed on ${baseUrl}, trying next...`);
            instanceIndex++;
            continue;
          }
        } catch {
          // JSON parse failed, treat as regular error
        }
      }

      if (response.status >= 500) {
        console.warn(
          `[API] Server error ${response.status} on ${baseUrl}, trying next...`
        );
        instanceIndex++;
        continue;
      }

      lastError = new Error(`Request failed with status ${response.status}`);
      instanceIndex++;
    } catch (error) {
      clearTimeout(timeoutId);
      // Re-throw only if the caller's own signal was aborted (user cancel)
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        options.signal?.aborted
      ) {
        throw error;
      }
      // Otherwise it was our timeout — log and move on to the next instance
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[API] ${timeoutController.signal.aborted ? "Timeout" : "Network error"} on ${baseUrl}: ${lastError.message}, trying next...`
      );
      instanceIndex++;
      await delay(200);
    }
  }

  throw lastError ?? new Error(`All instances failed for: ${relativePath}`);
}

// Aborts as soon as any of the provided signals fires.
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}
