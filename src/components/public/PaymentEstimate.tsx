"use client";

import { usePublicSite } from "./PublicSiteContent";
import { useState } from "react";

export default function PaymentEstimate() {
  const { locale } = usePublicSite();
  const en = locale === "en";
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("20");
  const [years, setYears] = useState("5");
  const [fees, setFees] = useState("0");
  const [period, setPeriod] = useState("12");
  const valid = Number(price) > 0 && deposit !== "" && +deposit >= 0 && +deposit <= 100 &&
    +years > 0 && Number.isInteger(+years) && +years <= 50 && fees !== "" && +fees >= 0;
  const installment = (+price * (1 - +deposit / 100) + +fees) / (+years * +period);
  const currency = new Intl.NumberFormat(en ? "en-EG" : "ar-EG", { maximumFractionDigits: 0 });
  return <section className="darak-estimate portal-container" aria-labelledby="estimate-heading">
    <div><h2 id="estimate-heading">{en ? "Estimate your installments" : "احسب القسط المناسب لك"}</h2><p>{en ? "Equal interest-free installments with fees spread over the term." : "تقدير بأقساط متساوية، بدون فوائد، مع توزيع الرسوم على الأقساط."}</p></div>
    <div className="estimate-fields">
      <label>{en ? "Property price (EGP)" : "سعر الوحدة بالجنيه"}<input type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} /></label>
      <label>{en ? "Deposit (%)" : "المقدم ٪"}<input type="number" min="0" max="100" value={deposit} onChange={e => setDeposit(e.target.value)} /></label>
      <label>{en ? "Term (years)" : "المدة بالسنوات"}<input type="number" min="1" max="50" value={years} onChange={e => setYears(e.target.value)} /></label>
      <label>{en ? "Fees (EGP)" : "الرسوم بالجنيه"}<input type="number" min="0" value={fees} onChange={e => setFees(e.target.value)} /></label>
      <label>{en ? "Frequency" : "دورية السداد"}<select value={period} onChange={e => setPeriod(e.target.value)}><option value="12">{en ? "Monthly" : "شهري"}</option><option value="4">{en ? "Quarterly" : "ربع سنوي"}</option></select></label>
    </div>
    <output aria-live="polite">{valid ? en ? `Deposit EGP ${currency.format(+price * +deposit / 100)} · Installment EGP ${currency.format(installment)}` : `المقدم ${currency.format(+price * +deposit / 100)} ج.م · القسط ${currency.format(installment)} ج.م` : en ? "Enter a valid price and payment terms." : "أدخل السعر وبيانات السداد لحساب القسط."}</output>
  </section>;
}
