"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function ConnectButton() {
  const router = useRouter();
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "meta-connected") {
        popupRef.current?.close();
        router.refresh();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  function open() {
    const w = window.open(
      "/api/meta/connect",
      "meta-connect",
      "width=600,height=720,popup=yes",
    );
    if (!w) {
      window.location.href = "/api/meta/connect";
      return;
    }
    popupRef.current = w;
  }

  return (
    <button
      onClick={open}
      className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
    >
      连接 Meta 账号
    </button>
  );
}
