import { authorityRank, type AuthorityTier } from "@/lib/tender/authority";
import { jaccard, normalizeRef, normalizeTitle, normalizeUrl, titleTokens, uniqueStrings } from "@/lib/tender/text";

export type DedupeInput = {
  title: string;
  tenderReference: string | null;
  buyer: string | null;
  primarySourceUrl: string;
  primarySourceDomain: string;
  closingDate: Date | null;
  authority: AuthorityTier;
};

export function sameDay(left: Date | null, right: Date | null): boolean {
  if (!left || !right) return false;
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

export function shouldMerge(left: DedupeInput, right: DedupeInput): boolean {
  if (left.tenderReference && right.tenderReference && normalizeRef(left.tenderReference) === normalizeRef(right.tenderReference)) {
    return true;
  }
  if (normalizeUrl(left.primarySourceUrl) === normalizeUrl(right.primarySourceUrl)) return true;
  const similarity = jaccard(titleTokens(left.title), titleTokens(right.title));
  if (similarity >= 0.82 && (left.primarySourceDomain === right.primarySourceDomain || (left.buyer && left.buyer === right.buyer))) {
    return true;
  }
  if (similarity >= 0.9 && sameDay(left.closingDate, right.closingDate)) return true;
  return false;
}

export function dedupeKeyFor(input: DedupeInput): string {
  if (input.tenderReference && normalizeRef(input.tenderReference).length >= 5) {
    return `ref:${normalizeRef(input.tenderReference)}`;
  }
  return `url:${normalizeUrl(input.primarySourceUrl)}`;
}

export function betterAuthority(left: string, right: string): boolean {
  return authorityRank(left) < authorityRank(right);
}

export function clusterItems<T extends DedupeInput>(items: T[]): T[][] {
  const clusters: T[][] = [];
  for (const item of items) {
    const cluster = clusters.find((group) => group.some((other) => shouldMerge(item, other)));
    if (cluster) cluster.push(item);
    else clusters.push([item]);
  }
  return clusters;
}

export function representativeTitle(titles: string[]): string {
  return uniqueStrings(titles).sort((a, b) => normalizeTitle(b).length - normalizeTitle(a).length)[0] ?? "Untitled notice";
}
