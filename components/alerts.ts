function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushSave = "push" | "local" | "unauthorized" | "unsupported" | "failed" | "no-push";
export type PushLink = PushSave | "denied" | "default";

export function askNotification(): Promise<NotificationPermission> | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return Notification.requestPermission();
}

export async function subscribePush(): Promise<PushSave> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  try {
    const response = await fetch("/api/push/public", { cache: "no-store" });
    const data = (await response.json()) as { publicKey: string | null };
    if (!data.publicKey) return "local";
    await navigator.serviceWorker.register("/sw.js");
    const ready = await navigator.serviceWorker.ready;
    const existing = await ready.pushManager.getSubscription();
    const sub =
      existing ??
      (await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      }));
    const saved = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
    if (saved.status === 401) return "unauthorized";
    if (!saved.ok) return "failed";
    return "push";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/push service not available/i.test(message)) return "no-push";
    return "failed";
  }
}

export async function allowPhonePush(): Promise<PushLink> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "default";
  return subscribePush();
}
