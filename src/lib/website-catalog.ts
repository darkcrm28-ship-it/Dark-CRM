import type { PublicListingDto } from "./public-listings";
import type { WebsiteDatabase } from "./website-db";
import { matchPublicArea } from "./public-areas";

type Value = string | number;
type ListingRow = { public_json: string };
export function readListing(row: ListingRow): PublicListingDto { return JSON.parse(row.public_json); }

export function websiteFilters(params: URLSearchParams) {
  // Version zero is a staging copy. Only CRM-confirmed publications can be served.
  const clauses: string[] = ["source_version > 0"];
  const values: Value[] = [];
  const add = (clause: string, ...args: Value[]) => { clauses.push(clause); values.push(...args); };
  const purpose = params.get("purpose");
  if (purpose === "SALE" || purpose === "RENT") {
    add("purpose = ?", purpose);
    const budget = Number(params.get("budget"));
    if (budget > 0 && Number.isFinite(budget)) add("public_price > 0 AND public_price <= ?", budget);
  }
  const q = params.get("q")?.trim().slice(0,120);
  if (q) {
    const area = matchPublicArea(q);
    const terms = area ? [...new Set([q,area.ar,area.en,...area.aliases])] : [q];
    const fields = ["zone", "json_extract(public_json,'$.title')", "json_extract(public_json,'$.projectName')"];
    const parts = terms.flatMap(term => fields.map(field => {
      values.push(term);
      return "instr(lower("+field+"),lower(?)) > 0";
    }));
    clauses.push("("+parts.join(" OR ")+")");
  }
  const type = params.get("type")?.slice(0,60);
  if (type) add("instr(lower(unit_type),lower(?)) > 0", type);
  const zone = params.get("zone")?.slice(0,120);
  if (zone) add("zone = ?",zone);
  const rooms = params.get("rooms") || "";
  if (/^[1-5]$/.test(rooms)) add("rooms = ?", Number(rooms));
  if (rooms === "5+") add("rooms >= 5");
  const size = Number(params.get("minSize"));
  if (size > 0 && Number.isFinite(size)) add("area >= ?",size);
  const finishing = params.get("finishing")?.trim().slice(0,60);
  if (finishing) add("json_extract(public_json,'$.finishing') = ? COLLATE NOCASE",finishing);
  const month = params.get("deliveryMonth") || "";
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) add("json_extract(public_json,'$.deliveryMonth') = ?",month);
  return {clause:clauses.length ? clauses.join(" AND ") : "1", values};
}

export async function websiteCatalog(db: WebsiteDatabase, params: URLSearchParams, page: number, pageSize: number) {
  const {clause,values} = websiteFilters(params);
  const sort = params.get("sort");
  const byPrice = ["SALE","RENT"].includes(params.get("purpose") || "") && (sort === "asc" || sort === "desc");
  const order = (byPrice ? "public_price IS NULL, public_price "+sort+", " : "")+"published_at DESC, crm_id DESC";
  const rows = db.prepare("SELECT public_json FROM public_listings WHERE "+clause+" ORDER BY "+order+" LIMIT ? OFFSET ?").bind(...values,pageSize,(page-1)*pageSize);
  const count = db.prepare("SELECT COUNT(*) AS total FROM public_listings WHERE "+clause).bind(...values);
  const [items,counts] = await db.batch([rows,count]) as [{results:ListingRow[]},{results:{total:number}[]}];
  return {properties:items.results.map(readListing),total:counts.results[0].total,page,pageSize};
}
