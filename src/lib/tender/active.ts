import { isPastDeadline } from "@/lib/tender/dates";

export function isVerifiedClosedTender(input: {
  status: string | null;
  closingDate: Date | null;
  verified: boolean;
  now?: Date;
}): boolean {
  if (input.status === "Closed") return true;
  return Boolean(input.verified && input.closingDate && isPastDeadline(input.closingDate, input.now ?? new Date()));
}
