import { execSync } from "node:child_process";

if (process.env.NEXT_PRIVATE_STANDALONE) {
  // Inner build called by OpenNext
  execSync("npx next build", { stdio: "inherit", env: process.env });
} else {
  // Outer build called by Cloudflare CI / user
  execSync("npx prisma generate", { stdio: "inherit", env: process.env });
  execSync("npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion", {
    stdio: "inherit",
    env: process.env,
  });
  execSync("node scripts/sanitize-cloudflare-build.mjs", { stdio: "inherit" });
}
