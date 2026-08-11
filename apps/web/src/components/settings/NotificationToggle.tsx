"use client";

import { useEffect, useState } from "react";
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push";

export function NotificationToggle({ accessToken }: { accessToken: string | null }) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    getExistingSubscription()
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function handleToggle() {
    if (!accessToken) return;
    setError(null);
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush(accessToken);
        setSubscribed(false);
      } else {
        await subscribeToPush(accessToken);
        setSubscribed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <section className="mb-8 rounded-2xl border border-stardust-600/40 bg-stardust-900/60 p-6">
      <h2 className="mb-1 text-sm font-medium text-stardust-200">Notifications</h2>
      <p className="mb-3 text-sm text-stardust-400">Get notified about new matches and messages on this device.</p>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        className="rounded-lg border border-stardust-600/50 px-4 py-2 text-sm font-medium text-stardust-100 transition hover:bg-stardust-800 disabled:opacity-50"
      >
        {busy ? "..." : subscribed ? "Disable notifications" : "Enable notifications"}
      </button>
    </section>
  );
}
