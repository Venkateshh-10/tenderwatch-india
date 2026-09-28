import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h1 className="text-lg font-semibold">Notice not found</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">That record is not in the local database.</p>
      <Link href="/" className="mt-3 inline-block text-[13px] text-[#3182F6] hover:underline">
        Return to the desk
      </Link>
    </div>
  );
}
