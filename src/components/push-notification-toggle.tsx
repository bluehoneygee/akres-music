"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupported(ok);
    if (!ok) return;

    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      setEnabled(Boolean(subscription) && Notification.permission === "granted");
    })();
  }, []);

  async function enablePush() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permission not granted");
        return;
      }

      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyJson = (await keyRes.json()) as { data?: { publicKey?: string }; error?: string };
      if (!keyRes.ok || !keyJson.data?.publicKey) {
        throw new Error(keyJson.error ?? "Push key unavailable");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(keyJson.data.publicKey),
      });

      const saveRes = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!saveRes.ok) {
        throw new Error("Failed to save subscription");
      }

      setEnabled(true);
      toast.success("Push notification enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to enable push");
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (!subscription) {
        setEnabled(false);
        return;
      }

      await fetch("/api/push/subscription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setEnabled(false);
      toast.success("Push notification disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disable push");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      aria-label={enabled ? "Disable push notification" : "Enable push notification"}
      className={`group inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium transition ${
        enabled
          ? "border-emerald-300/70 bg-emerald-100/80 text-emerald-800"
          : "border-white/45 bg-white/55 text-zinc-700"
      } ${loading ? "cursor-not-allowed opacity-60" : "hover:bg-white/75"}`}
      disabled={loading}
      onClick={() => void (enabled ? disablePush() : enablePush())}
      type="button"
    >
      <Bell className="size-3.5" />
      <span>Push</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          enabled ? "bg-emerald-500" : "bg-zinc-300"
        }`}
      >
        <span
          className={`inline-block size-4 transform rounded-full bg-white shadow transition ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
