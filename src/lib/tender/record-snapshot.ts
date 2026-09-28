import { prisma } from "@/lib/db";
import { istDateKey } from "@/lib/tender/dates";
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

export async function snapshotStoredTender(tenderId: string): Promise<void> {
  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    include: { sources: { include: { source: true } } },
  });
  if (!tender || tender.dataMode !== "live") return;
  let certifications: string[] = [];
  try {
    const parsed = JSON.parse(tender.certificationsRequiredJson) as unknown;
    certifications = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    certifications = [];
  }
  const payload: SnapshotPayload = {
    title: tender.title,
    tenderReference: tender.tenderReference,
    buyer: tender.buyer,
    closingDate: tender.closingDate ? istDateKey(tender.closingDate) : null,
    estimatedValueInr: tender.estimatedValueInr,
    emdInr: tender.emdInr,
    turnoverRequirementInr: tender.turnoverRequirementInr,
    experienceRequirementYears: tender.experienceRequirementYears,
    certificationsRequired: certifications,
    status: tender.status,
    primarySourceUrl: tender.primarySourceUrl,
    state: tender.state,
    sources: tender.sources.map((link) => ({
      url: link.source.url,
      domain: link.source.domain,
      authority: link.source.authorityTier,
    })),
    evidenceText: tender.evidenceCorpus.slice(0, 4000),
  };
  await recordSnapshot(tender.id, payload);
}
