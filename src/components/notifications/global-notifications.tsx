"use client";

import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { registerForPushNotifications } from "@/lib/fcm";

type PushStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

export function GlobalNotifications() {
  const { user } = useAuth();
  const { couple, loading } = useCoupleSpace();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
  const [pushError, setPushError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (typeof Notification === "undefined") {
      setPushStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return;
    }
    if (Notification.permission !== "granted") {
      setPushStatus("idle");
      return;
    }

    let active = true;
    setPushStatus("loading");
    setPushError("");
    registerForPushNotifications(user.uid).then((status) => {
      if (active) setPushStatus(status);
    }).catch((caught) => {
      if (!active) return;
      setPushStatus("idle");
      setPushError(caught instanceof Error ? caught.message : "Token thông báo đã mất. Hãy đăng ký lại.");
    });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    function restoreNotificationButton() {
      if (!document.querySelector(".locket-chat-composer:focus-within")) {
        document.body.classList.remove("locket-keyboard-open");
      }
    }
    window.addEventListener("pageshow", restoreNotificationButton);
    window.addEventListener("focus", restoreNotificationButton);
    document.addEventListener("visibilitychange", restoreNotificationButton);
    return () => {
      window.removeEventListener("pageshow", restoreNotificationButton);
      window.removeEventListener("focus", restoreNotificationButton);
      document.removeEventListener("visibilitychange", restoreNotificationButton);
    };
  }, []);

  async function enablePush() {
    if (!user) return;
    setPushStatus("loading");
    setPushError("");
    try {
      setPushStatus(await registerForPushNotifications(user.uid));
    } catch (caught) {
      setPushStatus("idle");
      setPushError(caught instanceof Error ? caught.message : "Chưa thể bật thông báo. Hãy thử lại.");
    }
  }

  if (!user || !couple || loading) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="app-frame flex justify-end">
          <button
            className="global-notifications-trigger pointer-events-auto relative grid size-10 place-items-center rounded-full border border-white/80 bg-white/80 text-[#c9687a] shadow-soft backdrop-blur-xl transition active:scale-95 sm:size-11"
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Mở thông báo${unread ? `, ${unread} chưa đọc` : ""}`}
            title="Xem thông báo"
          >
            {pushStatus === "granted" ? <BellRing className="size-5" /> : <Bell className="size-5" />}
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#e15e75] px-1 text-[10px] font-extrabold text-white ring-2 ring-[#fff8f0]">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </div>
      </div>
      <NotificationCenter open={open} onClose={() => setOpen(false)} user={user} coupleId={couple.id} pushStatus={pushStatus} pushError={pushError} onEnablePush={enablePush} onUnreadChange={setUnread} />
    </>
  );
}

