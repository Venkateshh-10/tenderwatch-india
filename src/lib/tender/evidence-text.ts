import { uniqueStrings } from "@/lib/tender/text";

export function clusterEvidenceText(
  items: Array<{ title: string; snippet?: string | null; pageText?: string | null; fromPage: boolean }>,
): { text: string; verified: boolean } {
  const verified = items.filter((item) => item.fromPage && item.pageText && item.pageText.trim().length > 0);
  if (verified.length > 0) {
    return {
      verified: true,
      text: uniqueStrings(verified.map((item) => item.pageText)).join("\n"),
    };
  }
  return {
    verified: false,
    text: uniqueStrings(items.flatMap((item) => [item.pageText, item.snippet, item.title])).join("\n"),
  };
}
