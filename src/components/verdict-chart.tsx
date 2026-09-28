"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function VerdictChart({
  bid,
  review,
  skip,
  changed,
}: {
  bid: number;
  review: number;
  skip: number;
  changed: number;
}) {
  const data = [
    { name: "BID", count: bid },
    { name: "REVIEW", count: review },
    { name: "SKIP", count: skip },
    { name: "CHANGED", count: changed },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#efe8da" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#5c564c" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5c564c" }} width={28} />
          <Tooltip />
          <Bar dataKey="count" fill="#16302b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
