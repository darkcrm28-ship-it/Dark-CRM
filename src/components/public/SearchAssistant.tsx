"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { suggestIntent, type SearchIntent } from "@/lib/property-search-intent";

export default function SearchAssistant({en}:{en:boolean}) {
  const [description,setDescription]=useState("");
  const [intent,setIntent]=useState<SearchIntent|null>(null);
  const [busy,setBusy]=useState(false);
  const router=useRouter();
  return <details className="darak-search-assistant"><summary>{en?"Describe the home you want":"اوصف العقار اللي بتدور عليه"}</summary>
    <form onSubmit={async event=>{event.preventDefault();setBusy(true);try{const filters=await suggestIntent(description,en?"en":"ar");setIntent(filters);}finally{setBusy(false);}}}>
      <label>{en?"Your requirements":"مواصفات العقار"}<input required maxLength={300} value={description} disabled={busy} onChange={e=>{setDescription(e.target.value);setIntent(null);}} placeholder={en?"2 bed apartment for rent in New Cairo, 20k EGP":"شقة إيجار في التجمع، ٣ غرف، ٢٠ ألف جنيه"}/></label>
      <button disabled={busy}>{busy?"…":en?"Suggest filters":"اقتراح فلاتر"}</button>
    </form>
    {intent && <form onSubmit={event=>{event.preventDefault();const params=new URLSearchParams();Object.entries(intent).forEach(([key,value])=>{if(value)params.set(key,value);});router.push("/properties?"+params);}}>
      <label>{en?"Project or area":"المشروع أو المنطقة"}<input value={intent.q} onChange={e=>setIntent({...intent,q:e.target.value})}/></label>
      <label>{en?"Purpose":"الغرض"}<select required={!!intent.budget} value={intent.purpose} onChange={e=>setIntent({...intent,purpose:e.target.value})}><option value="">{en?"Choose":"اختر"}</option><option value="SALE">{en?"Buy":"شراء"}</option><option value="RENT">{en?"Rent":"إيجار"}</option></select></label>
      <label>{en?"Property type":"نوع الوحدة"}<input value={intent.type} onChange={e=>setIntent({...intent,type:e.target.value})}/></label>
      <label>{en?"Bedrooms":"الغرف"}<input type="number" min="1" max="5" value={intent.rooms} onChange={e=>setIntent({...intent,rooms:e.target.value})}/></label>
      <label>{en?"Maximum budget (EGP)":"أقصى ميزانية بالجنيه"}<input type="number" min="1" max="1000000000000" value={intent.budget} onChange={e=>setIntent({...intent,budget:e.target.value})}/></label>
      <button>{en?"Show matching properties":"عرض الوحدات المطابقة"}</button>
    </form>}
  </details>;
}
