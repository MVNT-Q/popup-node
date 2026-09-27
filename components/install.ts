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
    // inbox 리마운트해도 쓰게 — window와 모듈 둘 다 유지
    deferred = waiting;
    (window as InstallWindow).__nodeInstall = waiting;
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    (window as InstallWindow).__nodeInstall = deferred;
    window.dispatchEvent(new Event("node-install-ready"));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    (window as InstallWindow).__nodeInstall = undefined;
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
  // 모듈 deferred가 비어도 beforeInteractive로 받아 둔 window.__nodeInstall 사용
  const event = deferred || parked();
  if (event) {
    await event.prompt();
    const choice = await event.userChoice;
    deferred = null;
    (window as InstallWindow).__nodeInstall = undefined;
    return choice.outcome === "accepted" ? "accepted" : "dismissed";
  }
  if (isIos()) return "ios";
  return "manual";
}
