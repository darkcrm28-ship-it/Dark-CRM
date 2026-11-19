const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userFields = Object.keys(prisma.user.fields || {});
  console.log('User Fields:', userFields);
  if (userFields.includes('birthDate')) {
    console.log('✅ birthDate exists in Prisma Client');
  } else {
    console.log('❌ birthDate MISSING in Prisma Client');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
