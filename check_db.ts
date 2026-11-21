import "./scripts/load-test-env.js";
import { prisma } from "./src/lib/db";

async function main() {
  const groupStatus = await prisma.customer.groupBy({
    by: ["status"],
    _count: { id: true }
  });
  const groupType = await prisma.customer.groupBy({
    by: ["type"],
    _count: { id: true }
  });
  console.log("Types:", groupType);
  console.log("Statuses:", groupStatus);
}

main().catch(console.error);
