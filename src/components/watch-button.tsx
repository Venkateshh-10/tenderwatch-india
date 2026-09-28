"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { setWatchAction } from "@/lib/watch/actions";
import { Button } from "@/components/ui/button";

export function WatchButton({ tenderId, watched, compact = false }: { tenderId: string; watched: boolean; compact?: boolean }) {
  const [on, setOn] = useState(watched);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = !on;
    await setWatchAction(tenderId, next);
    setOn(next);
    setPending(false);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={on ? "Remove from watchlist" : "Add to watchlist"}
        className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Bookmark className={on ? "size-3.5 fill-[#3182F6] text-[#3182F6]" : "size-3.5"} />
      </button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
      {on ? "On Watchlist" : "Add to Watchlist"}
    </Button>
  );
}
