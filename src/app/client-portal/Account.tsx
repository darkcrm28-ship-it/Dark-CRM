"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicSite } from "@/components/public/PublicSiteContent";

type Member = { email:string; savedSearches:string[] };
export default function Account({member,requests,search,favorites,alerts,alertsEnabled}:{favorites:{id:string;title:string}[];alerts:{id:string;title:string}[];alertsEnabled:boolean;member:Member|null;requests:{code:string|null;date:string}[];search:string}) {
  const en = usePublicSite().locale === "en";
  const [register,setRegister] = useState(false);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const router = useRouter();
  const describe = (query:string) => Array.from(new URLSearchParams(query).values()).join(" · ");
  async function submit(action:string, fields:Record<string,string> = {}) {
    if (busy) return;
    setBusy(true);setNotice("");
    try {
      const response = await fetch("/api/public/portal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...fields})});
      if (!response.ok) {
        setNotice(response.status === 429 ? (en ? "Try again later." : "جرّب بعد قليل.") : (en ? "Could not complete the request. Check the details." : "تعذّر تنفيذ الطلب. راجع البيانات."));
        return;
      }
      setNotice(en ? "Done" : "تم بنجاح");router.refresh();
    } catch { setNotice(en ? "Check your connection." : "راجع اتصال الإنترنت."); }
    finally { setBusy(false); }
  }
  return <main className="portal-container darak-property"><h1>{en ? "My DARAK account" : "حسابي في دارك"}</h1>
    {member ? <><p>{member.email}</p><button disabled={busy} onClick={()=>submit("logout")}>{en ? "Sign out" : "خروج"}</button>
      <h2>{en ? "Saved searches" : "عمليات البحث المحفوظة"}</h2>
      {search && <button disabled={busy} onClick={()=>submit("save",{search})}>{en ? "Save this search" : "حفظ هذا البحث"} · {describe(search)}</button>}
      <ul>{member.savedSearches.map(q=><li key={q}><a href={"/properties?"+q}>{describe(q)}</a> <button disabled={busy} onClick={()=>submit("remove",{search:q})}>{en ? "Remove" : "إزالة"}</button></li>)}</ul>
      <h2>{en ? "Favorite properties" : "الوحدات المفضلة"}</h2>
      <ul>{favorites.map(p=><li key={p.id}><a href={"/properties/"+p.id}>{p.title}</a> <button disabled={busy} onClick={()=>submit("unfavorite",{propertyId:p.id})}>{en ? "Remove" : "إزالة"}</button></li>)}</ul>
      <h2>{en ? "Saved search updates" : "تنبيهات البحث داخل الحساب"}</h2>
      <button disabled={busy} onClick={()=>submit(alertsEnabled ? "alerts-off" : "alerts-on")}>{alertsEnabled ? (en ? "Turn off updates" : "إيقاف التنبيهات") : (en ? "Show new matches here" : "عرض الوحدات المطابقة الجديدة هنا")}</button>
      {alertsEnabled && <ul>{alerts.map(p=><li key={p.id}><a href={"/properties/"+p.id}>{p.title}</a></li>)}</ul>}
      {alerts.length > 0 && <button disabled={busy} onClick={()=>submit("alerts-read")}>{en ? "Mark as read" : "تحديد كمقروء"}</button>}
      <h2>{en ? "Submitted requests" : "الطلبات المسجّلة"}</h2>
      {requests.length ? <ul>{requests.map((r,i)=><li key={r.code ?? i}>{r.code} · {r.date}</li>)}</ul> : <p>{en ? "No requests yet." : "لا توجد طلبات حتى الآن."}</p>}
    </> : <section className="darak-viewing"><form onSubmit={e=>{
      e.preventDefault();const fields = new FormData(e.currentTarget);
      void submit(register ? "register" : "login",{email:String(fields.get("email")),password:String(fields.get("password"))});
    }}>
      <label>{en ? "Email" : "البريد الإلكتروني"}<input name="email" type="email" required autoComplete="email"/></label>
      <label>{en ? "Password (10 characters minimum)" : "كلمة المرور (١٠ أحرف على الأقل)"}<input name="password" type="password" required minLength={10} autoComplete={register ? "new-password" : "current-password"}/></label>
      <button disabled={busy}>{register ? (en ? "Create account" : "إنشاء حساب") : (en ? "Sign in" : "دخول")}</button></form>
      <button disabled={busy} onClick={()=>{setRegister(!register);setNotice("");}}>{register ? (en ? "Existing account" : "عندي حساب") : (en ? "New account" : "حساب جديد")}</button>
    </section>}<p role="status">{notice}</p>
  </main>;
}
