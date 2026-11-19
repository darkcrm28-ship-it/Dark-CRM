"use client";

import { useEffect, useState } from "react";
import CustomerDrawer from "./CustomerDrawer";

export default function SmartLogger() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const lastAction = localStorage.getItem("last_contact_action");
        const customerData = localStorage.getItem("last_contact_customer");
        
        if (lastAction && customerData) {
          const now = Date.now();
          const actionTime = parseInt(lastAction);
          
          // If returned within 5 minutes of clicking call/whatsapp
          if (now - actionTime < 5 * 60 * 1000) {
            setActiveCustomer(JSON.parse(customerData));
            setShowPrompt(true);
          }
          
          localStorage.removeItem("last_contact_action");
          localStorage.removeItem("last_contact_customer");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  if (!showPrompt) return null;

  return (
    <CustomerDrawer 
      customer={activeCustomer} 
      isOpen={showPrompt} 
      onClose={() => setShowPrompt(false)} 
    />
  );
}
