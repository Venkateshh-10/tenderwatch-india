import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-[#e4dccb] bg-white p-6">
      <h1 className="font-serif text-2xl">Notice not found</h1>
      <p className="mt-2 text-sm text-[#5c564c]">That record is not in the local database.</p>
      <Link href="/discover" className="mt-4 inline-block text-sm underline">
        Return to Discover
      </Link>
    </div>
  );
}
