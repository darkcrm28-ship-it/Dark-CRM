import { getPageSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomFieldsClient from "./CustomFieldsClient";

export default async function CustomFieldsPage() {
  const session = await getPageSession();
  if (session?.role !== "GENERAL_MANAGER") redirect("/dashboard");

  return <CustomFieldsClient />;
}
