"use client";

import { useEffect } from "react";

export default function PopupDone() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "meta-connected" }, window.location.origin);
      window.close();
    } else {
      window.location.replace("/connections");
    }
  }, []);

  return (
    <div className="p-8 text-sm text-zinc-500">连接已完成，正在关闭窗口...</div>
  );
}
