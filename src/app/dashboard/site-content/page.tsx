import { requirePageRole, ROLE } from "@/lib/auth";
import { readPublicSiteContent, siteCopyGroups } from "@/lib/public-site";
import SiteContentEditor from "./SiteContentEditor";

export const dynamic = "force-dynamic";

export default async function SiteContentPage() {
  await requirePageRole([ROLE.GENERAL_MANAGER]);
  const content = await readPublicSiteContent();
  return <SiteContentEditor initialContent={content} groups={siteCopyGroups} />;
}
