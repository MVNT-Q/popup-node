type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallWindow = Window & { __nodeInstall?: InstallEvent };

let deferred: InstallEvent | null = null;
let listening = false;

function parked() {
  if (typeof window === "undefined") return null;
  return (window as InstallWindow).__nodeInstall ?? null;
}

export function listenInstall() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const waiting = parked();
  if (waiting) {
    deferred = waiting;
    (window as InstallWindow).__nodeInstall = undefined;
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    (window as InstallWindow).__nodeInstall = undefined;
    window.dispatchEvent(new Event("node-install-ready"));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    window.dispatchEvent(new Event("node-installed"));
  });
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js");
  }
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return ios || window.matchMedia("(display-mode: standalone)").matches;
}

export function isIos() {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "ios" | "manual"> {
  listenInstall();
  if (isStandalone()) return "accepted";
  const event = deferred || parked();
  if (event) {
    deferred = null;
    (window as InstallWindow).__nodeInstall = undefined;
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome === "accepted" ? "accepted" : "dismissed";
  }
  if (isIos()) return "ios";
  return "manual";
}
