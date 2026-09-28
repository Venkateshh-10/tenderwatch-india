import { prisma } from "@/lib/db";
import { diffPayloads, payloadHash, type ObservedChange, type SnapshotPayload } from "@/lib/tender/snapshot";

export async function recordSnapshot(tenderId: string, payload: SnapshotPayload): Promise<ObservedChange[]> {
  const hash = payloadHash(payload);
  const json = JSON.stringify(payload);
  const previous = await prisma.tenderSnapshot.findFirst({
    where: { tenderId },
    orderBy: { capturedAt: "desc" },
  });
  if (previous?.sourceHash === hash) return [];

  await prisma.tenderSnapshot.create({
    data: { tenderId, normalizedPayload: json, sourceHash: hash },
  });
  if (!previous) return [];

  let previousPayload: SnapshotPayload;
  try {
    previousPayload = JSON.parse(previous.normalizedPayload) as SnapshotPayload;
  } catch {
    return [];
  }
  const changes = diffPayloads(previousPayload, payload);
  if (changes.length > 0) {
    await prisma.tenderChange.createMany({
      data: changes.map((change) => ({ tenderId, ...change })),
    });
  }
  return changes;
}
