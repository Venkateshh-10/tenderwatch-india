"use server";

import { prisma } from "@/lib/db";
import { snapshotStoredTender } from "@/lib/tender/record-snapshot";
import { revalidatePath } from "next/cache";

export async function setWatchAction(tenderId: string, watched: boolean): Promise<{ ok: boolean }> {
  if (watched) {
    const tender = await prisma.tender.findUnique({ where: { id: tenderId }, select: { dataMode: true } });
    if (!tender || tender.dataMode !== "live") return { ok: false };
    await prisma.watchlistItem.upsert({
      where: { tenderId },
      create: { tenderId, lastCheckedAt: new Date() },
      update: {},
    });
    await snapshotStoredTender(tenderId);
  } else {
    await prisma.watchlistItem.deleteMany({ where: { tenderId } });
  }
  revalidatePath("/watchlist");
  revalidatePath(`/tenders/${tenderId}`);
  return { ok: true };
}
