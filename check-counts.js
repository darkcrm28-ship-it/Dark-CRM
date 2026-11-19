const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const customers = await prisma.customer.count();
  const interactions = await prisma.interaction.count();
  const deals = await prisma.deal.count();
  const properties = await prisma.property.count();
  const projects = await prisma.project.count();

  console.log({
    users,
    customers,
    interactions,
    deals,
    properties,
    projects
  });

  await prisma.$disconnect();
}

main().catch(console.error);
