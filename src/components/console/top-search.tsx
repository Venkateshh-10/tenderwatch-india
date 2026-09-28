"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function TopSearch() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  return <SearchField key={query} initial={query} />;
}

function SearchField({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === "/" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    const query = value.trim();
    if (query) next.set("q", query);
    else next.delete("q");
    next.delete("tender");
    next.delete("row");
    const suffix = next.toString();
    router.push(suffix ? `/?${suffix}` : "/");
  }

  return (
    <form onSubmit={submit} className="relative min-w-0">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search stored opportunities"
        aria-label="Search stored opportunities"
        className="h-8 w-full rounded-md border border-border bg-elevated pr-12 pl-8 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-[#3182F6]"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border px-1 text-[10px] text-muted-foreground">
        /
      </kbd>
    </form>
  );
}
