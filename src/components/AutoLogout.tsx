"use client";

import { useEffect, useRef, useCallback } from "react";

export default function AutoLogout() {
  const lastActivityRef = useRef<number>(Date.now());
  const IDLE_TIME = 30 * 60 * 1000; // 30 minutes

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      window.location.href = "/login";
    });
  }, []);

  useEffect(() => {
    const checkIdle = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > IDLE_TIME) {
        logout();
      }
    };

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const interval = setInterval(checkIdle, 30000); // Check every 30 seconds
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    
    events.forEach((event) => {
      document.addEventListener(event, updateActivity);
    });

    return () => {
      clearInterval(interval);
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [logout, IDLE_TIME]);

  return null;
}
