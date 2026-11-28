"use client";
import { useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-utils";

export default function DeviceAlerts({en}:{en:boolean}) {
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function change(enabled:boolean) {
    setBusy(true);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error(en?"Notifications are unavailable on this browser.":"هذا المتصفح لا يدعم إشعارات الجهاز.");
      if (enabled && await Notification.requestPermission()!=="granted") throw new Error(en?"Notification permission is required.":"يتطلب التفعيل السماح بالإشعارات.");
      const registration=await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if (enabled && !subscription) {
        const response=await fetch("/api/public/push");
        if(!response.ok) throw new Error(en?"Notifications are unavailable.":"خدمة الإشعارات غير متاحة.");
        subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array((await response.json()).publicKey)});
      }
      if(subscription) {
        const response=await fetch("/api/public/push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:enabled?"on":"off",subscription:subscription.toJSON()})});
        if(!response.ok) throw new Error(en?"Could not update this device.":"تعذّر تحديث اشتراك الجهاز.");
        if(!enabled) await subscription.unsubscribe();
      }
      setMessage(enabled?(en?"Device alerts enabled.":"تم تفعيل تنبيهات الجهاز."):(en?"Device alerts disabled.":"تم إيقاف تنبيهات الجهاز."));
    } catch(error) { setMessage(error instanceof Error?error.message:""); } finally {setBusy(false);}
  }
  return <section><h2>{en?"Notifications on this device":"إشعارات البحث على هذا الجهاز"}</h2>
    <button disabled={busy} onClick={()=>change(true)}>{en?"Enable":"تفعيل"}</button> · <button disabled={busy} onClick={()=>change(false)}>{en?"Disable":"إيقاف"}</button><p role="status">{message}</p></section>;
}
