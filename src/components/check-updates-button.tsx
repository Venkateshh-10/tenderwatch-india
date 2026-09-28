"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CheckUpdatesButton({ tenderId }: { tenderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function check() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/tenders/${tenderId}/refresh`, { method: "POST" });
      const body = (await response.json()) as { message?: string };
      setMessage(body.message ?? "Check finished.");
      router.refresh();
    } catch {
      setMessage("Live search unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" onClick={check} disabled={pending}>
        {pending ? "Checking…" : "Check for updates"}
      </Button>
      {message ? <p className="text-xs text-[#5c564c]">{message}</p> : null}
    </div>
  );
}
