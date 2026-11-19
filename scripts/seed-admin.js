const { Pool, neonConfig } = require("@neondatabase/serverless");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const ws = require("ws");
require("dotenv").config();

if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: DATABASE_URL is not defined in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2] || "admin@dark-crm.com";
  const password = process.argv[3] || "DarkAdmin2026!Secure";
  const name = process.argv[4] || "المدير العام";

  console.log(`Setting up General Manager account: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: "GENERAL_MANAGER",
        name,
      },
    });
    console.log(`✅ Success! Updated password and role for existing admin: ${updated.email}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "GENERAL_MANAGER",
      },
    });
    console.log(`✅ Success! Created new General Manager: ${created.email}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error setting up admin:", err);
  process.exit(1);
});
