"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function setWatchAction(tenderId: string, watched: boolean): Promise<{ ok: boolean }> {
  if (watched) {
    await prisma.watchlistItem.upsert({
      where: { tenderId },
      create: { tenderId, lastCheckedAt: new Date() },
      update: {},
    });
  } else {
    await prisma.watchlistItem.deleteMany({ where: { tenderId } });
  }
  revalidatePath("/watchlist");
  revalidatePath(`/tenders/${tenderId}`);
  return { ok: true };
}
