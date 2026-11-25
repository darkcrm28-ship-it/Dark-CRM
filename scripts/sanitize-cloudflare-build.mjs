import { lstatSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../.open-next/", import.meta.url));

// OpenNext compiles all Next dotenv modes into a module imported by the Worker.
// Bindings are the only source of runtime configuration for deployments.
const runtimeEnv = join(output, "cloudflare", "next-env.mjs");
if (!lstatSync(runtimeEnv).isFile()) throw new Error("Expected a generated OpenNext environment module.");
writeFileSync(runtimeEnv, [
  "export const production = {};",
  "export const development = {};",
  "export const test = {};",
  "",
].join("\n"));

// Some builds also carry copies in each standalone server function directory.
const functions = join(output, "server-functions");
const dotenvFile = /^\.env(?:\.(?:production|development|test))?(?:\.local)?$/;
for (const fn of readdirSync(functions, { withFileTypes: true })) {
  if (!fn.isDirectory()) continue;
  const directory = join(functions, fn.name);
  for (const file of readdirSync(directory, { withFileTypes: true })) {
    if (file.isFile() && dotenvFile.test(file.name)) unlinkSync(join(directory, file.name));
  }
}
