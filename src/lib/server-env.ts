import fs from "node:fs";
import path from "node:path";

let rootCache: string | null = null;
let envLoaded = false;
const fileEnv: Record<string, string> = {};

function isProjectRoot(dir: string): boolean {
  const pkgPath = path.join(/*turbopackIgnore: true*/ dir, "package.json");
  const schema = path.join(/*turbopackIgnore: true*/ dir, "prisma", "schema.prisma");
  if (!fs.existsSync(/*turbopackIgnore: true*/ pkgPath) || !fs.existsSync(/*turbopackIgnore: true*/ schema)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ pkgPath, "utf8")) as { name?: string };
    return pkg.name === "tenderwatch-india";
  } catch {
    return false;
  }
}

export function projectRoot(): string {
  if (rootCache) return rootCache;
  const starts = [process.cwd()];
  try {
    starts.push(path.dirname(new URL(import.meta.url).pathname));
  } catch {
    // import.meta.url is unavailable in this runtime
  }
  for (const start of starts) {
    let dir = path.resolve(/*turbopackIgnore: true*/ start);
    for (let i = 0; i < 12; i += 1) {
      if (isProjectRoot(dir)) {
        rootCache = dir;
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  rootCache = path.resolve(/*turbopackIgnore: true*/ process.cwd());
  return rootCache;
}

function parseEnvFile(text: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

export function loadProjectEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const root = projectRoot();
  for (const name of [".env", ".env.local"]) {
    const file = path.join(/*turbopackIgnore: true*/ root, name);
    if (!fs.existsSync(/*turbopackIgnore: true*/ file)) continue;
    const parsed = parseEnvFile(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith("NEXT_PUBLIC_")) continue;
      fileEnv[key] = value;
      if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
    }
  }
}

/** Server env only. NEXT_PUBLIC_* values are ignored, including a public SerpApi key. */
export function serverEnv(name: string): string {
  if (name.startsWith("NEXT_PUBLIC_")) return "";
  loadProjectEnv();
  const dynamic = process.env[name];
  const fromProcess = typeof dynamic === "string" ? dynamic.trim() : "";
  if (fromProcess) return fromProcess;
  return (fileEnv[name] ?? "").trim();
}

export function resolvedSqlitePath(): string {
  loadProjectEnv();
  const raw = serverEnv("DATABASE_URL") || "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) return path.resolve(/*turbopackIgnore: true*/ projectRoot(), raw);
  const filePath = raw.slice("file:".length);
  if (!filePath || filePath === ":memory:") return filePath;
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(/*turbopackIgnore: true*/ projectRoot(), filePath);
}

export function sqliteFileUrl(): string {
  const filePath = resolvedSqlitePath();
  if (!filePath || filePath === ":memory:") return "file::memory:";
  return `file:${filePath}`;
}
