import type { Collection } from "../lib/types";

// Bound both the connection and response body so the entrance never depends on
// a remote service finishing its request.
export async function loadCollection(
  backend: string,
  signal: AbortSignal,
  timeoutMs = 8000,
): Promise<Collection> {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timer = setTimeout(() => controller.abort(new Error("Collection timed out")), timeoutMs);
  try {
    const response = await fetch(`${backend}/api/public`, {
      credentials: "omit", signal: controller.signal,
    });
    if (!response.ok) throw new Error("Gallery unavailable");
    const result: Collection = await response.json();
    if (!result.settings ||
        ![result.settings.name, result.settings.tagline, result.settings.bio, result.settings.email]
          .every((value) => typeof value === "string") ||
        typeof result.settings.showSamples !== "boolean" ||
        !Array.isArray(result.albums) || !Array.isArray(result.photos)) {
      throw new Error("Invalid gallery response");
    }
    return {
      ...result, isOwner: false, signedIn: false,
      photos: result.photos.map((photo) => ({
        ...photo,
        url: new URL(photo.url, `${backend}/`).href,
        thumb: new URL(photo.thumb, `${backend}/`).href,
      })),
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
