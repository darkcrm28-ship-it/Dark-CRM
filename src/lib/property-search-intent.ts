import { publicAreas } from "./public-areas";

export type SearchIntent = { q: string; purpose: string; rooms: string; budget: string; type: string };
const types = [
  ["شقة", /شقه|apartment|flat/i], ["فيلا", /فيلا|villa/i], ["دوبلكس", /دوبلكس|duplex/i],
  ["تاون هاوس", /تاون هاوس|townhouse/i], ["توين هاوس", /توين هاوس|twin house/i],
  ["مكتب إداري", /مكتب|office/i], ["محل تجاري", /محل|retail|shop/i],
] as const;

export function readIntent(description: string): SearchIntent {
  const text = description.toLowerCase().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
    .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[,٬]/g,"").replace(/٫/g,".");
  const area = publicAreas.find(a => [a.ar,a.en,...a.aliases].some(alias => text.includes(alias.toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه"))));
  const purpose = /ايجار|للايجار|rent|lease/.test(text) ? "RENT" : /شراء|اشتري|للبيع|buy|sale/.test(text) ? "SALE" : "";
  const rooms = text.match(/([1-5])\s*[- ]?\s*(?:غرف|اوض|bed)/)?.[1] || "";
  const money = text.match(/(\d+(?:\.\d+)?)\s*(مليون|million|الف|thousand|egp|جنيه|ج\.م|[km]\b)/i);
  const amount = money ? Number(money[1]) * (/million|مليون|^m$/i.test(money[2]) ? 1000000 : /thousand|الف|^k$/i.test(money[2]) ? 1000 : 1) : 0;
  return { q:area?.ar || "", purpose, rooms, budget:amount > 0 && amount <= 1e12 ? String(amount) : "", type:types.find(([,pattern])=>pattern.test(text))?.[0] || "" };
}

type LanguageOptions = { expectedInputs: {type:"text";languages:string[]}[]; expectedOutputs:{type:"text";languages:string[]}[] };
type ModelSession = {prompt:(input:string,options:{signal:AbortSignal})=>Promise<string>;destroy:()=>void};
type LocalModel = {availability:(options:LanguageOptions)=>Promise<string>;create:(options:LanguageOptions & {signal:AbortSignal})=>Promise<ModelSession>};

export async function suggestIntent(description:string, language:string):Promise<SearchIntent> {
  const basic = readIntent(description);
  const model = (globalThis as typeof globalThis & {LanguageModel?:LocalModel}).LanguageModel;
  if (!model) return basic;
  const options:LanguageOptions = {expectedInputs:[{type:"text",languages:[language]}],expectedOutputs:[{type:"text",languages:["en"]}]};
  let session:ModelSession|undefined;
  try {
    if (await model.availability(options) !== "available") return basic;
    const signal = AbortSignal.timeout(8000);
    session = await model.create({...options,signal});
    const answer = await session.prompt('Extract explicitly stated filters from this housing request. Return only JSON with q (literal project or location), purpose (SALE or RENT), rooms (1 to 5), budget (maximum EGP), all optional. Request: '+JSON.stringify(description),{signal});
    const item = JSON.parse(answer);
    if (!item || typeof item !== "object") return basic;
    return {...basic,
      q:basic.q || (typeof item.q==="string" && description.toLowerCase().includes(item.q.toLowerCase()) ? item.q.slice(0,120) : ""),
      purpose:basic.purpose || (["SALE","RENT"].includes(item.purpose) ? item.purpose : ""),
      rooms:basic.rooms || (/^[1-5]$/.test(String(item.rooms)) ? String(item.rooms) : ""),
      budget:basic.budget || (Number.isFinite(item.budget) && item.budget>0 && item.budget<=1e12 ? String(item.budget) : ""),
    };
  } catch { return basic; } finally { session?.destroy(); }
}
