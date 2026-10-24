import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const visitorKey = "cinora.visitor";

function visitorId(): string {
  try {
    const existing = localStorage.getItem(visitorKey);
    if (existing && /^[0-9a-f-]{16,40}$/i.test(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(visitorKey, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function Presence() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const id = visitorId();
    let stopped = false;

    const send = () => {
      if (stopped || document.visibilityState === "hidden") return;
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, path: pathname }),
        keepalive: true,
      }).catch(() => undefined);
    };

    send();
    const timer = window.setInterval(send, 20_000);
    document.addEventListener("visibilitychange", send);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", send);
    };
  }, [pathname]);

  return null;
}
