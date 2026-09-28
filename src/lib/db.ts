import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function sqliteFileUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) return raw;
  const filePath = raw.slice("file:".length);
  if (!filePath || filePath === ":memory:") return raw;
  if (path.isAbsolute(filePath)) return `file:${filePath}`;
  return `file:${path.join(process.cwd(), filePath)}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: sqliteFileUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
