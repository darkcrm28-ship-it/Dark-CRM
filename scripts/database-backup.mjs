import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, lstat, writeFile, open } from "node:fs/promises";
import { join, resolve } from "node:path";

const archiveName = "dark-crm.dump";
const manifestName = "manifest.json";
const loopback = new Set(["127.0.0.1", "::1"]);

function database(variable) {
  let url;
  try {
    url = new URL(process.env[variable] || "");
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.username || !url.hostname ||
        url.hash || [...url.searchParams.keys()].some((key) => key !== "sslmode")) throw new Error();
    const name = decodeURIComponent(url.pathname.slice(1));
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    if (!name || name.includes("/") || name.includes("\0") || user.includes("\0") || password.includes("\0")) throw new Error();
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const local = loopback.has(host);
    const sslmode = url.searchParams.get("sslmode") || (local ? "disable" : "require");
    if (!["disable", "require", "verify-ca", "verify-full"].includes(sslmode) || (!local && sslmode === "disable")) throw new Error();
    return { host, port: url.port || "5432", name, user, password, sslmode };
  } catch {
    throw new Error(`Set ${variable} to an explicit PostgreSQL URL. Only the sslmode query parameter is supported.`);
  }
}

function run(tool, args, target) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^PG/i.test(key) && !/(DATABASE_URL|DIRECT_URL|_BACKUP_URL|_RESTORE_URL)$/i.test(key)
  ));
  if (target) Object.assign(env, {
    PGHOST: target.host,
    PGPORT: target.port,
    PGDATABASE: target.name,
    PGUSER: target.user,
    PGPASSWORD: target.password,
    PGSSLMODE: target.sslmode,
    PGCONNECT_TIMEOUT: "10",
  });
  const result = spawnSync(tool, args, {
    env, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error?.code === "ENOENT") throw new Error(`Install the PostgreSQL client tools and put ${tool} on PATH.`);
  if (result.error || result.status !== 0) {
    // Client errors may contain connection information or row data.
    throw new Error(`${tool} failed. Check client version, connectivity, permissions, and the archive (exit ${result.status ?? "unknown"}).`);
  }
  return result.stdout;
}

async function checksum(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function checkBundle(folder) {
  const file = join(folder, archiveName);
  const manifest = JSON.parse(await readFile(join(folder, manifestName), "utf8"));
  const stat = await lstat(file);
  if (!stat.isFile() || manifest.format !== 1 || manifest.archive !== archiveName ||
      manifest.bytes !== stat.size || stat.size === 0 ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256) || await checksum(file) !== manifest.sha256) {
    throw new Error("The backup archive does not match its manifest.");
  }
  run("pg_restore", ["--list", file]);
  return file;
}

async function backup(folder) {
  const target = database("DARK_CRM_BACKUP_URL");
  await mkdir(folder, { mode: 0o700 });
  const file = join(folder, archiveName);
  const handle = await open(file, "wx", 0o600);
  await handle.close();
  run("pg_dump", ["--format=custom", "--no-password", "--lock-wait-timeout=10s", "--file", file], target);
  run("pg_restore", ["--list", file]);
  const { size } = await lstat(file);
  if (size === 0) throw new Error("The backup archive is empty.");
  await writeFile(join(folder, manifestName), JSON.stringify({
    format: 1, archive: archiveName, bytes: size,
    createdAt: new Date().toISOString(), sha256: await checksum(file),
  }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log("PostgreSQL archive and SHA-256 manifest created. A restore rehearsal is required.");
}

async function restore(folder, confirmation) {
  const target = database("DARK_CRM_RESTORE_URL");
  if (!loopback.has(target.host) || !/^dark_crm_restore_[a-z0-9_]+$/.test(target.name) || confirmation !== target.name) {
    throw new Error("Restore requires a local disposable database named dark_crm_restore_* and the exact name as confirmation.");
  }
  const file = await checkBundle(folder);
  const result = run("psql", ["-XAtw", "-v", "ON_ERROR_STOP=1", "-c", `
    SELECT CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_namespace WHERE nspname NOT IN ('public', 'information_schema') AND nspname !~ '^pg_'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace
    ) THEN 'empty' ELSE 'occupied' END
  `], target);
  if (result.trim() !== "empty") throw new Error("The restore database is not empty.");
  run("pg_restore", [
    "--dbname", target.name, "--no-password", "--single-transaction", "--exit-on-error",
    "--no-owner", "--no-privileges", file,
  ], target);
  console.log("Archive restored to the confirmed local database.");
}

try {
  const [action, directory, confirmation, ...extra] = process.argv.slice(2);
  if (!directory || extra.length || !["backup", "verify", "restore"].includes(action) ||
      (action === "restore" ? !confirmation : confirmation !== undefined)) {
    throw new Error("Usage: node scripts/database-backup.mjs <backup|verify|restore> <directory> [restore-database-name]");
  }
  const folder = resolve(directory);
  if (action === "backup") await backup(folder);
  else if (action === "restore") await restore(folder, confirmation);
  else {
    await checkBundle(folder);
    console.log("Archive checksum and contents list verified.");
  }
} catch (error) {
  if (error.code) console.error(`Backup operation failed (${error.code}).`);
  else if (error instanceof SyntaxError) console.error("The backup manifest is invalid.");
  else console.error(error.message);
  process.exitCode = 1;
}
