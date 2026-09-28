import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { sqliteFileUrl } from "@/lib/server-env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string };

function getClient(): PrismaClient {
  const url = sqliteFileUrl();
  if (globalForPrisma.prisma && globalForPrisma.prismaUrl === url) return globalForPrisma.prisma;
  const adapter = new PrismaBetterSqlite3({ url });
  const client = new PrismaClient({ adapter });
  globalForPrisma.prisma = client;
  globalForPrisma.prismaUrl = url;
  return client;
}

export const prisma = getClient();

export function databaseFilePath(): string {
  const url = sqliteFileUrl();
  return url.startsWith("file:") ? url.slice("file:".length) : url;
}
