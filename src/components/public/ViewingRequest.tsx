"use client";

import { useRef, useState, type FormEvent } from "react";
import { usePublicSite } from "./PublicSiteContent";

export default function ViewingRequest({ id }: { id: string }) {
  const en = usePublicSite().locale === "en";
  const token = useRef("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || sent) return;
    const data = new FormData(event.currentTarget);
    token.current ||= crypto.randomUUID();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/public/inquiry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryType: "VIEWING", propertyId: id, requestKey: token.current,
          name: data.get("name"), phone: data.get("phone"), notes: data.get("time") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : (en ? "Could not send request" : "تعذّر إرسال الطلب"));
    } finally { setPending(false); }
  }
  return <section id="viewing" className="darak-viewing">
    <h2>{en ? "Request a viewing" : "اطلب معاينة"}</h2>
    {sent ? <p role="status">{en ? "Your request is with the DARAK team." : "تم تسجيل طلبك لدى فريق دارك."}</p> :
      <form onSubmit={submit}>
        <label>{en ? "Full name" : "الاسم بالكامل"}<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
        <label>{en ? "Phone" : "رقم الهاتف"}<input name="phone" type="tel" autoComplete="tel" required /></label>
        <label>{en ? "Preferred time (optional)" : "الوقت المفضل (اختياري)"}<input name="time" maxLength={120} /></label>
        <button disabled={pending}>{pending ? "…" : en ? "Send request" : "إرسال الطلب"}</button>
        {error && <p role="alert">{error}</p>}
      </form>}
  </section>;
}
