"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

export default function AlertsPage() {
  const [linked, setLinked] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/telegram/link", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { linked?: boolean; configured?: boolean }) => {
        setLinked(Boolean(data.linked));
        setConfigured(Boolean(data.configured));
      })
      .catch(() => undefined);
  }, []);

  async function openTelegram() {
    setNote("");
    const response = await fetch("/api/telegram/link", { method: "POST" });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      setNote(data.error || "Could not create a connect link.");
      return;
    }
    window.location.href = data.url;
  }

  async function unlink() {
    setNote("");
    const response = await fetch("/api/telegram/link", { method: "DELETE" });
    if (!response.ok) {
      setNote("Could not disconnect Telegram.");
      return;
    }
    setLinked(false);
  }

  return (
    <main className="pad cyp-inbox">
      <BackButton fallback="/my-node" />
      <h1 className="lede">Alerts</h1>

      {linked ? (
        <p className="hint">Telegram is on. Chat alerts send your node number and a link.</p>
      ) : (
        <p className="hint">
          Check chats via the site message icon. Turn on Telegram alerts from this page.
        </p>
      )}
      <p className="hint">
        Other participants never see your Telegram. Chats stay on this site.
      </p>

      {configured && !linked ? (
        <button className="btn-ghost" type="button" onClick={() => void openTelegram()} style={{ marginTop: 10 }}>
          Get Telegram alerts
        </button>
      ) : null}
      {linked ? (
        <button className="text-btn" type="button" onClick={() => void unlink()}>
          Disconnect Telegram
        </button>
      ) : null}
      {!configured ? <p className="hint">Telegram bot is not configured yet.</p> : null}
      {note ? <p className="hint">{note}</p> : null}
    </main>
  );
}
