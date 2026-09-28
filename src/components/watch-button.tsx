"use client";

import { useState } from "react";
import { setWatchAction } from "@/lib/watch/actions";
import { Button } from "@/components/ui/button";

export function WatchButton({ tenderId, watched }: { tenderId: string; watched: boolean }) {
  const [on, setOn] = useState(watched);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = !on;
    await setWatchAction(tenderId, next);
    setOn(next);
    setPending(false);
  }

  return (
    <Button variant="outline" onClick={toggle} disabled={pending}>
      {on ? "Watching" : "Watch"}
    </Button>
  );
}
