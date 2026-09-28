export function SectionHeading({
  n,
  title,
  action,
}: {
  n: number;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded bg-[#8B5CF6]/20 text-[10px] font-semibold text-[#8B5CF6]">
          {n}
        </span>
        <h2 className="truncate text-[15px] font-semibold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}
