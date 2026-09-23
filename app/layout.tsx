import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource/ibm-plex-sans-kr/400.css";
import "@fontsource/ibm-plex-sans-kr/500.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { Header } from "@/components/Header";
import { InstallCard } from "@/components/InstallCard";
import { Notifier } from "@/components/Notifier";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NODE",
  description: "질문 세 개로 맞는 노드만 밝히는 팝업 웹",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "NODE", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Script id="node-install-boot" strategy="beforeInteractive">
          {`window.addEventListener("beforeinstallprompt",function(event){event.preventDefault();window.__nodeInstall=event;});if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js");}`}
        </Script>
        <div className="column">
          <Header />
          <InstallCard place="continue" />
          {children}
        </div>
        <Notifier />
      </body>
    </html>
  );
}
